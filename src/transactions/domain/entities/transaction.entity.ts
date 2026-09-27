export class Transaction {
  constructor(
    public readonly id: string,
    public readonly status: string,
    public readonly amount: number,
    public readonly baseFee: number,
    public readonly deliveryFee: number,
    public readonly reference: string,
    public readonly wompiId: string | null,
    public readonly productId: string,
    public readonly customerId: string,
    public readonly deliveryId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get totalAmount(): number {
    return this.amount + this.baseFee + this.deliveryFee;
  }

  isPending(): boolean {
    return this.status === 'PENDING';
  }
}
