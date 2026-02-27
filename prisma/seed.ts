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
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Cleaning',
    slug: 'cleaning',
    description: 'Home and commercial cleaning services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Pet Care',
    slug: 'pet-care',
    description: 'Pet sitting, grooming, walking, and care services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Home Repairs',
    slug: 'home-repairs',
    description: 'Maintenance, renovation, and repair services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Delivery & Assistance',
    slug: 'delivery-assistance',
    description: 'Delivery, errands, and personal assistance services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: 12,
  },
  {
    title: 'Other',
    slug: 'other',
    description: 'Other services that do not fit into main categories',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: 24,
  },
  {
    title: 'Home & Contractors',
    slug: 'home-contractors',
    description: 'Home improvement, construction, and contractor services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Realtors',
    slug: 'realtors',
    description: 'Real estate agents and property services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Mortgage Brokers',
    slug: 'mortgage-brokers',
    description: 'Mortgage lending and home financing services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Catering Services',
    slug: 'catering-services',
    description: 'Catering and food services for events and gatherings',
    imageUrl: null,
    bgColor: null,
    requiresVerification: true,
    gracePeriodHours: null,
  },
  {
    title: 'Tiffin Services',
    slug: 'tiffin-services',
    description: 'Home-cooked meal delivery and tiffin subscription services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Photographers',
    slug: 'photographers',
    description: 'Photography and videography services for all occasions',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Event Planners',
    slug: 'event-planners',
    description: 'Event planning, coordination, and management services',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
  },
  {
    title: 'Community',
    slug: 'community',
    description: 'Community services, local organizations, and social groups',
    imageUrl: null,
    bgColor: null,
    requiresVerification: false,
    gracePeriodHours: null,
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
