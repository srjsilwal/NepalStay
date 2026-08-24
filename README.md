# NepalStay

NepalStay is a full-stack hotel booking platform for Nepal, built with Next.js, Prisma, PostgreSQL, and a Kubernetes-first delivery pipeline.

It is designed with two audiences in mind:

- Developers: a modern app-router codebase with auth, bookings, rooms, reviews, complaints, payments, and Prisma-backed data access.
- DevOps: containerized delivery, Helm packaging, Argo CD GitOps, and GitHub Actions for CI, Docker image publishing, and security scanning.

## What The App Does

- Public hotel search and hotel detail pages
- Customer bookings, wishlist, complaints, and profile management
- Vendor dashboard for hotel, room, invoice, analytics, and review workflows
- Staff operations for room management and PMS-style workflows
- Admin workflows for hotels, users, bookings, refunds, reviews, and FNMIS-related tasks
- Payment support for Khalti, Stripe, and cash
- Image uploads through UploadThing
- Compliance-oriented booking data for foreign guest tracking

## Tech Stack

- Frontend: Next.js 16, React 18, TypeScript, Tailwind CSS
- State/data: TanStack React Query
- Forms and validation: React Hook Form, Zod
- Auth: NextAuth.js
- Database: PostgreSQL with Prisma
- Payments: Khalti and Stripe
- Maps: Leaflet and react-leaflet
- File uploads: UploadThing
- Observability: Sentry dependency present in the app

## Repository Layout

- `app/` - Next.js App Router pages and API routes
- `components/` - Shared UI components
- `lib/` - App helpers and utilities
- `prisma/` - Prisma schema and seed data
- `helm/nepalstay/` - Helm chart for Kubernetes deployment
- `argocd/nepalstay.yml` - Argo CD Application manifest
- `.github/workflows/` - CI, Docker, and security automation
- `docs/` - Supporting documentation

## Development Setup

### Prerequisites

- Node.js 22+ recommended
- npm
- PostgreSQL

### Install

```bash
npm install
```

`postinstall` automatically runs `prisma generate`, so Prisma Client is ready after dependencies install.

### Environment Variables

Create a `.env.local` file and provide the values your local setup needs:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
UPLOADTHING_TOKEN=your-uploadthing-token
KHALTI_SECRET_KEY=your-khalti-secret
STRIPE_SECRET_KEY=your-stripe-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
GROQ_API_KEY=your-groq-api-key
```

### Database

```bash
npm run db:push
npm run db:seed
```

Use `db:push` for schema syncing during local development and `db:seed` for demo records.

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev           # Start the Next.js dev server
npm run build         # Build for production
npm run start         # Start the production server
npm run lint         # Run ESLint
npm run typecheck     # TypeScript check without emitting files
npm run test          # Run Jest
npm run test:watch    # Run Jest in watch mode
npm run test:coverage # Run Jest coverage
npm run db:push       # Push Prisma schema changes
npm run db:migrate    # Create and apply a Prisma migration
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed demo data
```

## Development View

This repo is organized around the App Router, with separate areas for:

- Public browsing and hotel discovery
- Customer booking and post-booking actions
- Vendor hotel management
- Staff room operations
- Admin oversight and reporting
- API routes under `app/api/`

Useful routes and capabilities include:

- `app/hotels` for listing and hotel detail flows
- `app/customer` for guest-facing workflows
- `app/vendor` for hotel owner workflows
- `app/staff` for on-site operational workflows
- `app/admin` for platform administration
- `app/api/health` and `app/api/ready` for service checks

The Prisma schema includes core entities such as users, hotels, rooms, bookings, reviews, complaints, wishlist items, and room status logs.

## DevOps View

### Docker and Image Delivery

- The image is built through `.github/workflows/docker.yml`
- The workflow tags the image and updates `helm/nepalstay/values.yaml`
- The image is intended for Amazon ECR

### Kubernetes Packaging

- The app is packaged as a Helm chart in `helm/nepalstay/`
- Chart defaults include:
  - Deployment on port `3000`
  - `ClusterIP` service
  - ALB ingress
  - External Secrets integration
  - Readiness and liveness probes
  - Resource requests and limits

### GitOps

- `argocd/nepalstay.yml` defines the Argo CD Application
- The application points at `helm/nepalstay`
- Sync is automated with `prune` and `selfHeal`
- Namespace creation is enabled through `CreateNamespace=true`

### GitHub Actions

- `ci.yml`
  - Lints, type checks, tests, and builds the application
- `docker.yml`
  - Builds and pushes the container image
  - Updates the Helm values image tag on main
- `security.yml`
  - Runs Trivy, Gitleaks, SBOM generation, and CodeQL

## Deployment Flow

1. Push code to `main` or `develop`
2. CI validates the app with lint, tests, typecheck, and build
3. Docker workflow builds and pushes the image
4. Helm values are updated with the new image tag
5. Argo CD syncs the cluster state from the Git repository

## Kubernetes Notes

The Helm chart expects:

- A PostgreSQL database reachable from the app
- Secret data for app runtime configuration
- External Secrets support for `nepalstay-secrets`
- An ALB ingress controller if you want the ingress resources to become public

If you want a quick explanation of the chart structure, see `docs/kubernetes-helm-explained.md`.

## Troubleshooting

- `helm lint helm/nepalstay`
  - Make sure the chart files are named `Chart.yaml` and `values.yaml`
- `argocd app get nepalstay`
  - Make sure you are logged into the Argo CD CLI with a server address
- Missing rooms, bookings, or demo data
  - Run `npm run db:seed`
- Build or Prisma errors
  - Verify `DATABASE_URL` and `DIRECT_URL`
- Login or auth issues
  - Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL`

## Security And Quality

The repository includes automated scanning for:

- Secrets
- Dependency vulnerabilities
- SBOM generation
- Static analysis with CodeQL

This is meant to catch common release and supply-chain issues before deployment.

## License

This project is part of the BSc CSIT curriculum at Tribhuvan University.

## Notes

- The repo is intended to be deployed through GitOps rather than manual Kubernetes edits.
- The current production image tag is managed through `helm/nepalstay/values.yaml`.
- The app uses role-based access patterns for customer, vendor, staff, and admin flows.
