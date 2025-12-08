import '@clerk/backend';
import { User } from '@clerk/backend';

import { User as DbUser } from '../modules/users/users.entity';

declare module 'express-serve-static-core' {
  interface Request {
    clerkUser?: User;
    dbUser: DbUser;
  }
}
