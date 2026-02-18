import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  {
    title: 'Beauty & Wellness',
    slug: 'beauty-wellness',
    description: 'Beauty, wellness, health, and self-care services',
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Cleaning',
    slug: 'cleaning',
    description: 'Home and commercial cleaning services',
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Pet Care',
    slug: 'pet-care',
    description: 'Pet sitting, grooming, walking, and care services',
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Home Repairs',
    slug: 'home-repairs',
    description: 'Maintenance, renovation, and repair services',
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Delivery & Assistance',
    slug: 'delivery-assistance',
    description: 'Delivery, errands, and personal assistance services',
    requiresVerification: true,
    gracePeriodHours: 12,
  },
  {
    title: 'Other',
    slug: 'other',
    description: 'Other services that do not fit into main categories',
    requiresVerification: true,
    gracePeriodHours: 24,
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
