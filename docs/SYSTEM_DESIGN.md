# Banking Authentication System - System Design Documentation

## 1. Problem Analysis

### 1.1 Cybersecurity Challenges in Online Banking

1. **Credential Theft**: Phishing, keyloggers, and data breaches
2. **Brute Force Attacks**: Automated password guessing
3. **Session Hijacking**: Token theft and replay attacks
4. **Account Takeover**: Unauthorized access to user accounts
5. **Geographic Anomalies**: Logins from unusual locations
6. **Device Fingerprinting**: Unrecognized devices accessing accounts
7. **Social Engineering**: Manipulation to bypass security

### 1.2 Business Risks

1. **Financial Loss**: Direct theft of customer funds
2. **Reputation Damage**: Loss of customer trust
3. **Regulatory Fines**: Non-compliance with GDPR, PCI-DSS
4. **Operational Disruption**: System downtime from attacks
5. **Legal Liability**: Lawsuits from affected customers
6. **Customer Churn**: Loss of customers due to security concerns

### 1.3 Legal and Ethical Concerns

1. **GDPR Compliance**: 
   - Right to data portability
   - Right to erasure
   - Data minimization
   - Consent management

2. **PCI-DSS Requirements**:
   - Secure data transmission
   - Access control
   - Regular security testing
   - Audit logging

3. **Inclusive Design**:
   - Accessibility for users with disabilities
   - Multi-language support
   - Clear security messaging
   - User-friendly MFA options

## 2. System Design

### 2.1 Architecture Overview

The system follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│         - MVC Pattern                   │
│         - Component-based               │
└──────────────┬──────────────────────────┘
               │ HTTPS/REST API
┌──────────────▼──────────────────────────┐
│         Backend (Express.js)             │
│  ┌──────────────────────────────────┐   │
│  │  Routes Layer                     │   │
│  │  - /api/auth                     │   │
│  │  - /api/fraud                    │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │  Controllers Layer               │   │
│  │  - AuthController                │   │
│  │  - FraudController               │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │  Services Layer                  │   │
│  │  - AuthService                   │   │
│  │  - FraudDetectionService         │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │  Middleware                      │   │
│  │  - Authentication                │   │
│  │  - Validation                    │   │
│  │  - Rate Limiting                 │   │
│  └──────────┬───────────────────────┘   │
└──────────────┼──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      PostgreSQL Database                │
│  - Users, Sessions                     │
│  - Login Attempts                      │
│  - Fraud Flags                         │
│  - Audit Logs                          │
│  - Geolocation Profiles                 │
└─────────────────────────────────────────┘
```

### 2.2 Design Patterns

#### MVC (Model-View-Controller)
- **Model**: Database schema and data models
- **View**: React frontend components
- **Controller**: Express route handlers and controllers

#### Service Layer Pattern
- Business logic separated from HTTP handling
- Reusable services (AuthService, FraudDetectionService)
- Single Responsibility Principle

#### Repository Pattern (implicit)
- Database access abstracted through services
- Easy to swap database implementations

### 2.3 Security Architecture

#### Authentication Flow
1. User submits credentials
2. Server validates input
3. Password verified with bcrypt
4. Account lockout checked
5. MFA required if enabled
6. JWT token issued
7. Fraud detection runs asynchronously

#### Multi-Factor Authentication
- TOTP (Time-based One-Time Password)
- QR code generation for setup
- 6-digit codes, 30-second window
- Backup codes (future enhancement)

#### Encryption
- **At Rest**: Passwords hashed with bcrypt (12 rounds)
- **In Transit**: HTTPS/TLS
- **Tokens**: JWT with expiration

### 2.4 Scalability Considerations

1. **Horizontal Scaling**: Stateless design allows multiple instances
2. **Database Indexing**: Optimized queries with proper indexes
3. **Caching**: Session tokens can be cached (Redis in production)
4. **Load Balancing**: Multiple backend instances behind load balancer
5. **Async Processing**: Fraud detection runs asynchronously

### 2.5 Business Continuity

1. **Database Backups**: Regular automated backups
2. **Failover**: Database replication for high availability
3. **Monitoring**: Health check endpoints
4. **Audit Trails**: Complete logging for incident response
5. **Disaster Recovery**: Backup and restore procedures

## 3. System Modelling

### 3.1 Use Case Diagram

**Primary Actors**: User, System, Fraud Detection System

**Use Cases**:
- Register Account
- Login with Credentials
- Verify MFA
- View Dashboard
- View Security Alerts
- View Login History
- Detect Fraud Patterns
- Lock Account
- Audit Logging

### 3.2 Sequence Diagram: Login Flow

```
User          Frontend        Backend         AuthService    FraudService    Database
 │               │               │                 │              │              │
 │──Login───────>│               │                 │              │              │
 │               │──POST /login─>│                 │              │              │
 │               │               │──validate()────>│              │              │
 │               │               │                 │──getUser()───>│              │
 │               │               │                 │<──user───────│              │
 │               │               │                 │──verify()───>│              │
 │               │               │                 │<──valid──────│              │
 │               │               │                 │──generate()──>│              │
 │               │               │                 │<──token───────│              │
 │               │               │                 │              │              │
 │               │               │──detectFraud()──>│              │              │
 │               │               │                 │              │──check()────>│
 │               │               │                 │              │<──result─────│
 │               │<──token───────│                 │              │              │
 │<──success─────│               │                 │              │              │
