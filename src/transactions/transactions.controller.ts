import { Controller, Post, Body, Get, Param, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto, ProcessPaymentDto } from './dto/create-transaction.dto';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { GetTransactionUseCase } from './application/use-cases/get-transaction.use-case';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
  ) {}

  @Post()
  async createTransaction(@Body() dto: CreateTransactionDto) {
    const result = await this.createTransactionUseCase.execute(dto);
    if (result.isErr()) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post('payment')
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const result = await this.processPaymentUseCase.execute(dto);
    if (result.isErr()) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Get(':id')
  async getTransaction(@Param('id') id: string) {
    const tx = await this.getTransactionUseCase.execute(id);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }
}
