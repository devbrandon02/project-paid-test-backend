import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Result, ok, err } from 'neverthrow';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionError } from '../../domain/errors/transaction.error';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepositoryPort,
} from '../../domain/ports/transaction.repository.port';
import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/domain/ports/product.repository.port';
import { CreateTransactionDto } from '../../../transactions/dto/create-transaction.dto';

@Injectable()
export class CreateTransactionUseCase {
  private static readonly BASE_FEE = 200000;
  private static readonly DELIVERY_FEE = 500000;

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(dto: CreateTransactionDto): Promise<Result<Transaction, TransactionError>> {
    const product = await this.productRepository.findById(dto.productId);

    if (!product || product.stock <= 0) {
      return err(new TransactionError('Product not available'));
    }

    try {
      const transaction = await this.transactionRepository.create(
        {
          email: dto.customerEmail,
          fullName: dto.customerFullName,
          phoneNumber: dto.customerPhoneNumber,
        },
        {
          address: dto.deliveryAddress,
          city: dto.deliveryCity,
          region: dto.deliveryRegion,
        },
        {
          reference: randomUUID(),
          amount: product.price,
          baseFee: CreateTransactionUseCase.BASE_FEE,
          deliveryFee: CreateTransactionUseCase.DELIVERY_FEE,
          productId: product.id,
        },
      );

      return ok(transaction);
    } catch {
      return err(new TransactionError('Failed to create transaction'));
    }
  }
}
