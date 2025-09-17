# Provenance Blockchain Loan Demo

A comprehensive demonstration platform for tokenized loan creation and payment distribution tracking on the Provenance blockchain, developed for Michigan Tokenizers to showcase to banking partners.

## Overview

This project demonstrates how traditional banking loan processes can be enhanced through blockchain technology using the Provenance blockchain. It showcases:

- **Loan Creation Interface**: Streamlined loan origination with asset registration
- **Payment Distribution Tracker**: Real-time payment processing and distribution
- **Asset Tokenization**: Converting traditional loan assets into blockchain tokens
- **Compliance & Audit**: Transparent transaction history and regulatory compliance

## Features

### Loan Creation
- Digital loan application processing
- Asset registration on Provenance blockchain
- Smart contract deployment for loan terms
- Borrower verification and KYC integration

### Payment Distribution
- Automated payment processing
- Real-time payment tracking
- Multi-party distribution (principal, interest, fees)
- Payment history and analytics

### Blockchain Integration
- Provenance blockchain connectivity
- Smart contract management
- Transaction monitoring
- Asset provenance tracking

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Provenance blockchain integration
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control

## Project Structure

```
provenance-loan-demo/
├── frontend/                 # React frontend application
├── backend/                  # Node.js backend API
├── contracts/               # Smart contracts and blockchain integration
├── docs/                    # Documentation and guides
├── scripts/                 # Deployment and utility scripts
└── tests/                   # Integration and unit tests
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Demo Scenarios

### For Banking Partners
1. **Loan Origination Demo**: Show how traditional loan applications are digitized and processed
2. **Asset Tokenization Demo**: Demonstrate converting loan assets into blockchain tokens
3. **Payment Processing Demo**: Real-time payment distribution and tracking
4. **Compliance Demo**: Audit trails and regulatory compliance features

## Provenance Blockchain Integration

This demo integrates with the Provenance blockchain to provide:
- Asset registration and provenance tracking
- Smart contract-based loan agreements
- Immutable payment records
- Regulatory compliance features

## License

MIT License - See LICENSE file for details

## Contact

Michigan Tokenizers
- Website: [michigantokenizers.com]
- Email: [contact@michigantokenizers.com]
