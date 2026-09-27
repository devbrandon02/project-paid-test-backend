import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, ProcessPaymentDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(@Body() dto: CreateTransactionDto) {
    const result = await this.transactionsService.createTransaction(dto);
    if (result.isErr()) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post('payment')
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const result = await this.transactionsService.processPayment(dto);
    if (result.isErr()) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Get(':id')
  async getTransaction(@Param('id') id: string) {
    const tx = await this.transactionsService.getTransaction(id);
    if (!tx) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }
    return tx;
  }
}
