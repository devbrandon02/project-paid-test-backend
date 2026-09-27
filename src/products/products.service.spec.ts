import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Product 1',
          price: 10000,
          stock: 5,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: '1',
        name: 'Product 1',
        price: 10000,
        stock: 5,
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all products', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(prisma.product.findMany).toHaveBeenCalled();
  });

  it('should return a single product by id', async () => {
    const result = await service.findOne('1');
    expect(result).toBeDefined();
    expect(result?.id).toBe('1');
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
