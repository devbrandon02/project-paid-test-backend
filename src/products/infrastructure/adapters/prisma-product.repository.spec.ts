import { Test, TestingModule } from '@nestjs/testing';
import { PrismaProductRepository } from './prisma-product.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let prisma: PrismaService;

  const mockPrismaProduct = {
    id: '1',
    name: 'Product 1',
    description: 'Desc',
    price: 10000,
    stock: 5,
    imageUrl: 'http://img.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockResolvedValue([mockPrismaProduct]),
      findUnique: jest.fn().mockResolvedValue(mockPrismaProduct),
      update: jest.fn().mockResolvedValue({ ...mockPrismaProduct, stock: 4 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaProductRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaProductRepository>(PrismaProductRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should findAll products mapped to domain entities', async () => {
    const products = await repository.findAll();
    expect(products).toHaveLength(1);
    expect(products[0].id).toBe('1');
    expect(prisma.product.findMany).toHaveBeenCalled();
  });

  it('should findById mapped to domain entity', async () => {
    const product = await repository.findById('1');
    expect(product).toBeDefined();
    expect(product?.name).toBe('Product 1');
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });

  it('should decrementStock via prisma', async () => {
    await repository.decrementStock('1', 1);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { stock: { decrement: 1 } },
    });
  });
});
