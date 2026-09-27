import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import axios from 'axios';
import { Result, ok, err } from 'neverthrow';
import {
  CardData,
  PaymentGatewayPort,
  PaymentResult,
  ProcessPaymentData,
} from '../../domain/ports/payment-gateway.port';
import { TransactionError } from '../../domain/errors/transaction.error';

interface MerchantResponse {
  data?: {
    presigned_acceptance?: { acceptance_token?: string };
    presigned_personal_data_auth?: { acceptance_token?: string };
  };
}

interface CardTokenResponse {
  data?: {
    id?: string;
  };
}

interface PaymentResponse {
  data?: {
    id?: string;
    status?: string;
  };
}

@Injectable()
export class WompiPaymentAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(WompiPaymentAdapter.name);

  private readonly WOMPI_API =
    process.env.WOMPI_API_URL || 'https://api-sandbox.co.uat.wompi.dev/v1';

  private readonly pubKey = process.env.WOMPI_PUBLIC_KEY || '';
  private readonly prvKey = process.env.WOMPI_PRIVATE_KEY || '';
  private readonly integrityKey = process.env.WOMPI_INTEGRITY_KEY || '';

  private buildSignature(
    reference: string,
    amountInCents: number,
    currency = 'COP',
  ): string {
    const raw = `${reference}${amountInCents}${currency}${this.integrityKey}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private async fetchAcceptanceToken(): Promise<{
    acceptanceToken: string;
    personalAuthToken?: string;
  }> {
    const res = await axios.get<MerchantResponse>(
      `${this.WOMPI_API}/merchants/${this.pubKey}`,
    );
    const acceptanceToken =
      res.data?.data?.presigned_acceptance?.acceptance_token;
    const personalAuthToken =
      res.data?.data?.presigned_personal_data_auth?.acceptance_token;
    if (!acceptanceToken) throw new Error('No acceptance token available');
    return { acceptanceToken, personalAuthToken };
  }

  private async tokenizeCard(card: CardData): Promise<string> {
    const response = await axios.post<CardTokenResponse>(
      `${this.WOMPI_API}/tokens/cards`,
      {
        number: card.cardNumber,
        cvc: card.cvc,
        exp_month: card.expMonth.toString().padStart(2, '0'),
        exp_year: card.expYear.toString().padStart(2, '0').slice(-2),
        card_holder: card.cardHolder,
      },
      { headers: { Authorization: `Bearer ${this.pubKey}` } },
    );
    const cardToken = response.data?.data?.id;
    if (!cardToken) throw new Error('No token returned from Wompi');
    return cardToken;
  }

  private async pollTransactionStatus(
    wompiTxId: string,
    initialStatus: string,
  ): Promise<string> {
    if (initialStatus !== 'PENDING') return initialStatus;

    let status = initialStatus;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const checkRes = await axios.get<PaymentResponse>(
          `${this.WOMPI_API}/transactions/${wompiTxId}`,
        );
        status = checkRes.data?.data?.status ?? status;
        if (status !== 'PENDING') break;
      } catch {
        this.logger.warn(`Poll failed on attempt ${attempt}`);
      }
    }
    return status;
  }

  async processPayment(
    data: ProcessPaymentData,
  ): Promise<Result<PaymentResult, TransactionError>> {
    let acceptanceToken: string;
    let personalAuthToken: string | undefined;
    try {
      const tokens = await this.fetchAcceptanceToken();
      acceptanceToken = tokens.acceptanceToken;
      personalAuthToken = tokens.personalAuthToken;
    } catch {
      this.logger.error('Merchant acceptance request failed');
      return err(
        new TransactionError('Failed to fetch merchant acceptance token'),
      );
    }

    let cardToken: string;
    try {
      cardToken = await this.tokenizeCard(data.card);
    } catch {
      this.logger.error('Card tokenization request failed');
      return err(new TransactionError('Failed to tokenize card'));
    }

    const signature = this.buildSignature(data.reference, data.totalAmount);

    try {
      const txPayload: {
        acceptance_token: string;
        amount_in_cents: number;
        currency: string;
        signature: string;
        customer_email: string;
        payment_method: {
          type: string;
          token: string;
          installments: number;
        };
        reference: string;
        accept_personal_auth?: string;
      } = {
        acceptance_token: acceptanceToken,
        amount_in_cents: data.totalAmount,
        currency: 'COP',
        signature,
        customer_email: data.customerEmail,
        payment_method: {
          type: 'CARD',
          token: cardToken,
          installments: 1,
        },
        reference: data.reference,
      };

      if (personalAuthToken) {
        txPayload.accept_personal_auth = personalAuthToken;
      }

      const paymentResponse = await axios.post<PaymentResponse>(
        `${this.WOMPI_API}/transactions`,
        txPayload,
        { headers: { Authorization: `Bearer ${this.prvKey}` } },
      );

      const wompiId = paymentResponse.data?.data?.id ?? '';
      const initialStatus = paymentResponse.data?.data?.status ?? 'PENDING';

      const finalStatus = await this.pollTransactionStatus(
        wompiId,
        initialStatus,
      );

      return ok({ wompiId, status: finalStatus });
    } catch {
      this.logger.error('Payment provider request failed');
      return err(new TransactionError('Failed to process payment with Wompi'));
    }
  }
}
