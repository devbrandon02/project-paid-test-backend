import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.getProductsUseCase.execute();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.getProductByIdUseCase.execute(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
