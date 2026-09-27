import { Transaction } from '../entities/transaction.entity';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface CreateTransactionData {
  reference: string;
  amount: number;
  baseFee: number;
  deliveryFee: number;
  productId: string;
}

export interface CreateCustomerData {
  email: string;
  fullName: string;
  phoneNumber: string;
}

export interface CreateDeliveryData {
  address: string;
  city: string;
  region: string;
  customerId: string;
}

export interface TransactionWithCustomer extends Transaction {
  customer: { email: string };
}

export interface TransactionRepositoryPort {
  create(
    customerData: CreateCustomerData,
    deliveryData: Omit<CreateDeliveryData, 'customerId'>,
    transactionData: CreateTransactionData,
  ): Promise<Transaction>;

  findById(id: string): Promise<TransactionWithCustomer | null>;

  findDetailById(id: string): Promise<any | null>;

  updateStatusAndWompiId(id: string, status: string, wompiId: string): Promise<Transaction>;

  updateStatus(id: string, status: string): Promise<void>;
}
