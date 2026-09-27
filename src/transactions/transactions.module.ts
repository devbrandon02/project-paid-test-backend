import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { TRANSACTION_REPOSITORY } from './domain/ports/transaction.repository.port';
import { PAYMENT_GATEWAY } from './domain/ports/payment-gateway.port';
import { PrismaTransactionRepository } from './infrastructure/adapters/prisma-transaction.repository';
import { WompiPaymentAdapter } from './infrastructure/adapters/wompi-payment.adapter';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { GetTransactionUseCase } from './application/use-cases/get-transaction.use-case';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [TransactionsController],
  providers: [
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: WompiPaymentAdapter,
    },
    CreateTransactionUseCase,
    ProcessPaymentUseCase,
    GetTransactionUseCase,
  ],
})
export class TransactionsModule {}
