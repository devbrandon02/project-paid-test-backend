import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Product 1',
        price: 10000,
        stock: 5,
      },
    ]),
    findOne: jest.fn().mockResolvedValue({
      id: '1',
      name: 'Product 1',
      price: 10000,
      stock: 5,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all products', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should return a product by id', async () => {
    const result = await controller.findOne('1');
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
    expect(service.findOne).toHaveBeenCalledWith('1');
  });
});
