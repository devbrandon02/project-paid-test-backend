import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { GetTransactionUseCase } from './application/use-cases/get-transaction.use-case';
import { HttpException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { TransactionError } from './domain/errors/transaction.error';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let createTransactionUseCase: CreateTransactionUseCase;
  let processPaymentUseCase: ProcessPaymentUseCase;
  let getTransactionUseCase: GetTransactionUseCase;

  const mockTransaction = {
    id: 'tx-1',
    status: 'PENDING',
    amount: 1000000,
    baseFee: 200000,
    deliveryFee: 500000,
    reference: 'ref-123',
    wompiId: null,
    productId: 'prod-1',
    customerId: 'cust-1',
    deliveryId: 'del-1',
  };

  const mockCreateUseCase = { execute: jest.fn() };
  const mockProcessPaymentUseCase = { execute: jest.fn() };
  const mockGetTransactionUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: mockCreateUseCase },
        { provide: ProcessPaymentUseCase, useValue: mockProcessPaymentUseCase },
        { provide: GetTransactionUseCase, useValue: mockGetTransactionUseCase },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    createTransactionUseCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
    processPaymentUseCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    getTransactionUseCase = module.get<GetTransactionUseCase>(GetTransactionUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should return transaction on success', async () => {
      mockCreateUseCase.execute.mockResolvedValueOnce(ok(mockTransaction));

      const dto = {
        productId: 'prod-1',
        customerEmail: 'test@test.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      };

      const result = await controller.createTransaction(dto);
      expect(result).toEqual(mockTransaction);
      expect(createTransactionUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException on failure', async () => {
      mockCreateUseCase.execute.mockResolvedValueOnce(
        err(new TransactionError('Product not available')),
      );

      await expect(
        controller.createTransaction({
          productId: 'invalid',
          customerEmail: 'test@test.com',
          customerFullName: 'John Doe',
          customerPhoneNumber: '3001234567',
          deliveryAddress: 'Calle 123',
          deliveryCity: 'Bogota',
          deliveryRegion: 'Cundinamarca',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('processPayment', () => {
    it('should return updated transaction on success', async () => {
      mockProcessPaymentUseCase.execute.mockResolvedValueOnce(
        ok({ ...mockTransaction, status: 'APPROVED' }),
      );

      const dto = {
        transactionId: 'tx-1',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: 12,
        expYear: 26,
        cardHolder: 'John Doe',
      };

      const result = await controller.processPayment(dto);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw HttpException on payment failure', async () => {
      mockProcessPaymentUseCase.execute.mockResolvedValueOnce(
        err(new TransactionError('Failed to tokenize card')),
      );

      await expect(
        controller.processPayment({
          transactionId: 'tx-1',
          cardNumber: '4242424242424242',
          cvc: '123',
          expMonth: 12,
          expYear: 26,
          cardHolder: 'John Doe',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction when found', async () => {
      mockGetTransactionUseCase.execute.mockResolvedValueOnce(mockTransaction);
      const result = await controller.getTransaction('tx-1');
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when not found', async () => {
      mockGetTransactionUseCase.execute.mockResolvedValueOnce(null);
      await expect(controller.getTransaction('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
