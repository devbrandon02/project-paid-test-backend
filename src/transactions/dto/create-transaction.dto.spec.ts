import { describe, expect, it } from '@jest/globals';
import { validateSync } from 'class-validator';
import {
  CreateTransactionDto,
  ProcessPaymentDto,
} from './create-transaction.dto';

describe('Checkout DTO validation', () => {
  it('accepts valid customer and delivery data', () => {
    const dto = Object.assign(new CreateTransactionDto(), {
      productId: 'product-123',
      customerEmail: 'ana@example.com',
      customerFullName: 'Ana García',
      customerPhoneNumber: '+57 (300) 123-4567',
      deliveryAddress: 'Calle 10 # 20-30',
      deliveryCity: 'Bogotá',
      deliveryRegion: 'Cundinamarca',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects malformed email, phone, and overlong delivery data', () => {
    const dto = Object.assign(new CreateTransactionDto(), {
      productId: 'product-123',
      customerEmail: 'not-an-email',
      customerFullName: 'Ana García',
      customerPhoneNumber: 'call-me',
      deliveryAddress: 'A'.repeat(251),
      deliveryCity: 'Bogotá',
      deliveryRegion: 'Cundinamarca',
    });

    const invalidProperties = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    }).map((error) => error.property);
    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'customerEmail',
        'customerPhoneNumber',
        'deliveryAddress',
      ]),
    );
  });

  it('accepts a structurally valid sandbox payment request', () => {
    const dto = Object.assign(new ProcessPaymentDto(), {
      transactionId: 'transaction-123',
      cardNumber: '4242424242424242',
      cvc: '123',
      expMonth: 12,
      expYear: 28,
      cardHolder: 'ANA GARCIA',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects invalid card number, CVC, expiry month, year, and unknown fields', () => {
    const dto = Object.assign(new ProcessPaymentDto(), {
      transactionId: 'transaction-123',
      cardNumber: '4242-4242-4242-4242',
      cvc: '1',
      expMonth: 13,
      expYear: 2028,
      cardHolder: 'ANA GARCIA',
      unexpected: 'field',
    });

    const invalidProperties = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    }).map((error) => error.property);
    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'cardNumber',
        'cvc',
        'expMonth',
        'expYear',
        'unexpected',
      ]),
    );
  });
});
