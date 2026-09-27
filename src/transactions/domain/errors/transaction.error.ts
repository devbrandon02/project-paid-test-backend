export class TransactionError extends Error {
  constructor(
    public readonly message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}
