import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      {
        name: 'Audífonos Premium Inalámbricos',
        description: 'Audífonos con cancelación de ruido, hasta 40h de batería y sonido de alta definición.',
        price: 29900000,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      },
      {
        name: 'Parlante Inteligente Smart',
        description: 'Parlante con asistente de voz integrado, sonido envolvente y conectividad WiFi.',
        price: 18900000,
        stock: 120,
        imageUrl: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&q=80',
      },
      {
        name: 'Cámara de Acción 4K',
        description: 'Cámara resistente al agua con grabación 4K, estabilización de imagen y Wi-Fi.',
        price: 34900000,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