```

### 3.3 Entity-Relationship Diagram

```
┌──────────┐         ┌─────────────────┐
│  Users   │────────<│ Login Attempts  │
└──────────┘         └─────────────────┘
     │                       │
     │                       │
     │                       ▼
     │                ┌──────────────┐
     │                │ Geolocation  │
     │                │   Profiles   │
     │                └──────────────┘
     │
     ├───────────────┐
     │               │
     ▼               ▼
┌──────────┐   ┌──────────────┐
│ Sessions │   │ Fraud Flags  │
└──────────┘   └──────────────┘
     │               │
     │               │
     ▼               ▼
┌──────────────┐
│ Audit Logs   │
└──────────────┘
```

### 3.4 Data Models

#### User Model
```javascript
{
  id: INTEGER (PK),
  email: VARCHAR(255) UNIQUE,
  password_hash: VARCHAR(255),
  mfa_secret: VARCHAR(255),
  phone_number: VARCHAR(20),
  is_active: BOOLEAN,
  failed_login_attempts: INTEGER,
  account_locked_until: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  last_login_at: TIMESTAMP
}
```

#### Login Attempt Model
```javascript
{
  id: INTEGER (PK),
  user_id: INTEGER (FK),
  ip_address: INET,
  user_agent: TEXT,
  success: BOOLEAN,
  timestamp: TIMESTAMP,
  geolocation_data: JSONB,
  country_code: VARCHAR(2),
  city: VARCHAR(100),
  latitude: DECIMAL(10,8),
  longitude: DECIMAL(11,8),
  is_suspicious: BOOLEAN
}
```

#### Fraud Flag Model
```javascript
{
  id: INTEGER (PK),
  user_id: INTEGER (FK),
  reason: TEXT,
  severity: INTEGER (1-5),
  ip_address: INET,
  detected_at: TIMESTAMP,
  resolved: BOOLEAN,
  resolved_at: TIMESTAMP,
  metadata: JSONB
}
```

### 3.5 Communication Models

#### REST API Protocol
- **HTTP/HTTPS**: Secure communication
- **JSON**: Data interchange format
- **Status Codes**: Standard HTTP status codes
- **Headers**: Authorization, Content-Type

#### API Endpoints
```
POST   /api/auth/register      - Register user
POST   /api/auth/login         - Login user
POST   /api/auth/verify-mfa    - Verify MFA code
GET    /api/auth/profile       - Get user profile
GET    /api/fraud/alerts       - Get fraud alerts
GET    /api/fraud/login-history - Get login history
GET    /api/health             - Health check
```

## 4. Fraud Detection

### 4.1 Fraud Detection Rules

#### Rule 1: Multiple Failed Login Attempts
- **Trigger**: 3+ failed logins in 15 minutes
- **Severity**: Medium (2)
- **Action**: Flag account, increment failed attempts counter
- **Mitigation**: Account lockout after 5 attempts

#### Rule 2: Multiple IP Addresses
- **Trigger**: 2+ different IPs in 1 hour
- **Severity**: Medium (2)
- **Action**: Flag suspicious activity
- **Mitigation**: Require additional verification

#### Rule 3: Unusual Geolocation
- **Trigger**: Login from location >1000km from trusted locations
- **Severity**: High (4) if >5000km, Medium (2) otherwise
- **Action**: Flag and require MFA verification
- **Mitigation**: Build trusted location profiles

#### Rule 4: Rapid Successive Logins
- **Trigger**: 5+ successful logins in 5 minutes
- **Severity**: Medium (3)
- **Action**: Flag potential automated attack
- **Mitigation**: Rate limiting, CAPTCHA

### 4.2 Geospatial Modelling

The system uses the **Haversine formula** to calculate distances between geographic coordinates:

```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Where:
- φ = latitude
- λ = longitude
- R = Earth's radius (6371 km)

