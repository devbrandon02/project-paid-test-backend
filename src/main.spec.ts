import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { bootstrap } from './main';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));
jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(() => 'helmet-middleware'),
}));
jest.mock('express-rate-limit', () => ({
  rateLimit: jest.fn(
    (options: { limit: number }) => `rate-limit-${options.limit}`,
  ),
}));

const originalEnvironment = {
  corsOrigins: process.env.CORS_ORIGINS,
  trustProxy: process.env.TRUST_PROXY,
  port: process.env.PORT,
};

const createApp = jest.mocked(NestFactory.create);
const helmetMiddleware = jest.mocked(helmet);
const rateLimiter = jest.mocked(rateLimit);

function createApplication() {
  const expressInstance = {
    set: jest.fn<(name: string, value: number | false) => void>(),
  };
  const adapter = { getInstance: jest.fn(() => expressInstance) };
  const application = {
    use: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    getHttpAdapter: jest.fn(() => adapter),
    listen: jest
      .fn<(port: number | string) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  return { application, expressInstance, adapter };
}

describe('API bootstrap security configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CORS_ORIGINS;
    delete process.env.TRUST_PROXY;
    delete process.env.PORT;
  });

  afterAll(() => {
    if (originalEnvironment.corsOrigins === undefined)
      delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalEnvironment.corsOrigins;
    if (originalEnvironment.trustProxy === undefined)
      delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = originalEnvironment.trustProxy;
    if (originalEnvironment.port === undefined) delete process.env.PORT;
    else process.env.PORT = originalEnvironment.port;
  });

  it('applies local CORS defaults, security headers, cache rules and rate limits', async () => {
    const { application, expressInstance } = createApplication();
    createApp.mockResolvedValue(application as unknown as INestApplication);

    await bootstrap();

    expect(application.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    });
    expect(application.use).toHaveBeenNthCalledWith(1, 'helmet-middleware');
    expect(application.use).toHaveBeenNthCalledWith(
      2,
      '/transactions',
      expect.any(Function),
    );
    expect(application.use).toHaveBeenNthCalledWith(
      3,
      '/transactions/payment',
      'rate-limit-8',
    );
    expect(application.use).toHaveBeenNthCalledWith(4, 'rate-limit-120');
    expect(rateLimiter.mock.calls.map(([options]) => options?.limit)).toEqual([
      8, 120,
    ]);
    expect(helmetMiddleware).toHaveBeenCalledTimes(1);
    expect(expressInstance.set).toHaveBeenCalledWith('trust proxy', false);
    expect(application.listen.mock.calls).toContainEqual([3000]);
  });

  it('uses configured CORS origins, trusted proxy and port', async () => {
    process.env.CORS_ORIGINS =
      'https://store.example, https://preview.example,';
    process.env.TRUST_PROXY = '1';
    process.env.PORT = '8080';
    const { application, expressInstance } = createApplication();
    createApp.mockResolvedValue(application as unknown as INestApplication);

    await bootstrap();

    expect(application.enableCors).toHaveBeenCalledWith({
      origin: ['https://store.example', 'https://preview.example'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    });
    expect(expressInstance.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(application.listen.mock.calls).toContainEqual(['8080']);
  });
});
