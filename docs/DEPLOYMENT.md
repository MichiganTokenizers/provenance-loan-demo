# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional)
- Provenance blockchain access

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd provenance-loan-demo
npm run install:all
```

### 2. Environment Configuration

```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start PostgreSQL
# Create database
createdb provenance_loans

# Run migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Servers

```bash
# From project root
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Production Deployment

### Docker Deployment

#### 1. Build Images

```bash
# Build frontend
cd frontend
docker build -t provenance-loan-frontend .

# Build backend
cd ../backend
docker build -t provenance-loan-backend .
```

#### 2. Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    image: provenance-loan-frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://backend:5000/api

  backend:
    image: provenance-loan-backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/provenance_loans
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=provenance_loans
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Cloud Deployment

#### AWS Deployment

1. **RDS PostgreSQL Instance**
   - Create RDS PostgreSQL instance
   - Configure security groups
   - Note connection details

2. **EC2 Instance for Backend**
   - Launch EC2 instance
   - Install Node.js and PM2
   - Deploy backend application
   - Configure environment variables

3. **S3 + CloudFront for Frontend**
   - Build frontend: `npm run build`
   - Upload to S3 bucket
   - Configure CloudFront distribution
   - Set up custom domain

4. **Load Balancer**
   - Configure Application Load Balancer
   - Set up SSL certificates
   - Configure health checks

#### Azure Deployment

1. **Azure Database for PostgreSQL**
   - Create managed PostgreSQL instance
   - Configure firewall rules
   - Set up connection string

2. **Azure App Service**
   - Create App Service for backend
   - Configure deployment from Git
   - Set environment variables

3. **Azure Static Web Apps**
   - Deploy frontend to Static Web Apps
   - Configure custom domain
   - Set up CI/CD pipeline

### Environment Variables

#### Production Environment

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/provenance_loans

# Provenance Blockchain
PROVENANCE_NETWORK=mainnet
PROVENANCE_RPC_URL=https://rpc.provenance.io
PROVENANCE_GRPC_URL=https://grpc.provenance.io
PROVENANCE_CHAIN_ID=pio-mainnet-1

# Security
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production

# External Services
KYC_PROVIDER_API_KEY=your-production-key
SMTP_HOST=your-smtp-host
SMTP_USER=your-email
SMTP_PASS=your-password
```

### SSL/TLS Configuration

1. **Obtain SSL Certificate**
   - Use Let's Encrypt for free certificates
   - Or purchase from certificate authority

2. **Configure HTTPS**
   - Update nginx/Apache configuration
   - Redirect HTTP to HTTPS
   - Set up HSTS headers

### Monitoring and Logging

#### Application Monitoring

1. **Health Checks**
   - Configure health check endpoints
   - Set up monitoring alerts
   - Monitor database connections

2. **Logging**
   - Configure Winston logging
   - Set up log aggregation (ELK stack)
   - Monitor error rates

3. **Performance Monitoring**
   - Use APM tools (New Relic, DataDog)
   - Monitor response times
   - Track database performance

### Security Considerations

1. **Network Security**
   - Configure firewalls
   - Use VPC for private networks
   - Enable DDoS protection

2. **Application Security**
   - Regular security updates
   - Input validation
   - SQL injection prevention
   - XSS protection

3. **Data Protection**
   - Encrypt sensitive data
   - Use secure key management
   - Regular backups
   - GDPR compliance

### Backup Strategy

1. **Database Backups**
   - Automated daily backups
   - Point-in-time recovery
   - Cross-region replication

2. **Application Backups**
   - Code repository backups
   - Configuration backups
   - Disaster recovery plan

### Scaling Considerations

1. **Horizontal Scaling**
   - Load balancer configuration
   - Database read replicas
   - CDN for static assets

2. **Vertical Scaling**
   - Monitor resource usage
   - Upgrade instance sizes
   - Optimize database queries

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check connection string
   - Verify network access
   - Check database status

2. **Blockchain Connection Issues**
   - Verify RPC endpoints
   - Check wallet configuration
   - Monitor gas prices

3. **Frontend Build Issues**
   - Check environment variables
   - Verify API endpoints
   - Clear build cache

### Logs and Debugging

```bash
# Backend logs
pm2 logs provenance-loan-backend

# Database logs
tail -f /var/log/postgresql/postgresql.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```
