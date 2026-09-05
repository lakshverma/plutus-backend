<h1 align="center">
  Plutus Backend
  <br>
  <br>
</h1>

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Plutus is an open-source, easy-to-use CRM designed for Indian financial advisors to get real-time business insights and provide their customers a delightful experience, all in one place.

This is the backend repository. You can find the frontend for this app [here](https://github.com/lakshverma/plutus).

## Features

- **Multi-tenant Architecture**: Supports multiple financial advisors with isolated data
- **Role-based Access Control**: SuperAdmin and Tenant roles with granular permissions
- **Contact Management**: Comprehensive contact management system with advanced search
- **Real-time Insights**: Business analytics and reporting
- **Secure Authentication**: JWT-based authentication with role-based access
- **API Rate Limiting**: Tiered per-IP throttling on all endpoints with strict brute-force limits on auth routes
- **Scalable Infrastructure**: Built on Node.js/Express with PostgreSQL

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/lakshverma/plutus-backend.git
cd plutus-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Prepare the database. Against an empty PostgreSQL 16 database on any provider,
   three commands take it from nothing to a fully populated schema:
```bash
npm run db:bootstrap   # creates the two application roles (needs DATABASE_URL_BOOTSTRAP)
npm run db:migrate     # applies db/migrations: 33 tables, 26 RLS policies, audit triggers
npm run db:seed        # loads reference data and two tenants of realistic records
```
   `db:bootstrap` is the only step that uses the role the provider created the
   database with; it creates `plutus_admin` and `plutus_tenant` and prints the two
   connection strings to put in `DATABASE_URL` and `DATABASE_URL_TENANT`. Everything
   after that runs as `plutus_admin`, which owns the schema, while the application
   serves tenant requests as `plutus_tenant`, which owns nothing and cannot see past
   a row-level security policy.

   `db:seed` is idempotent and will not overwrite an org that already exists. To
   rebuild the seeded tenants from scratch, use `npm run db:seed:reset`.

5. Start the development server:
```bash
npm run dev
```

6. The API listens on the port set by `PORT` (3003 in the sample configuration).

## Database

There is no ORM. The schema lives in `db/migrations` as plain SQL and is applied by
[node-pg-migrate](https://github.com/salsita/node-pg-migrate), which records what has
run in a `pgmigrations` table. The first file is a baseline of the schema as it
stood when migration tracking was introduced; every change since is its own file,
and none of it depends on a particular hosting provider.

Two roles, both created by `db:bootstrap`, carry the tenancy model:

- `plutus_admin` runs the migrations and therefore owns every table. An owner is
  exempt from its tables' row-level security policies, which is how the super-admin
  pool sees across tenants. It cannot create roles or databases.
- `plutus_tenant` owns nothing and has `BYPASSRLS = false`, so the policies bind.
  Every tenant request is served through it, which is why a mistake in a query
  cannot reach another tenant's rows.

Tenant isolation is enforced entirely by those policies rather than by query
predicates, so a database provisioned without the migration would not be partly
working: it would silently serve every tenant's data to every other tenant. See
`PROJECT_DOCUMENTATION.md`, section 6.

## Documentation

For detailed technical documentation including API specifications, architecture diagrams, and development guidelines, see [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)

## Current Status

- [x] UI Mockup - [live prototype](https://www.figma.com/proto/XCujR4jGAC3dMhzebz2Xch/Plutus-CRM?node-id=0%3A1302&scaling=scale-down&page-id=0%3A821&starting-point-node-id=0%3A1302)
- [x] Database Design - [model screenshot](https://drive.google.com/file/d/1wWch6KY5_NCG8XFYC8PkDfBcgE-53xlY/view?usp=sharing)
- [x] Backend Architecture Implementation
- [ ] Pre-alpha release

## Screenshots

![CustomerProfile](https://raw.githubusercontent.com/lakshverma/plutus/main/assets/Profile.png)
![Transaction](https://raw.githubusercontent.com/lakshverma/plutus/main/assets/Transaction.png)
![CreateTask](https://raw.githubusercontent.com/lakshverma/plutus/main/assets/CreateTask.png)

## Contributing

We welcome contributions! Please read our [contribution guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
