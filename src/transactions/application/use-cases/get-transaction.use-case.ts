import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepositoryPort,
} from '../../domain/ports/transaction.repository.port';

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  async execute(id: string): Promise<any | null> {
    return this.transactionRepository.findDetailById(id);
  }
}
