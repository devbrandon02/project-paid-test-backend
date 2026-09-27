import { IsString, IsNotEmpty, IsEmail, IsNumber } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerFullName: string;

  @IsString()
  @IsNotEmpty()
  customerPhoneNumber: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsString()
  @IsNotEmpty()
  deliveryCity: string;

  @IsString()
  @IsNotEmpty()
  deliveryRegion: string;
}

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @IsString()
  @IsNotEmpty()
  cvc: string;

  @IsNumber()
  @IsNotEmpty()
  expMonth: number;

  @IsNumber()
  @IsNotEmpty()
  expYear: number;

  @IsString()
  @IsNotEmpty()
  cardHolder: string;
}
