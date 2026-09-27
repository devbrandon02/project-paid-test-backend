import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  const mockTx = {
    customer: {
      create: jest.fn().mockResolvedValue({ id: 'cust-1', email: 'test@example.com' }),
    },
    delivery: {
      create: jest.fn().mockResolvedValue({ id: 'del-1', address: 'Calle 123' }),
    },
    transaction: {
      create: jest.fn().mockResolvedValue({
        id: 'tx-1',
        reference: 'ref-123',
        status: 'PENDING',
        amount: 1000000,
        baseFee: 200000,
        deliveryFee: 500000,
        productId: 'prod-1',
        customerId: 'cust-1',
        deliveryId: 'del-1',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'tx-1',
        status: 'APPROVED',
        wompiId: 'wompi-123',
      }),
    },
    product: {
      update: jest.fn().mockResolvedValue({ id: 'prod-1', stock: 4 }),
    },
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'prod-1',
        name: 'Product 1',
        price: 1000000,
        stock: 5,
      }),
      update: jest.fn().mockResolvedValue({ id: 'prod-1', stock: 4 }),
    },
    transaction: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tx-1',
        reference: 'ref-123',
        status: 'PENDING',
        amount: 1000000,
        baseFee: 200000,
        deliveryFee: 500000,
        productId: 'prod-1',
        customerId: 'cust-1',
        deliveryId: 'del-1',
        customer: { email: 'test@example.com' },
      }),
      update: jest.fn().mockResolvedValue({
        id: 'tx-1',
        status: 'APPROVED',
      }),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockTx);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildSignature', () => {
    it('should generate a valid sha256 hexadecimal hash', () => {
      const signature = service.buildSignature('ref-test', 1700000, 'COP');
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64);
    });
  });

  describe('createTransaction', () => {
    it('should return error if product is not found', async () => {
      (mockPrismaService.product.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.createTransaction({
        productId: 'invalid',
        customerEmail: 'test@example.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Product not available');
      }
    });

    it('should return error if product has 0 stock', async () => {
      (mockPrismaService.product.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'prod-1',
        stock: 0,
      });

      const result = await service.createTransaction({
        productId: 'prod-1',
        customerEmail: 'test@example.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Product not available');
      }
    });

    it('should successfully create customer, delivery and transaction', async () => {
      const result = await service.createTransaction({
        productId: 'prod-1',
        customerEmail: 'test@example.com',
        customerFullName: 'John Doe',
        customerPhoneNumber: '3001234567',
        deliveryAddress: 'Calle 123',
        deliveryCity: 'Bogota',
        deliveryRegion: 'Cundinamarca',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('tx-1');
        expect(mockTx.customer.create).toHaveBeenCalled();
        expect(mockTx.delivery.create).toHaveBeenCalled();
        expect(mockTx.transaction.create).toHaveBeenCalled();
      }
    });
  });

  describe('processPayment', () => {
    it('should return error if transaction is not found', async () => {
      (mockPrismaService.transaction.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.processPayment({
        transactionId: 'not-found',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: 12,
        expYear: 26,
        cardHolder: 'John Doe',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid transaction');
      }
    });

    it('should return error if transaction is already completed', async () => {
      (mockPrismaService.transaction.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'tx-1',
        status: 'APPROVED',
      });

      const result = await service.processPayment({
        transactionId: 'tx-1',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: 12,
        expYear: 26,
        cardHolder: 'John Doe',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid transaction');
      }
    });

    it('should process payment successfully with Wompi sandbox', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: {
            presigned_acceptance: { acceptance_token: 'acc-token-xyz' },
          },
        },
      });

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            data: { id: 'tok_card_123' },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: { id: 'wompi-tx-999', status: 'APPROVED' },
          },
        });

      const result = await service.processPayment({
        transactionId: 'tx-1',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: 12,
        expYear: 26,
        cardHolder: 'John Doe',
      });

      expect(result.isOk()).toBe(true);
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 1 } },
      });
    });
  });

  describe('getTransaction', () => {
    it('should return transaction with relations', async () => {
      const mockResult = {
        id: 'tx-1',
        status: 'APPROVED',
        product: { id: 'prod-1' },
        delivery: { id: 'del-1' },
        customer: { id: 'cust-1' },
      };
      (mockPrismaService.transaction.findUnique as jest.Mock).mockResolvedValueOnce(mockResult);

      const result = await service.getTransaction('tx-1');
      expect(result).toEqual(mockResult);
      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        include: {
          product: true,
          delivery: true,
          customer: true,
        },
      });
    });
  });
});
