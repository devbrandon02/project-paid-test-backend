import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios from 'axios';
import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { WompiPaymentAdapter } from './wompi-payment.adapter';
import type { ProcessPaymentData } from '../../domain/ports/payment-gateway.port';

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedAxios = jest.mocked(axios);
const paymentData: ProcessPaymentData = {
  reference: 'ref-123',
  totalAmount: 1700000,
  customerEmail: 'ana@example.com',
  card: {
    cardNumber: '4242424242424242',
    cvc: '123',
    expMonth: 3,
    expYear: 2028,
    cardHolder: 'Ana García',
  },
};

const merchantResponse = {
  data: {
    data: {
      presigned_acceptance: { acceptance_token: 'acceptance-token' },
      presigned_personal_data_auth: { acceptance_token: 'personal-token' },
    },
  },
};

const originalEnvironment = {
  api: process.env.WOMPI_API_URL,
  publicKey: process.env.WOMPI_PUBLIC_KEY,
  privateKey: process.env.WOMPI_PRIVATE_KEY,
  integrityKey: process.env.WOMPI_INTEGRITY_KEY,
};

let warnSpy: jest.SpiedFunction<typeof Logger.prototype.warn>;

function expectCalledWith(
  mock: { mock: { calls: unknown[][] } },
  ...args: unknown[]
) {
  expect(mock.mock.calls).toContainEqual(args);
}

describe('SandboxPaymentAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WOMPI_API_URL = 'https://sandbox.example.test/v1';
    process.env.WOMPI_PUBLIC_KEY = 'public-test-key';
    process.env.WOMPI_PRIVATE_KEY = 'private-test-key';
    process.env.WOMPI_INTEGRITY_KEY = 'integrity-test-key';
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalEnvironment.api === undefined) {
      delete process.env.WOMPI_API_URL;
    } else {
      process.env.WOMPI_API_URL = originalEnvironment.api;
    }
    if (originalEnvironment.publicKey === undefined) {
      delete process.env.WOMPI_PUBLIC_KEY;
    } else {
      process.env.WOMPI_PUBLIC_KEY = originalEnvironment.publicKey;
    }
    if (originalEnvironment.privateKey === undefined) {
      delete process.env.WOMPI_PRIVATE_KEY;
    } else {
      process.env.WOMPI_PRIVATE_KEY = originalEnvironment.privateKey;
    }
    if (originalEnvironment.integrityKey === undefined) {
      delete process.env.WOMPI_INTEGRITY_KEY;
    } else {
      process.env.WOMPI_INTEGRITY_KEY = originalEnvironment.integrityKey;
    }
  });

  it('fetches tokens, tokenizes the card, signs and submits an approved payment', async () => {
    mockedAxios.get.mockResolvedValueOnce(merchantResponse);
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          data: { id: 'card-token' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: { id: 'payment-1', status: 'APPROVED' },
        },
      });

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        wompiId: 'payment-1',
        status: 'APPROVED',
      });
    }
    expectCalledWith(
      mockedAxios.get,
      'https://sandbox.example.test/v1/merchants/public-test-key',
    );
    expect(mockedAxios.post.mock.calls[0]).toEqual([
      'https://sandbox.example.test/v1/tokens/cards',
      {
        number: '4242424242424242',
        cvc: '123',
        exp_month: '03',
        exp_year: '28',
        card_holder: 'Ana García',
      },
      { headers: { Authorization: 'Bearer public-test-key' } },
    ]);

    const request = mockedAxios.post.mock.calls[1][1] as Record<string, any>;
    const signature = createHash('sha256')
      .update('ref-1231700000COPintegrity-test-key')
      .digest('hex');
    expect(request).toMatchObject({
      acceptance_token: 'acceptance-token',
      accept_personal_auth: 'personal-token',
      amount_in_cents: 1700000,
      currency: 'COP',
      customer_email: 'ana@example.com',
      reference: 'ref-123',
      signature,
      payment_method: { type: 'CARD', token: 'card-token', installments: 1 },
    });
    expect(mockedAxios.post.mock.calls[1][2]).toEqual({
      headers: { Authorization: 'Bearer private-test-key' },
    });
  });

  it('submits a declined payment without a personal-data token', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          presigned_acceptance: { acceptance_token: 'acceptance-token' },
        },
      },
    });
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          data: { id: 'card-token' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: { id: 'payment-2', status: 'DECLINED' },
        },
      });

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('DECLINED');
    expect(mockedAxios.post.mock.calls[1][1]).not.toHaveProperty(
      'accept_personal_auth',
    );
  });

  it('returns a domain error if merchant acceptance data is unavailable', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: {} } });

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Failed to fetch merchant acceptance token',
      );
    }
    expect(mockedAxios.post.mock.calls).toHaveLength(0);
  });

  it('returns a domain error if the merchant request fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Failed to fetch merchant acceptance token',
      );
    }
  });

  it('returns a domain error if card tokenization fails', async () => {
    mockedAxios.get.mockResolvedValueOnce(merchantResponse);
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: {} },
    });

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Failed to tokenize card');
    }
    expect(mockedAxios.post.mock.calls).toHaveLength(1);
  });

  it('returns a domain error if the payment request fails', async () => {
    mockedAxios.get.mockResolvedValueOnce(merchantResponse);
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { data: { id: 'card-token' } },
      })
      .mockRejectedValueOnce(new Error('network error'));

    const result = await new WompiPaymentAdapter().processPayment(paymentData);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Failed to process payment with Wompi');
    }
  });

  it('polls a pending payment until it is approved', async () => {
    jest.useFakeTimers();
    mockedAxios.get
      .mockResolvedValueOnce(merchantResponse)
      .mockResolvedValueOnce({
        data: { data: { status: 'APPROVED' } },
      });
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { data: { id: 'card-token' } },
      })
      .mockResolvedValueOnce({
        data: { data: { id: 'payment-3', status: 'PENDING' } },
      });

    const payment = new WompiPaymentAdapter().processPayment(paymentData);
    await jest.runAllTimersAsync();
    const result = await payment;

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('APPROVED');
    expect(mockedAxios.get.mock.calls).toHaveLength(2);
  });

  it('keeps the pending status after three unsuccessful polling attempts', async () => {
    jest.useFakeTimers();
    mockedAxios.get
      .mockResolvedValueOnce(merchantResponse)
      .mockRejectedValueOnce(new Error('poll-1'))
      .mockResolvedValueOnce({ data: { data: {} } })
      .mockResolvedValueOnce({
        data: { data: { status: 'PENDING' } },
      });
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { data: { id: 'card-token' } },
      })
      .mockResolvedValueOnce({
        data: { data: { id: 'payment-4', status: 'PENDING' } },
      });

    const payment = new WompiPaymentAdapter().processPayment(paymentData);
    await jest.runAllTimersAsync();
    const result = await payment;

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('PENDING');
    expect(mockedAxios.get.mock.calls).toHaveLength(4);
    expectCalledWith(warnSpy, 'Poll failed on attempt 1');
  });
});
