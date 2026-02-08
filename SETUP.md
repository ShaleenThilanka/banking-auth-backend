# Setup Guide - Banking Authentication System

## Quick Start

### 1. Prerequisites

Ensure you have the following installed:
- Node.js (v16 or higher)
- MySQL (v8.0 or higher) or MariaDB (v10.3 or higher)
- npm or yarn

### 2. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE banking_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional, recommended for production)
CREATE USER 'banking_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON banking_auth.* TO 'banking_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run schema
mysql -u root -p banking_auth < database/schema.sql

# Or if using a specific user
mysql -u banking_user -p banking_auth < database/schema.sql
```

### 3. Backend Setup

```bash
cd banking-auth-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Important: Change JWT_SECRET to a strong random string
# Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd banking-auth-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Verify Installation

1. Backend should be running on `http://localhost:5000`
2. Frontend should be running on `http://localhost:5173`
3. Check backend health: `http://localhost:5000/api/health`

## Environment Variables

### Required Variables

```env
# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=banking_auth
DB_USER=root
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=24h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Optional Variables

```env
PORT=5000
NODE_ENV=development
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30
```

## Testing

### Run Security Tests

```bash
cd banking-auth-backend
node tests/security.test.js
```

### Manual Testing

1. **Register a new user**:
   - Navigate to `/register`
   - Fill in email, password, phone number
   - Scan QR code with authenticator app
   - Save the MFA secret

2. **Login**:
   - Navigate to `/login`
   - Enter credentials
   - Enter MFA code from authenticator app
   - Should redirect to dashboard

3. **View Security Data**:
   - Dashboard shows fraud alerts and login history
   - All data is fetched from backend API

## Troubleshooting

### Database Connection Issues

```bash
# Check MySQL is running
sudo systemctl status mysql
# Or for MariaDB
sudo systemctl status mariadb

# Test connection
mysql -u your_user -p -e "USE banking_auth; SELECT 1;"

# Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'banking_auth';"
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=5001
```

### CORS Issues

```bash
# Ensure FRONTEND_URL in .env matches your frontend URL
FRONTEND_URL=http://localhost:5173
```

### MFA Not Working

- Ensure system time is synchronized
- Check MFA secret was saved correctly
- Verify authenticator app is using TOTP (not HOTP)

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set NODE_ENV=production
- [ ] Enable database SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Regular security updates
- [ ] Database backups configured

### Recommended Production Settings

```env
NODE_ENV=production
BCRYPT_SALT_ROUNDS=12
JWT_EXPIRES_IN=1h
RATE_LIMIT_MAX_REQUESTS=50
AUTH_RATE_LIMIT_MAX=3
```

## Architecture Overview

```
Frontend (React) → Backend (Express) → MySQL
     ↓                    ↓
  Components        Controllers
     ↓                    ↓
  Context          Services
     ↓                    ↓
  API Calls        Database
```

## Support

For issues or questions, refer to:
- `README.md` - General documentation
- `docs/SYSTEM_DESIGN.md` - System design details
- `database/schema.sql` - Database schema

