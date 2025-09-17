#!/bin/bash

# Provenance Loan Demo Setup Script
# This script sets up the development environment for the Provenance blockchain loan demo

set -e

echo "🚀 Setting up Provenance Loan Demo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 14+ and try again."
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install contract dependencies
echo "📦 Installing contract dependencies..."
cd contracts
npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please update .env with your configuration before running the application"
fi

# Create database
echo "🗄️  Setting up database..."
createdb provenance_loans 2>/dev/null || echo "Database already exists"

# Run database migrations
echo "🔄 Running database migrations..."
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p contracts/artifacts
mkdir -p contracts/cache

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start the development servers: npm run dev"
echo "3. Access the application at http://localhost:3000"
echo "4. API documentation available at http://localhost:5000/api"
echo ""
echo "📚 For more information, see the documentation in the docs/ folder"
