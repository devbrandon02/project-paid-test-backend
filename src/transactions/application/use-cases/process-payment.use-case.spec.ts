import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import {
  TRANSACTION_REPOSITORY,
  TransactionWithCustomer,
} from '../../domain/ports/transaction.repository.port';
import { PAYMENT_GATEWAY } from '../../domain/ports/payment-gateway.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { ok, err } from 'neverthrow';
import { TransactionError } from '../../domain/errors/transaction.error';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;

  const pendingTransaction: TransactionWithCustomer = {
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
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { email: 'test@test.com' },
    totalAmount: 1700000,
    isPending: () => true,
  };

  const approvedTransaction = new Transaction(
    'tx-1',
    'APPROVED',
    1000000,
    200000,
    500000,
    'ref-123',
    'wompi-001',
    'prod-1',
    'cust-1',
    'del-1',
    new Date(),
    new Date(),
  );

  const mockTransactionRepository = {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(pendingTransaction),
    findDetailById: jest.fn(),
    updateStatusAndWompiId: jest.fn().mockResolvedValue(approvedTransaction),
    updateStatus: jest.fn(),
  };

  const mockPaymentGateway = {
    processPayment: jest
      .fn()
      .mockResolvedValue(ok({ wompiId: 'wompi-001', status: 'APPROVED' })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPaymentUseCase,
        {
          provide: TRANSACTION_REPOSITORY,
          useValue: mockTransactionRepository,
        },
        { provide: PAYMENT_GATEWAY, useValue: mockPaymentGateway },
      ],
    }).compile();

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return error when transaction is not found', async () => {
    mockTransactionRepository.findById.mockResolvedValueOnce(null);

    const result = await useCase.execute({
      transactionId: 'invalid',
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

  it('should return error when transaction is not pending', async () => {
    const nonPendingTx = { ...pendingTransaction, isPending: () => false };
    mockTransactionRepository.findById.mockResolvedValueOnce(nonPendingTx);

    const result = await useCase.execute({
      transactionId: 'tx-1',
      cardNumber: '4242424242424242',
      cvc: '123',
      expMonth: 12,
      expYear: 26,
      cardHolder: 'John Doe',
    });

    expect(result.isErr()).toBe(true);
  });

  it('should handle payment gateway failure and mark transaction as ERROR', async () => {
    mockPaymentGateway.processPayment.mockResolvedValueOnce(
      err(new TransactionError('Failed to tokenize card')),
    );

    const result = await useCase.execute({
      transactionId: 'tx-1',
      cardNumber: '0000000000000000',
      cvc: '000',
      expMonth: 1,
      expYear: 99,
      cardHolder: 'Bad Card',
    });

    expect(result.isErr()).toBe(true);
    expect(mockTransactionRepository.updateStatus).toHaveBeenCalledWith(
      'tx-1',
      'ERROR',
    );
  });

  it('should process payment successfully and return APPROVED transaction', async () => {
    const result = await useCase.execute({
      transactionId: 'tx-1',
      cardNumber: '4242424242424242',
      cvc: '123',
      expMonth: 12,
      expYear: 26,
      cardHolder: 'John Doe',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('APPROVED');
      expect(result.value.wompiId).toBe('wompi-001');
    }
  });

  it('should set status to DECLINED when payment is declined', async () => {
    mockPaymentGateway.processPayment.mockResolvedValueOnce(
      ok({ wompiId: 'wompi-002', status: 'DECLINED' }),
    );
    mockTransactionRepository.updateStatusAndWompiId.mockResolvedValueOnce(
      new Transaction(
        'tx-1',
        'DECLINED',
        1000000,
        200000,
        500000,
        'ref-123',
        'wompi-002',
        'prod-1',
        'cust-1',
        'del-1',
        new Date(),
        new Date(),
      ),
    );

    const result = await useCase.execute({
      transactionId: 'tx-1',
      cardNumber: '4242424242424242',
      cvc: '123',
      expMonth: 12,
      expYear: 26,
      cardHolder: 'John Doe',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('DECLINED');
    }
    expect(
      mockTransactionRepository.updateStatusAndWompiId,
    ).toHaveBeenCalledWith('tx-1', 'DECLINED', 'wompi-002');
  });
});