### 4.3 Rule-Based System Implementation

The fraud detection system is **rule-based** with the following characteristics:

1. **Deterministic**: Same inputs produce same outputs
2. **Transparent**: Rules are clearly defined
3. **Configurable**: Thresholds can be adjusted
4. **Extensible**: New rules can be added easily

**Future Enhancement**: Machine learning-based anomaly detection

## 5. System Validation & Security Testing

### 5.1 Security Testing Approach

#### 1. Authentication Testing
- ✅ Multiple failed login attempts
- ✅ Account lockout mechanism
- ✅ JWT token validation
- ✅ MFA code verification
- ✅ Password strength requirements

#### 2. Input Validation Testing
- ✅ Email format validation
- ✅ Password complexity requirements
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Input sanitization

#### 3. Rate Limiting Testing
- ✅ Brute force protection
- ✅ API rate limiting
- ✅ Per-IP limits

#### 4. Fraud Detection Testing
- ✅ Multiple IP detection
- ✅ Geolocation anomaly detection
- ✅ Rapid login detection
- ✅ Failed attempt pattern detection

### 5.2 Vulnerability Mitigation

#### OWASP Top 10 Coverage

1. **Injection**: Parameterized queries, input validation
2. **Broken Authentication**: MFA, account lockout, strong passwords
3. **Sensitive Data Exposure**: Encryption, secure storage
4. **XML External Entities**: Not applicable (JSON only)
5. **Broken Access Control**: JWT validation, role-based access
6. **Security Misconfiguration**: Helmet.js, secure headers
7. **XSS**: Input sanitization, CSP headers
8. **Insecure Deserialization**: JSON validation
9. **Using Components with Known Vulnerabilities**: Regular updates
10. **Insufficient Logging**: Comprehensive audit logging

### 5.3 Peer Review Process

1. **Code Review Checklist**:
   - [ ] Input validation present
   - [ ] Error handling implemented
   - [ ] Security best practices followed
   - [ ] SOLID principles applied
   - [ ] Documentation complete

2. **Security Review**:
   - [ ] Authentication mechanisms secure
   - [ ] Authorization checks in place
   - [ ] Data encryption implemented
   - [ ] Audit logging comprehensive
   - [ ] Fraud detection rules validated

## 6. Compliance & Standards

### 6.1 GDPR Compliance
- ✅ Data minimization
- ✅ Right to access (audit logs)
- ✅ Right to erasure (user deletion)
- ✅ Data portability (export functionality)
- ✅ Security of processing (encryption, access controls)

### 6.2 PCI-DSS Alignment
- ✅ Secure data transmission (HTTPS)
- ✅ Access control (authentication, authorization)
- ✅ Regular security testing
- ✅ Audit logging
- ✅ Secure password storage

### 6.3 Industry Standards
- ✅ OWASP security guidelines
- ✅ NIST cybersecurity framework alignment
- ✅ ISO 27001 principles
- ✅ Banking security best practices

## 7. Future Enhancements

1. **Machine Learning**: Anomaly detection using ML models
2. **Biometric Authentication**: Fingerprint, face recognition
3. **Risk-Based Authentication**: Dynamic risk scoring
4. **Behavioral Analytics**: User behavior profiling
5. **Real-time Alerts**: SMS/Email notifications for suspicious activity
6. **Backup Codes**: MFA recovery codes
7. **Session Management**: Active session monitoring
8. **CAPTCHA Integration**: Bot protection

## Conclusion

This system demonstrates business-critical system design principles with:
- ✅ Secure architectural patterns (MVC, REST)
- ✅ Multi-layered security (MFA, encryption, validation)
- ✅ Operational resilience (scalability, monitoring)
- ✅ Proactive fraud detection (rule-based, geospatial)
- ✅ Legal compliance (GDPR, PCI-DSS alignment)
- ✅ Systematic modelling (UML, ERD, sequence diagrams)

