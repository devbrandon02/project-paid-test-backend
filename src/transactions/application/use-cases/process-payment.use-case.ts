import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'neverthrow';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionError } from '../../domain/errors/transaction.error';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepositoryPort,
} from '../../domain/ports/transaction.repository.port';
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from '../../domain/ports/payment-gateway.port';
import { ProcessPaymentDto } from '../../../transactions/dto/create-transaction.dto';

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(dto: ProcessPaymentDto): Promise<Result<Transaction, TransactionError>> {
    const transaction = await this.transactionRepository.findById(dto.transactionId);

    if (!transaction || !transaction.isPending()) {
      return err(new TransactionError('Invalid transaction'));
    }

    const paymentResult = await this.paymentGateway.processPayment({
      reference: transaction.reference,
      totalAmount: transaction.totalAmount,
      customerEmail: transaction.customer.email,
      card: {
        cardNumber: dto.cardNumber,
        cvc: dto.cvc,
        expMonth: dto.expMonth,
        expYear: dto.expYear,
        cardHolder: dto.cardHolder,
      },
    });

    if (paymentResult.isErr()) {
      await this.transactionRepository.updateStatus(transaction.id, 'ERROR');
      return err(paymentResult.error);
    }

    const { wompiId, status: wompiStatus } = paymentResult.value;

    const finalStatus =
      wompiStatus === 'APPROVED' ? 'APPROVED' :
      wompiStatus === 'DECLINED' ? 'DECLINED' :
      'PENDING';

    const updated = await this.transactionRepository.updateStatusAndWompiId(
      transaction.id,
      finalStatus,
      wompiId,
    );

    return ok(updated);
  }
}
