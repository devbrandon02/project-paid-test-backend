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

  const mockRepository: Partial<TransactionRepositoryPort> = {
    findDetailById: jest.fn().mockResolvedValue(mockDetail),
  };

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
    const result = await useCase.execute('tx-1');
    expect(result).toEqual(mockDetail);
    expect(mockRepository.findDetailById).toHaveBeenCalledWith('tx-1');
  });

  it('should return null when not found', async () => {
    (mockRepository.findDetailById as jest.Mock).mockResolvedValueOnce(null);
    const result = await useCase.execute('non-existent');
    expect(result).toBeNull();
  });
});
