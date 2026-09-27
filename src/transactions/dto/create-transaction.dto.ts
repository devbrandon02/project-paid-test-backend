import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  productId!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  customerEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerFullName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s()-]{7,20}$/)
  customerPhoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  deliveryAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryCity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryRegion!: string;
}

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  transactionId!: string;

  @IsString()
  @Matches(/^\d{13,19}$/)
  cardNumber!: string;

  @IsString()
  @Matches(/^\d{3,4}$/)
  cvc!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expMonth!: number;

  @IsInt()
  @Min(0)
  @Max(99)
  expYear!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cardHolder!: string;
}
