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

4. Start the development server:
```bash
npm run dev
```

5. Access the API at `http://localhost:3000`

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
