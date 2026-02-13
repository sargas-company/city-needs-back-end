# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Initial setup (installs deps, generates Prisma client, starts Docker, runs migrations)
make init

# Start development (Docker services + watch mode)
make start

# Build
npm run build                    # Standard build
npm run limited-build            # Memory-optimized build (2GB limit)

# Testing
npm test                         # Run all tests
npm test -- --testPathPattern="status"  # Run specific test file
npm run test:watch               # Watch mode
npm run test:cov                 # With coverage
npm run test:e2e                 # End-to-end tests

# Code quality
npm run lint                     # ESLint with auto-fix
npm run format                   # Prettier formatting

# Production
npm run start:prod               # Run compiled output
```

## Architecture

NestJS 11 backend with modular domain-driven structure.

### Core Stack
- **Database**: PostgreSQL 16 via Prisma ORM (port 5437 in Docker)
- **Cache/Queue**: Redis with BullMQ for job processing
- **Auth**: Firebase Admin SDK + Clerk.com synced to PostgreSQL users
- **Storage**: AWS S3 with abstract `StorageService` pattern
- **Payments**: Stripe integration

### Project Structure
```
src/
├── main.ts              # Bootstrap, global pipes, filters, Swagger setup
├── app.module.ts        # Root module
├── common/
│   ├── decorators/      # @CurrentUser, @Public, @Roles, @SkipBusinessVerification
│   ├── guards/          # DbUserAuthGuard, BusinessVerificationGuard, RolesGuard
│   ├── http/            # GlobalHttpExceptionFilter
│   └── utils/           # successResponse(), business-time utilities
├── prisma/              # PrismaService (global DB access)
├── firebase/            # FirebaseService (token verification)
├── storage/             # S3StorageService (file uploads)
└── modules/             # Feature modules (auth, users, business, booking, etc.)
```

### Key Patterns

**Authentication Flow:**
1. Firebase token validated by `DbUserAuthGuard`
2. User loaded from PostgreSQL via `authExternalId`
3. `BusinessVerificationGuard` checks business status (skip with `@SkipBusinessVerification()`)
4. User/business context attached to `request.gate`

**Response Format:** All endpoints use `successResponse()` wrapper:
```typescript
{ code: 200, data: T, message: string, path: string, timestamp: string }
```

**Module Pattern:** Each feature module contains:
- `*.controller.ts` - HTTP handlers with guards/decorators
- `*.service.ts` - Business logic with Prisma calls
- `dto/` - Request/response DTOs with class-validator decorators

### User Roles
`END_USER`, `BUSINESS_OWNER`, `ADMIN` - controlled via `@Roles()` decorator + `RolesGuard`

### Business Status
`PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED` - affects route access via `BusinessVerificationGuard`

## Environment

Requires Node v24.4.1. Uses npm only (yarn blocked via preinstall script).

Key env vars: `DATABASE_URL`, `REDIS_HOST`, `FIREBASE_*`, `S3_*`, `STRIPE_*`

## Testing

Tests in `test/` directory with pattern `*.unit-spec.ts` and `*.e2e-spec.ts`. Uses Jest with ts-jest.
