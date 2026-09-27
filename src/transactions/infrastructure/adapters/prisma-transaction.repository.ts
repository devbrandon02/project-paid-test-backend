import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCustomerData,
  CreateDeliveryData,
  CreateTransactionData,
  TransactionRepositoryPort,
  TransactionWithCustomer,
} from '../../domain/ports/transaction.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(record: any): Transaction {
    return new Transaction(
      record.id,
      record.status,
      record.amount,
      record.baseFee,
      record.deliveryFee,
      record.reference,
      record.wompiId,
      record.productId,
      record.customerId,
      record.deliveryId,
      record.createdAt,
      record.updatedAt,
    );
  }

  async create(
    customerData: CreateCustomerData,
    deliveryData: Omit<CreateDeliveryData, 'customerId'>,
    transactionData: CreateTransactionData,
  ): Promise<Transaction> {
    const record = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: customerData });

      const delivery = await tx.delivery.create({
        data: {
          ...deliveryData,
          customerId: customer.id,
        },
      });

      return tx.transaction.create({
        data: {
          ...transactionData,
          customerId: customer.id,
          deliveryId: delivery.id,
        },
      });
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<TransactionWithCustomer | null> {
    const record = await this.prisma.transaction.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!record) return null;
    return Object.assign(this.toEntity(record), {
      customer: { email: record.customer.email },
    });
  }

  async findDetailById(id: string): Promise<any | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        product: true,
        delivery: true,
        customer: true,
      },
    });
  }

  async updateStatusAndWompiId(
    id: string,
    status: string,
    wompiId: string,
  ): Promise<Transaction> {
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: { status, wompiId },
        include: { product: true },
      });

      if (status === 'APPROVED') {
        await tx.product.update({
          where: { id: updated.productId },
          data: { stock: { decrement: 1 } },
        });
      }

      return updated;
    });

    return this.toEntity(record);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: { status },
    });
  }
}
