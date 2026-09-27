import { Result } from 'neverthrow';
import { TransactionError } from '../errors/transaction.error';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CardData {
  cardNumber: string;
  cvc: string;
  expMonth: number;
  expYear: number;
  cardHolder: string;
}

export interface ProcessPaymentData {
  reference: string;
  totalAmount: number;
  customerEmail: string;
  card: CardData;
}

export interface PaymentResult {
  wompiId: string;
  status: string;
}

export interface PaymentGatewayPort {
  processPayment(data: ProcessPaymentData): Promise<Result<PaymentResult, TransactionError>>;
}
