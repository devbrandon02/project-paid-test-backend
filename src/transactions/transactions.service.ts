import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, ProcessPaymentDto } from './dto/create-transaction.dto';
import { Result, ok, err } from 'neverthrow';
import { createHash, randomUUID } from 'crypto';
import axios from 'axios';

export class TransactionError extends Error {
  constructor(public message: string) {
    super(message);
  }
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  private readonly WOMPI_API =
    process.env.WOMPI_API_URL || 'https://api-sandbox.co.uat.wompi.dev/v1';

  private readonly pubKey = process.env.WOMPI_PUBLIC_KEY || '';
  private readonly prvKey = process.env.WOMPI_PRIVATE_KEY || '';
  private readonly integrityKey = process.env.WOMPI_INTEGRITY_KEY || '';

  constructor(private prisma: PrismaService) {}

  buildSignature(reference: string, amountInCents: number, currency = 'COP'): string {
    const raw = `${reference}${amountInCents}${currency}${this.integrityKey}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  async createTransaction(dto: CreateTransactionDto): Promise<Result<any, TransactionError>> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product || product.stock <= 0) {
        return err(new TransactionError('Product not available'));
      }

      const reference = randomUUID();
      const baseFee = 200000;
      const deliveryFee = 500000;

      const transaction = await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            email: dto.customerEmail,
            fullName: dto.customerFullName,
            phoneNumber: dto.customerPhoneNumber,
          },
        });

        const delivery = await tx.delivery.create({
          data: {
            address: dto.deliveryAddress,
            city: dto.deliveryCity,
            region: dto.deliveryRegion,
            customerId: customer.id,
          },
        });

        return await tx.transaction.create({
          data: {
            reference,
            amount: product.price,
            baseFee,
            deliveryFee,
            productId: product.id,
            customerId: customer.id,
            deliveryId: delivery.id,
          },
        });
      });

      return ok(transaction);
    } catch (error) {
      this.logger.error(error);
      return err(new TransactionError('Failed to create transaction'));
    }
  }

  async processPayment(dto: ProcessPaymentDto): Promise<Result<any, TransactionError>> {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: dto.transactionId },
        include: { customer: true },
      });

      if (!transaction || transaction.status !== 'PENDING') {
        return err(new TransactionError('Invalid transaction'));
      }

      const totalAmount = transaction.amount + transaction.baseFee + transaction.deliveryFee;

      let acceptanceToken: string;
      let personalAuthToken: string | undefined;
      try {
        const merchantRes = await axios.get(`${this.WOMPI_API}/merchants/${this.pubKey}`);
        acceptanceToken = merchantRes.data?.data?.presigned_acceptance?.acceptance_token;
        personalAuthToken = merchantRes.data?.data?.presigned_personal_data_auth?.acceptance_token;
        if (!acceptanceToken) throw new Error('No acceptance token available');
      } catch (error: any) {
        this.logger.error('Error fetching merchant acceptance token', error.message);
        return err(new TransactionError('Failed to fetch merchant acceptance token'));
      }

      let cardToken: string;
      try {
        const tokenResponse = await axios.post(
          `${this.WOMPI_API}/tokens/cards`,
          {
            number: dto.cardNumber,
            cvc: dto.cvc,
            exp_month: dto.expMonth.toString().padStart(2, '0'),
            exp_year: dto.expYear.toString().padStart(2, '0').slice(-2),
            card_holder: dto.cardHolder,
          },
          { headers: { Authorization: `Bearer ${this.pubKey}` } },
        );
        cardToken = tokenResponse.data?.data?.id;
        if (!cardToken) throw new Error('No token returned from Wompi');
      } catch (error: any) {
        this.logger.error('Tokenize error', error.response?.data || error.message);
        await this.updateTransactionStatus(transaction.id, 'ERROR');
        return err(new TransactionError('Failed to tokenize card'));
      }

      const signature = this.buildSignature(transaction.reference, totalAmount);

      let wompiTxId: string;
      let wompiStatus: string;
      try {
        const txPayload: any = {
          acceptance_token: acceptanceToken,
          amount_in_cents: totalAmount,
          currency: 'COP',
          signature,
          customer_email: transaction.customer.email,
          payment_method: {
            type: 'CARD',
            token: cardToken,
            installments: 1,
          },
          reference: transaction.reference,
        };

        if (personalAuthToken) {
          txPayload.accept_personal_auth = personalAuthToken;
        }

        const paymentResponse = await axios.post(
          `${this.WOMPI_API}/transactions`,
          txPayload,
          { headers: { Authorization: `Bearer ${this.prvKey}` } },
        );
        wompiTxId = paymentResponse.data?.data?.id;
        wompiStatus = paymentResponse.data?.data?.status;

        if (wompiStatus === 'PENDING') {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
              const checkRes = await axios.get(`${this.WOMPI_API}/transactions/${wompiTxId}`);
              wompiStatus = checkRes.data?.data?.status || wompiStatus;
              if (wompiStatus !== 'PENDING') break;
            } catch (pollErr: any) {
              this.logger.warn(`Poll error on attempt ${attempt}: ${pollErr.message}`);
            }
          }
        }
      } catch (error: any) {
        this.logger.error('Payment error', error.response?.data || error.message);
        await this.updateTransactionStatus(transaction.id, 'ERROR');
        return err(new TransactionError('Failed to process payment with Wompi'));
      }

      const status =
        wompiStatus === 'APPROVED' ? 'APPROVED' :
        wompiStatus === 'DECLINED' ? 'DECLINED' :
        'PENDING';

      const updatedTx = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.transaction.update({
          where: { id: transaction.id },
          data: { status, wompiId: wompiTxId },
        });

        if (status === 'APPROVED') {
          await tx.product.update({
            where: { id: transaction.productId },
            data: { stock: { decrement: 1 } },
          });
        }
        return updated;
      });

      return ok(updatedTx);
    } catch (error) {
      this.logger.error(error);
      return err(new TransactionError('Failed to process payment'));
    }
  }

  private async updateTransactionStatus(id: string, status: string) {
    await this.prisma.transaction.update({
      where: { id },
      data: { status },
    });
  }

  async getTransaction(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        product: true,
        delivery: true,
        customer: true,
      },
    });
  }
}
