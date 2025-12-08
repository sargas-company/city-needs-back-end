import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const clerkClientProviders = [
  {
    provide: 'ClerkClient',
    useFactory: (cs: ConfigService) =>
      createClerkClient({
        publishableKey: cs.get('CLERK_PUBLISHABLE_KEY'),
        secretKey: cs.get('CLERK_SECRET_KEY'),
      }),
    inject: [ConfigService],
  },
];
