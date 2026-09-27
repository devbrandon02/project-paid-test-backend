import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionUseCase } from './get-transaction.use-case';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepositoryPort,
} from '../../domain/ports/transaction.repository.port';

describe('GetTransactionUseCase', () => {
  let useCase: GetTransactionUseCase;

  const mockDetail = {
    id: 'tx-1',
    status: 'APPROVED',
    amount: 1000000,
    baseFee: 200000,
    deliveryFee: 500000,
    reference: 'ref-123',
    product: { id: 'prod-1', name: 'Product 1' },
    customer: { email: 'test@test.com' },
    delivery: { address: 'Calle 123', city: 'Bogota', region: 'Cundinamarca' },
  };

  const findDetailById = jest.fn().mockResolvedValue(mockDetail);
  const mockRepository: Partial<TransactionRepositoryPort> = { findDetailById };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionUseCase,
        { provide: TRANSACTION_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<GetTransactionUseCase>(GetTransactionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return full transaction detail when found', async () => {
    await expect(useCase.execute('tx-1')).resolves.toEqual(mockDetail);
    expect(findDetailById).toHaveBeenCalledWith('tx-1');
  });

  it('should return null when not found', async () => {
    findDetailById.mockResolvedValueOnce(null);
    await expect(useCase.execute('non-existent')).resolves.toBeNull();
  });
});
