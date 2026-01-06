# Setup Guide - Banking Authentication System

## Quick Start

### 1. Prerequisites

Ensure you have the following installed:
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb banking_auth

# Or using psql
psql -U postgres
CREATE DATABASE banking_auth;
\q

# Run schema
psql -d banking_auth -f database/schema.sql
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
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_auth
DB_USER=your_db_user
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
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U your_user -d banking_auth -c "SELECT 1;"
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
Frontend (React) → Backend (Express) → PostgreSQL
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

