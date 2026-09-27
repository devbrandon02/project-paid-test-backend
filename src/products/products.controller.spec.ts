import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { NotFoundException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  let getProductsUseCase: GetProductsUseCase;
  let getProductByIdUseCase: GetProductByIdUseCase;

  const mockProduct = {
    id: '1',
    name: 'Product 1',
    description: 'Desc',
    price: 10000,
    stock: 5,
    imageUrl: 'http://img.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGetProductsUseCase = {
    execute: jest.fn().mockResolvedValue([mockProduct]),
  };

  const mockGetProductByIdUseCase = {
    execute: jest.fn().mockResolvedValue(mockProduct),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: GetProductsUseCase,
          useValue: mockGetProductsUseCase,
        },
        {
          provide: GetProductByIdUseCase,
          useValue: mockGetProductByIdUseCase,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    getProductsUseCase = module.get<GetProductsUseCase>(GetProductsUseCase);
    getProductByIdUseCase = module.get<GetProductByIdUseCase>(
      GetProductByIdUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all products', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(getProductsUseCase.execute).toHaveBeenCalled();
  });

  it('should return a product by id', async () => {
    const result = await controller.findOne('1');
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
    expect(getProductByIdUseCase.execute).toHaveBeenCalledWith('1');
  });

  it('should throw NotFoundException when product is not found', async () => {
    mockGetProductByIdUseCase.execute.mockResolvedValueOnce(null);
    await expect(controller.findOne('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
