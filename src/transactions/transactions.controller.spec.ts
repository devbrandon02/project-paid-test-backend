import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService, TransactionError } from './transactions.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ok, err } from 'neverthrow';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransaction = {
    id: 'tx-1',
    status: 'PENDING',
    amount: 1000000,
  };

  const mockTransactionsService = {
    createTransaction: jest.fn(),
    processPayment: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create and return transaction on success', async () => {
      mockTransactionsService.createTransaction.mockResolvedValueOnce(ok(mockTransaction));

      const dto = {
        productId: 'prod-1',
        customerEmail: 'test@example.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      };

      const result = await controller.createTransaction(dto);
      expect(result).toEqual(mockTransaction);
      expect(service.createTransaction).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException on error', async () => {
      mockTransactionsService.createTransaction.mockResolvedValueOnce(
        err(new TransactionError('Product not available')),
      );

      const dto = {
        productId: 'invalid',
        customerEmail: 'test@example.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      };

      await expect(controller.createTransaction(dto)).rejects.toThrow(HttpException);
    });
  });

  describe('processPayment', () => {
    it('should process payment and return updated transaction on success', async () => {
      mockTransactionsService.processPayment.mockResolvedValueOnce(
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
      expect(service.processPayment).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException on payment failure', async () => {
      mockTransactionsService.processPayment.mockResolvedValueOnce(
        err(new TransactionError('Failed to tokenize card')),
      );

      const dto = {
        transactionId: 'tx-1',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: 12,
        expYear: 26,
        cardHolder: 'John Doe',
      };

      await expect(controller.processPayment(dto)).rejects.toThrow(HttpException);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction when found', async () => {
      mockTransactionsService.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await controller.getTransaction('tx-1');
      expect(result).toEqual(mockTransaction);
      expect(service.getTransaction).toHaveBeenCalledWith('tx-1');
    });

    it('should throw 404 HttpException when not found', async () => {
      mockTransactionsService.getTransaction.mockResolvedValueOnce(null);

      await expect(controller.getTransaction('non-existent')).rejects.toThrow(
        new HttpException('Transaction not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
