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
      {
        name: 'Smartwatch Fitness Pro',
        description: 'Reloj inteligente con GPS, monitor de sueño, frecuencia cardiaca y resistencia al agua.',
        price: 24900000,
        stock: 34,
        imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
      },
      {
        name: 'Tablet Android 11',
        description: 'Tableta con pantalla de 11 pulgadas, rendimiento fluido y batería de larga duración.',
        price: 42900000,
        stock: 18,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      },
      {
        name: 'Lámpara LED de Escritorio',
        description: 'Luz ajustable para trabajo, lectura y estudios con diseño minimalista.',
        price: 8900000,
        stock: 72,
        imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
      },
      {
        name: 'Bocina Bluetooth Portátil',
        description: 'Sonido potente, batería de larga duración y conectividad USB-C.',
        price: 12900000,
        stock: 41,
        imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
      },
      {
        name: 'Monitor 27" 4K',
        description: 'Pantalla ultraclara para trabajo, edición y entretenimiento con colores vibrantes.',
        price: 52900000,
        stock: 9,
        imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=800&q=80',
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
