import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepositoryPort,
} from '../../domain/ports/transaction.repository.port';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../../products/domain/ports/product.repository.port';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Product } from '../../../products/domain/entities/product.entity';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;

  const mockTransaction = new Transaction(
    'tx-1',
    'PENDING',
    1000000,
    200000,
    500000,
    'ref-123',
    null,
    'prod-1',
    'cust-1',
    'del-1',
    new Date(),
    new Date(),
  );

  const mockProduct = new Product(
    'prod-1',
    'Product 1',
    'Desc',
    1000000,
    5,
    'http://img.com',
    new Date(),
    new Date(),
  );

  const mockTransactionRepository: TransactionRepositoryPort = {
    create: jest.fn().mockResolvedValue(mockTransaction),
    findById: jest.fn(),
    findDetailById: jest.fn(),
    updateStatusAndWompiId: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockProductRepository: ProductRepositoryPort = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(mockProduct),
    decrementStock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        {
          provide: TRANSACTION_REPOSITORY,
          useValue: mockTransactionRepository,
        },
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
      ],
    }).compile();

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return error when product is not found', async () => {
    (mockProductRepository.findById as jest.Mock).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      productId: 'invalid',
      customerEmail: 'test@test.com',
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

  it('should return error when product is out of stock', async () => {
    (mockProductRepository.findById as jest.Mock).mockResolvedValueOnce(
      new Product('prod-1', 'P', 'D', 1000, 0, 'url', new Date(), new Date()),
    );

    const result = await useCase.execute({
      productId: 'prod-1',
      customerEmail: 'test@test.com',
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

  it('should create transaction successfully', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      customerEmail: 'test@test.com',
      customerFullName: 'John Doe',
      customerPhoneNumber: '3001234567',
      deliveryAddress: 'Calle 123',
      deliveryCity: 'Bogota',
      deliveryRegion: 'Cundinamarca',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.id).toBe('tx-1');
      expect(mockTransactionRepository.create).toHaveBeenCalled();
    }
  });
});
