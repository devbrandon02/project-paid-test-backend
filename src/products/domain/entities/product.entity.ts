export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number,
    public readonly imageUrl: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
