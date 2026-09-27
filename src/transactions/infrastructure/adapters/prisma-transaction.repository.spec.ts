import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../../prisma/prisma.service';
import { Transaction } from '../../domain/entities/transaction.entity';
import { PrismaTransactionRepository } from './prisma-transaction.repository';

const timestamp = new Date('2026-01-01T00:00:00.000Z');

const record = {
  id: 'tx-1',
  status: 'PENDING',
  amount: 1000000,
  baseFee: 200000,
  deliveryFee: 500000,
  reference: 'ref-1',
  wompiId: null,
  productId: 'product-1',
  customerId: 'customer-1',
  deliveryId: 'delivery-1',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const customer = { id: 'customer-1', email: 'ana@example.com' };

const expectCalledWith = (
  mock: { mock: { calls: unknown[][] } },
  ...args: unknown[]
) => expect(mock.mock.calls).toContainEqual(args);

describe('PrismaTransactionRepository', () => {
  it('creates customer, delivery, and transaction atomically', async () => {
    const tx = {
      customer: {
        create: jest
          .fn<() => Promise<{ id: string }>>()
          .mockResolvedValue({ id: 'customer-1' }),
      },
      delivery: {
        create: jest
          .fn<() => Promise<{ id: string }>>()
          .mockResolvedValue({ id: 'delivery-1' }),
      },
      transaction: {
        create: jest
          .fn<() => Promise<typeof record>>()
          .mockResolvedValue(record),
      },
    };
    const transaction = jest.fn(
      (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.create(
      {
        email: 'ana@example.com',
        fullName: 'Ana García',
        phoneNumber: '3001234567',
      },
      { address: 'Calle 10', city: 'Bogotá', region: 'Cundinamarca' },
      {
        reference: 'ref-1',
        amount: 1000000,
        baseFee: 200000,
        deliveryFee: 500000,
        productId: 'product-1',
      },
    );

    expect(transaction.mock.calls).toHaveLength(1);
    expectCalledWith(tx.customer.create, {
      data: {
        email: 'ana@example.com',
        fullName: 'Ana García',
        phoneNumber: '3001234567',
      },
    });
    expectCalledWith(tx.delivery.create, {
      data: {
        address: 'Calle 10',
        city: 'Bogotá',
        region: 'Cundinamarca',
        customerId: 'customer-1',
      },
    });
    expectCalledWith(tx.transaction.create, {
      data: {
        reference: 'ref-1',
        amount: 1000000,
        baseFee: 200000,
        deliveryFee: 500000,
        productId: 'product-1',
        customerId: 'customer-1',
        deliveryId: 'delivery-1',
      },
    });
    expect(result).toBeInstanceOf(Transaction);
    expect(result.totalAmount).toBe(1700000);
  });

  it('maps a transaction with its customer and returns null when it is missing', async () => {
    const findUnique = jest
      .fn<
        () => Promise<(typeof record & { customer: typeof customer }) | null>
      >()
      .mockResolvedValueOnce({ ...record, customer })
      .mockResolvedValueOnce(null);
    const repository = new PrismaTransactionRepository({
      transaction: { findUnique },
    } as unknown as PrismaService);

    const result = await repository.findById('tx-1');
    const missing = await repository.findById('missing');

    expect(result).toBeInstanceOf(Transaction);
    expect(result?.customer.email).toBe('ana@example.com');
    expect(result?.isPending()).toBe(true);
    expect(missing).toBeNull();
    expectCalledWith(findUnique, {
      where: { id: 'tx-1' },
      include: { customer: true },
    });
  });

  it('loads the detailed transaction relations', async () => {
    const detail = {
      ...record,
      customer,
      product: { id: 'product-1' },
      delivery: { id: 'delivery-1' },
    };
    const findUnique = jest
      .fn<() => Promise<typeof detail>>()
      .mockResolvedValue(detail);
    const repository = new PrismaTransactionRepository({
      transaction: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findDetailById('tx-1')).resolves.toEqual(detail);
    expect(findUnique.mock.calls).toContainEqual([
      {
        where: { id: 'tx-1' },
        include: { product: true, delivery: true, customer: true },
      },
    ]);
  });

  it('decrements stock only when payment is approved', async () => {
    const updatedRecord = {
      ...record,
      status: 'APPROVED',
      wompiId: 'payment-1',
    };
    const transactionUpdate = jest
      .fn<() => Promise<typeof updatedRecord>>()
      .mockResolvedValue(updatedRecord);
    const productUpdate = jest
      .fn<() => Promise<Record<string, never>>>()
      .mockResolvedValue({});
    const prisma = {
      $transaction: jest.fn((work: (client: any) => Promise<unknown>) =>
        work({
          transaction: { update: transactionUpdate },
          product: { update: productUpdate },
        }),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.updateStatusAndWompiId(
      'tx-1',
      'APPROVED',
      'payment-1',
    );

    expectCalledWith(transactionUpdate, {
      where: { id: 'tx-1' },
      data: { status: 'APPROVED', wompiId: 'payment-1' },
      include: { product: true },
    });
    expectCalledWith(productUpdate, {
      where: { id: 'product-1' },
      data: { stock: { decrement: 1 } },
    });
    expect(result.status).toBe('APPROVED');
  });

  it('does not decrement stock for a declined payment', async () => {
    const declinedRecord = {
      ...record,
      status: 'DECLINED',
      wompiId: 'payment-2',
    };
    const transactionUpdate = jest
      .fn<() => Promise<typeof declinedRecord>>()
      .mockResolvedValue(declinedRecord);
    const productUpdate = jest.fn();
    const prisma = {
      $transaction: jest.fn((work: (client: any) => Promise<unknown>) =>
        work({
          transaction: { update: transactionUpdate },
          product: { update: productUpdate },
        }),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTransactionRepository(prisma);

    await repository.updateStatusAndWompiId('tx-1', 'DECLINED', 'payment-2');

    expect(productUpdate).not.toHaveBeenCalled();
  });

  it('updates transaction status without a payment id', async () => {
    const update = jest
      .fn<() => Promise<typeof record>>()
      .mockResolvedValue(record);
    const repository = new PrismaTransactionRepository({
      transaction: { update },
    } as unknown as PrismaService);

    await repository.updateStatus('tx-1', 'ERROR');

    expectCalledWith(update, {
      where: { id: 'tx-1' },
      data: { status: 'ERROR' },
    });
  });
});
