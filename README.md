# Banking Authentication System - Backend

A secure online banking authentication system with advanced fraud detection capabilities, built following business-critical system design principles.

## Features

### Security Features
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA using Speakeasy
- **Password Security**: Bcrypt hashing with configurable salt rounds
- **JWT Token Authentication**: Secure token-based authentication
- **Account Lockout**: Automatic account locking after failed login attempts
- **Rate Limiting**: Protection against brute-force attacks
- **Input Validation**: Comprehensive validation and sanitization
- **Audit Logging**: Complete audit trail for compliance (GDPR, PCI-DSS)

### Fraud Detection
- **Multiple IP Detection**: Flags logins from multiple IPs in short time
- **Geolocation Tracking**: Detects unusual login locations
- **Failed Login Patterns**: Monitors and flags suspicious failed login attempts
- **Rapid Login Detection**: Identifies potential automated attacks
- **Geolocation Profiling**: Builds trusted location profiles for users

### Architecture
- **MVC Pattern**: Clear separation of concerns
- **SOLID Principles**: Service-oriented architecture
- **RESTful API**: Standard REST endpoints
- **PostgreSQL Database**: Relational database with proper indexing

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
# Create database
createdb banking_auth

# Run schema
psql -d banking_auth -f database/schema.sql
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-mfa` - Verify MFA code
- `GET /api/auth/profile` - Get user profile (protected)

### Fraud Detection
- `GET /api/fraud/alerts` - Get fraud alerts (protected)
- `GET /api/fraud/login-history` - Get login history (protected)

### Health Check
- `GET /api/health` - Server health check

## Database Schema

The system uses the following main tables:
- `users` - User accounts and credentials
- `login_attempts` - All login attempts with geolocation
- `fraud_flags` - Detected fraud patterns
- `audit_logs` - Comprehensive audit trail
- `user_geolocation_profiles` - User location profiles
- `sessions` - Active user sessions

## Security Considerations

1. **Password Requirements**: Minimum 8 characters with uppercase, lowercase, and number
2. **Account Lockout**: 5 failed attempts locks account for 30 minutes
3. **Rate Limiting**: 5 login attempts per 15 minutes per IP
4. **JWT Expiration**: Tokens expire after 24 hours (configurable)
5. **MFA**: Required for all authenticated sessions
6. **Audit Logging**: All security events are logged

## Fraud Detection Rules

1. **Multiple Failed Attempts**: 3+ failed logins in 15 minutes
2. **Multiple IPs**: 2+ different IPs in 1 hour
3. **Unusual Location**: Login from location >1000km from trusted locations
4. **Rapid Logins**: 5+ successful logins in 5 minutes

## Development

The project follows SOLID principles:
- **Single Responsibility**: Each service/controller has one responsibility
- **Open/Closed**: Extensible without modification
- **Liskov Substitution**: Proper inheritance patterns
- **Interface Segregation**: Focused interfaces
- **Dependency Inversion**: Dependencies on abstractions

## Testing

Security testing utilities are available in the `tests/` directory.

## License

ISC

