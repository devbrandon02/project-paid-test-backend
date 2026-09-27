import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Product } from '../../domain/entities/product.entity';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';

@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return records.map(
      (r) =>
        new Product(
          r.id,
          r.name,
          r.description,
          r.price,
          r.stock,
          r.imageUrl,
          r.createdAt,
          r.updatedAt,
        ),
    );
  }

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!record) return null;
    return new Product(
      record.id,
      record.name,
      record.description,
      record.price,
      record.stock,
      record.imageUrl,
      record.createdAt,
      record.updatedAt,
    );
  }

  async decrementStock(id: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { stock: { decrement: quantity } },
    });
  }
}
