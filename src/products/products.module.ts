import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository.port';
import { PrismaProductRepository } from './infrastructure/adapters/prisma-product.repository';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    GetProductsUseCase,
    GetProductByIdUseCase,
  ],
  exports: [PRODUCT_REPOSITORY, GetProductsUseCase, GetProductByIdUseCase],
})
export class ProductsModule {}
