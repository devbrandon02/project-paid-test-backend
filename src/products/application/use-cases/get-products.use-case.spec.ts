import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsUseCase } from './get-products.use-case';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../domain/ports/product.repository.port';
import { Product } from '../../domain/entities/product.entity';

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
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
    findAll: jest.fn().mockResolvedValue([mockProduct]),
    findById: jest.fn(),
    decrementStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsUseCase,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetProductsUseCase>(GetProductsUseCase);
    repository = module.get<ProductRepositoryPort>(PRODUCT_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return product list from repository port', async () => {
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(repository.findAll).toHaveBeenCalled();
  });
});
