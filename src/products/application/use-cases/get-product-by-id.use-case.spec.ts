import { Test, TestingModule } from '@nestjs/testing';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../domain/ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';

describe('GetProductByIdUseCase', () => {
  let useCase: GetProductByIdUseCase;
  let repository: ProductRepositoryPort;

  const mockProduct = new Product(
    '1',
    'Product 1',
    'Desc',
    10000,
    5,
    'http://img.com',
    new Date(),
    new Date(),
  );

  const mockRepository: ProductRepositoryPort = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(mockProduct),
    decrementStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductByIdUseCase,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetProductByIdUseCase>(GetProductByIdUseCase);
    repository = module.get<ProductRepositoryPort>(PRODUCT_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return product by id from repository port', async () => {
    const result = await useCase.execute('1');
    expect(result).toBeDefined();
    expect(result?.id).toBe('1');
    expect(repository.findById).toHaveBeenCalledWith('1');
  });
});
