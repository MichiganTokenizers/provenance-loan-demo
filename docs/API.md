# API Documentation

## Overview

The Provenance Loan Demo API provides endpoints for loan management, payment processing, and blockchain integration.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "banker",
      "name": "John Doe"
    },
    "token": "jwt_token"
  }
}
```

#### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "banker"
}
```

### Loans

#### GET /loans
Get all loans with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by loan status
- `borrower` (optional): Filter by borrower email

**Response:**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "uuid",
        "borrowerName": "John Doe",
        "amount": 100000,
        "interestRate": 5.5,
        "term": 360,
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### POST /loans
Create a new loan.

**Request Body:**
```json
{
  "borrowerName": "John Doe",
  "borrowerEmail": "john@example.com",
  "amount": 100000,
  "interestRate": 5.5,
  "term": 360,
  "collateral": {
    "type": "real_estate",
    "value": 150000,
    "description": "Residential property"
  },
  "loanPurpose": "Home purchase"
}
```

#### GET /loans/:id
Get loan details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrowerName": "John Doe",
    "borrowerEmail": "john@example.com",
    "amount": 100000,
    "interestRate": 5.5,
    "term": 360,
    "status": "active",
    "collateral": {
      "type": "real_estate",
      "value": 150000,
      "description": "Residential property"
    },
    "payments": [
      {
        "id": "uuid",
        "amount": 536.82,
        "principal": 386.82,
        "interest": 150.00,
        "dueDate": "2024-02-01T00:00:00Z",
        "status": "paid"
      }
    ],
    "blockchain": {
      "assetId": "provenance_asset_id",
      "contractAddress": "0x...",
      "transactionHash": "0x..."
    }
  }
}
```

### Payments

#### GET /payments
Get payment history with filtering.

**Query Parameters:**
- `loanId` (optional): Filter by loan ID
- `status` (optional): Filter by payment status
- `dateFrom` (optional): Start date filter
- `dateTo` (optional): End date filter

#### POST /payments
Process a payment.

**Request Body:**
```json
{
  "loanId": "uuid",
  "amount": 536.82,
  "paymentMethod": "bank_transfer",
  "reference": "TXN123456"
}
```

#### GET /payments/:id
Get payment details by ID.

### Blockchain

#### POST /blockchain/register-asset
Register a loan asset on Provenance blockchain.

**Request Body:**
```json
{
  "loanId": "uuid",
  "assetType": "loan",
  "metadata": {
    "borrowerName": "John Doe",
    "amount": 100000,
    "interestRate": 5.5
  }
}
```

#### GET /blockchain/asset/:assetId
Get asset information from blockchain.

#### POST /blockchain/deploy-contract
Deploy a smart contract for loan management.

**Request Body:**
```json
{
  "loanId": "uuid",
  "contractType": "loan_agreement",
  "parameters": {
    "borrower": "0x...",
    "amount": 100000,
    "interestRate": 550,
    "term": 360
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BLOCKCHAIN_ERROR`: Blockchain operation failed
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per minute
- General endpoints: 100 requests per minute
- Blockchain endpoints: 10 requests per minute

## WebSocket Events

### Real-time Updates

Connect to `/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

### Event Types

- `payment_processed`: Payment has been processed
- `loan_status_changed`: Loan status has been updated
- `blockchain_transaction`: Blockchain transaction completed
- `system_notification`: System-wide notification
