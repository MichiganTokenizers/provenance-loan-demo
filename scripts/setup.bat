@echo off
REM Provenance Loan Demo Setup Script for Windows
REM This script sets up the development environment for the Provenance blockchain loan demo

echo 🚀 Setting up Provenance Loan Demo...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed. Please install PostgreSQL 14+ and try again.
    exit /b 1
)

echo ✅ PostgreSQL is installed

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install contract dependencies
echo 📦 Installing contract dependencies...
cd contracts
call npm install
cd ..

REM Create environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment file...
    copy env.example .env
    echo ⚠️  Please update .env with your configuration before running the application
)

REM Create database
echo 🗄️  Setting up database...
createdb provenance_loans 2>nul || echo Database already exists

REM Run database migrations
echo 🔄 Running database migrations...
cd backend
call npx prisma migrate dev --name init
call npx prisma generate
cd ..

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist logs mkdir logs
if not exist uploads mkdir uploads
if not exist contracts\artifacts mkdir contracts\artifacts
if not exist contracts\cache mkdir contracts\cache

echo ✅ Setup completed successfully!
echo.
echo 🎉 Next steps:
echo 1. Update .env file with your configuration
echo 2. Start the development servers: npm run dev
echo 3. Access the application at http://localhost:3000
echo 4. API documentation available at http://localhost:5000/api
echo.
echo 📚 For more information, see the documentation in the docs/ folder

pause
