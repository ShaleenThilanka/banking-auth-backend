# Banking Authentication System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Authentication Flow](#authentication-flow)
4. [Fraud Detection System](#fraud-detection-system)
5. [Security Features](#security-features)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [How It Works](#how-it-works)

---

## System Overview

### Purpose
A secure online banking authentication system with advanced fraud detection capabilities, designed to protect customer assets and maintain trust in digital financial transactions.

### Key Features
- **Multi-Factor Authentication (MFA)**: TOTP-based two-factor authentication
- **Advanced Fraud Detection**: Real-time monitoring and rule-based detection
- **Geolocation Tracking**: IP-based location monitoring
- **Comprehensive Audit Logging**: Complete security event tracking
- **Account Security**: Automatic lockout and failed attempt tracking

---

## Architecture & Data Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Login      │  │  Register    │  │  Dashboard   │     │
│  │  Component   │  │  Component  │  │  Component   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │ AuthContext │                          │
│                    │  (State)   │                          │
│                    └──────┬──────┘                          │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTPS/REST API
                            │ (Port 5000)
┌───────────────────────────▼──────────────────────────────────┐
│                  BACKEND (Express.js)                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Security Middleware                     │    │
│  │  • Helmet.js (Security Headers)                     │    │
│  │  • CORS (Cross-Origin Resource Sharing)            │    │
│  │  • Rate Limiting (Brute Force Protection)          │    │
│  │  • Request Logging                                  │    │
│  └──────────────────┬─────────────────────────────────┘    │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐    │
│  │              Routes Layer                             │    │
│  │  • /api/auth/*    - Authentication routes            │    │
│  │  • /api/fraud/*   - Fraud detection data             │    │
│  │  • /api/users/*   - User management                   │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐    │
│  │           Controllers Layer                          │    │
│  │  • AuthController    - HTTP request handling         │    │
│  │  • FraudController   - Fraud data requests           │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐    │
│  │            Services Layer (Business Logic)            │    │
│  │  • AuthService           - Authentication logic      │    │
│  │  • FraudDetectionService - Fraud detection rules     │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │                                        │
│  ┌───────────────────▼─────────────────────────────────┐    │
│  │            Middleware Layer                          │    │
│  │  • Input Validation    - Data sanitization            │    │
│  │  • Authentication      - JWT token verification       │    │
│  │  • Audit Logging       - Security event logging       │    │
│  └───────────────────┬─────────────────────────────────┘    │
└──────────────────────┼───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              MySQL Database (InnoDB)                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  users   │  │login_attempts│  │ fraud_flags   │         │
│  └──────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │audit_logs│  │geolocation_  │  │  sessions    │         │
│  │          │  │profiles      │  │              │         │
│  └──────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

#### Registration Flow
```
User Input → Frontend Validation → HTTP POST /api/auth/register
    ↓
Rate Limiter Check (20 requests/15min in dev)
    ↓
Input Validation Middleware
    • Email format check
    • Password strength check (8+ chars, uppercase, lowercase, number)
    • Phone number validation
    ↓
AuthController.register()
    ↓
AuthService.register()
    • Check if user exists
    • Hash password (bcrypt, 12 rounds)
    • Generate MFA secret (Speakeasy)
    • Create QR code
    • Insert into database
    ↓
Audit Logging (USER_REGISTERED event)
    ↓
Return MFA setup data to frontend
    ↓
Frontend displays QR code
```

#### Login Flow
```
User Input → Frontend → HTTP POST /api/auth/login
    ↓
Rate Limiter Check (50 requests/15min in dev)
    ↓
Input Validation Middleware
    ↓
AuthController.login()
    ↓
AuthService.login()
    • Find user by email
    • Check account lockout status
    • Verify password (bcrypt.compare)
    • Check failed attempts
    • Record login attempt
    ↓
Fraud Detection Service (Async)
    • Get geolocation from IP
    • Check multiple IPs
    • Check unusual location
    • Check rapid logins
    • Update geolocation profile
    ↓
If MFA enabled:
    • Return temp token
    • Frontend shows MFA input
    • User enters 6-digit code
    • POST /api/auth/verify-mfa
    • Verify TOTP code
    • Generate final JWT token
    ↓
Return JWT token to frontend
    ↓
Frontend stores token in localStorage
    ↓
Redirect to Dashboard
```

---

## Authentication Flow

### Step-by-Step Authentication Process

#### 1. User Registration

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Enters email, password, phone
     ▼
┌─────────────────┐
│  Frontend       │
│  Validation    │
└────┬───────────┘
     │ 2. Client-side validation
     ▼
┌─────────────────┐
│  POST /register │
└────┬────────────┘
     │ 3. HTTP Request
     ▼
┌─────────────────┐
│  Rate Limiter   │
└────┬────────────┘
     │ 4. Check request limit
     ▼
┌─────────────────┐
│  Validation     │
│  Middleware     │
└────┬────────────┘
     │ 5. Server-side validation
     ▼
┌─────────────────┐
│  AuthService    │
│  .register()    │
└────┬────────────┘
     │ 6. Business logic
     │    • Check duplicate email
     │    • Hash password (bcrypt)
     │    • Generate MFA secret
     │    • Create QR code
     ▼
┌─────────────────┐
│  Database       │
│  INSERT user    │
└────┬────────────┘
     │ 7. Store user data
     ▼
┌─────────────────┐
│  Audit Log      │
│  USER_REGISTERED│
└────┬────────────┘
     │ 8. Log security event
     ▼
┌─────────────────┐
│  Return MFA     │
│  Setup Data     │
└────┬────────────┘
     │ 9. Response with QR code
     ▼
┌─────────┐
│  User   │
│  Scans  │
│  QR Code│
└─────────┘
```

#### 2. User Login

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Enters credentials
     ▼
┌─────────────────┐
│  POST /login    │
└────┬────────────┘
     │ 2. HTTP Request
     ▼
┌─────────────────┐
│  AuthService    │
│  .login()       │
└────┬────────────┘
     │ 3. Verify credentials
     │    • Find user
     │    • Check lockout
     │    • Verify password
     │    • Reset failed attempts
     ▼
┌─────────────────┐
│  Record Login   │
│  Attempt        │
└────┬────────────┘
     │ 4. Log attempt with geolocation
     ▼
┌─────────────────┐
│  Fraud Detection│
│  (Async)        │
└────┬────────────┘
     │ 5. Run fraud checks
     ▼
┌─────────────────┐
│  MFA Check      │
└────┬────────────┘
     │ 6. If MFA enabled
     │    • Return temp token
     │    • User enters code
     │    • Verify TOTP
     ▼
┌─────────────────┐
│  Generate JWT   │
│  Token           │
└────┬────────────┘
     │ 7. Create access token
     ▼
┌─────────┐
│  User   │
│  Logged │
│  In     │
└─────────┘
```

### Password Security

```
User Password: "MySecure123"
    ↓
Bcrypt Hashing (12 salt rounds)
    ↓
$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBWVHxkd0
    ↓
Stored in Database (password_hash column)
    ↓
Never stored in plain text
Never logged in requests
Never returned in API responses
```

### JWT Token Structure

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "userId": 123,
  "email": "user@example.com",
  "iat": 1704547200
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)

Result:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzA0NTQ3MjAwfQ.signature
```

---

## Fraud Detection System

### Overview

The fraud detection system uses **rule-based detection** with real-time monitoring to identify suspicious activities. It operates asynchronously to avoid impacting user experience.

### Fraud Detection Architecture

```
Login Attempt
    ↓
┌─────────────────────────────┐
│  FraudDetectionService      │
│  .detectFraud()             │
└───────────┬─────────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────────┐
│ Failed  │    │  Successful  │
│ Login   │    │  Login       │
└────┬────┘    └──────┬───────┘
     │                │
     ▼                ▼
┌─────────────┐  ┌──────────────────────────┐
│ Check       │  │ 1. Get Geolocation       │
│ Failed      │  │ 2. Record Login Attempt  │
│ Attempts    │  │ 3. Check Multiple IPs    │
│ Pattern     │  │ 4. Check Unusual Location│
└────┬────────┘  │ 5. Check Rapid Logins    │
     │           │ 6. Update Geolocation    │
     │           │    Profile                │
     │           └───────────┬───────────────┘
     │                       │
     └───────────┬───────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Flag Fraud   │
         │  (if detected)│
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Store in     │
         │  fraud_flags  │
         └───────────────┘
```

### Fraud Detection Rules

#### Rule 1: Multiple Failed Login Attempts

**Purpose**: Detect brute force attacks

**Logic**:
```
IF failed_login_count >= 3 
   AND time_window <= 15 minutes
THEN
   Flag as fraud
   Severity: Medium (2)
   Reason: "Multiple failed login attempts within 15 minutes"
```

**Implementation**:
```sql
SELECT COUNT(*) as count 
FROM login_attempts 
WHERE user_id = $1 
  AND success = false 
  AND timestamp > NOW() - INTERVAL '15 minutes'
```

**Action**: 
- Flag account
- Increment failed attempt counter
- Lock account after 5 attempts (30 minutes)

---

#### Rule 2: Multiple IP Addresses

**Purpose**: Detect account sharing or compromise

**Logic**:
```
IF distinct_ip_count > 2 
   AND time_window <= 1 hour
THEN
   Flag as fraud
   Severity: Medium (2)
   Reason: "Multiple IP addresses used in short time period"
```

**Implementation**:
```sql
SELECT COUNT(DISTINCT ip_address) as ip_count 
FROM login_attempts 
WHERE user_id = $1 
  AND success = true 
  AND timestamp > NOW() - INTERVAL '1 hour'
```

**Action**:
- Flag suspicious activity
- Log all IP addresses used
- Require additional verification

---

#### Rule 3: Unusual Geolocation

**Purpose**: Detect logins from unexpected locations

**Logic**:
```
IF current_location NOT IN trusted_locations
   AND distance_from_nearest_trusted > 1000 km
THEN
   Flag as fraud
   Severity: High (4) if > 5000km, Medium (2) otherwise
   Reason: "Unusual geolocation: {city}, {country}"
```

**Geolocation Calculation (Haversine Formula)**:
```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c

Where:
- φ = latitude in radians
- λ = longitude in radians
- R = Earth's radius (6371 km)
```

**Trusted Location Building**:
- First 3 logins from a location mark it as trusted
- Locations with 3+ successful logins become trusted
- Trusted locations stored in `user_geolocation_profiles`

**Action**:
- Flag unusual location
- Require MFA verification
- Update geolocation profile

---

#### Rule 4: Rapid Successive Logins

**Purpose**: Detect automated attacks or bot activity

**Logic**:
```
IF successful_login_count > 5 
   AND time_window <= 5 minutes
THEN
   Flag as fraud
   Severity: Medium (3)
   Reason: "Rapid successive logins detected (potential automated attack)"
```

**Implementation**:
```sql
SELECT COUNT(*) as count 
FROM login_attempts 
WHERE user_id = $1 
  AND success = true 
  AND timestamp > NOW() - INTERVAL '5 minutes'
```

**Action**:
- Flag potential automated attack
- Suggest CAPTCHA (future enhancement)
- Rate limit further requests

---

### Geolocation Tracking

#### IP to Location Conversion

```
User IP Address: 192.168.1.100
    ↓
Check if local/internal IP
    ↓
IF local: Return minimal data
ELSE:
    ↓
Call ip-api.com API
    ↓
GET http://ip-api.com/json/{ip}?fields=status,countryCode,city,lat,lon
    ↓
Parse Response:
{
  "status": "success",
  "countryCode": "US",
  "city": "New York",
  "lat": 40.7128,
  "lon": -74.0060
}
    ↓
Store in login_attempts table:
- geolocation_data (JSON)
- country_code
- city
- latitude
- longitude
```

#### Building Trusted Location Profiles

```
First Login from Location A
    ↓
Create geolocation_profile
- country_code: "US"
- city: "New York"
- is_trusted: false
- login_count: 1
    ↓
Second Login from Location A
    ↓
Update profile
- login_count: 2
    ↓
Third Login from Location A
    ↓
Update profile
- login_count: 3
- is_trusted: true (automatic after 3 logins)
    ↓
Future logins from Location A
    ↓
No fraud flag (trusted location)
```

---

## Security Features

### 1. Multi-Layered Security

```
┌─────────────────────────────────────┐
│  Layer 1: Network Security          │
│  • HTTPS/TLS encryption             │
│  • CORS protection                  │
│  • Security headers (Helmet.js)     │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 2: Application Security     │
│  • Rate limiting                    │
│  • Input validation                 │
│  • SQL injection prevention         │
│  • XSS protection                   │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 3: Authentication Security   │
│  • Password hashing (bcrypt)         │
│  • JWT token authentication         │
│  • Multi-factor authentication      │
│  • Account lockout                  │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 4: Fraud Detection           │
│  • Real-time monitoring             │
│  • Geolocation tracking             │
│  • Pattern detection                │
│  • Audit logging                     │
└─────────────────────────────────────┘
```

### 2. Password Security

**Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- (Optional: Special characters)

**Storage**:
- Never stored in plain text
- Hashed using bcrypt (12 salt rounds)
- Salt automatically generated per password

**Example**:
```
Input: "MySecure123"
Hashed: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBWVHxkd0"
```

### 3. Account Lockout Mechanism

```
Failed Login Attempt 1
    ↓
failed_login_attempts = 1
    ↓
Failed Login Attempt 2
    ↓
failed_login_attempts = 2
    ↓
Failed Login Attempt 3
    ↓
failed_login_attempts = 3
    ↓
Failed Login Attempt 4
    ↓
failed_login_attempts = 4
    ↓
Failed Login Attempt 5
    ↓
failed_login_attempts = 5
account_locked_until = NOW() + 30 minutes
    ↓
All login attempts blocked for 30 minutes
    ↓
After 30 minutes:
account_locked_until = NULL
failed_login_attempts = 0
Account unlocked
```

### 4. Rate Limiting

**General API**:
- Development: 1000 requests per 15 minutes
- Production: 100 requests per 15 minutes

**Authentication Endpoints**:
- Registration: 20 requests per 15 minutes (dev), 3 (prod)
- Login: 50 requests per 15 minutes (dev), 5 (prod)

**Purpose**:
- Prevent brute force attacks
- Protect against DDoS
- Limit automated abuse

### 5. Input Validation & Sanitization

**Email Validation**:
- Format check (RFC 5322)
- Length check (max 255 characters)
- Normalization (trim, lowercase)

**Password Validation**:
- Length check (min 8 characters)
- Complexity check (uppercase, lowercase, number)
- No common passwords (future enhancement)

**Phone Number Validation**:
- Format check (8-15 digits)
- Supports international format (+country code)
- Supports local format (can start with 0)

**Sanitization**:
- XSS prevention (HTML escaping)
- SQL injection prevention (parameterized queries)
- Trim whitespace
- Remove special characters where appropriate

### 6. Audit Logging

**What Gets Logged**:
- All authentication attempts (success/failure)
- User registration
- MFA verification
- Fraud detection events
- Security violations
- Administrative actions

**Log Structure**:
```json
{
  "id": 123,
  "user_id": 456,
  "action": "LOGIN_SUCCESS",
  "resource_type": "auth",
  "resource_id": 456,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "request_data": {},
  "response_status": 200,
  "severity": "INFO",
  "timestamp": "2024-01-06T08:30:00Z"
}
```

**Compliance**:
- GDPR: Complete audit trail
- PCI-DSS: Security event logging
- Incident response: Detailed investigation data

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │
│ email (UNIQUE)│
│ password_hash│
│ mfa_secret   │
│ phone_number │
│ is_active    │
│ failed_login │
│ locked_until │
│ created_at   │
│ updated_at   │
│ last_login   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│  login_attempts     │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ ip_address          │
│ user_agent          │
│ success             │
│ timestamp           │
│ geolocation_data    │
│ country_code        │
│ city                │
│ latitude            │
│ longitude           │
│ is_suspicious       │
└──────┬──────────────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│   fraud_flags       │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ reason              │
│ severity (1-5)      │
│ ip_address          │
│ detected_at         │
│ resolved            │
│ resolved_at         │
│ metadata (JSONB)    │
└─────────────────────┘

┌──────────────┐
│ audit_logs   │
├──────────────┤
│ id (PK)      │
│ user_id (FK) │
│ action       │
│ resource_type│
│ resource_id  │
│ ip_address   │
│ user_agent   │
│ request_data │
│ response_status│
│ severity     │
│ timestamp    │
└──────────────┘

┌──────────────────────┐
│user_geolocation_     │
│profiles              │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ country_code         │
│ city                 │
│ latitude             │
│ longitude            │
│ first_seen           │
│ last_seen            │
│ login_count          │
│ is_trusted           │
└──────────────────────┘
```

### Key Tables

#### users
Stores user account information and credentials.

**Key Fields**:
- `password_hash`: Bcrypt hashed password
- `mfa_secret`: TOTP secret for MFA
- `failed_login_attempts`: Counter for lockout
- `account_locked_until`: Timestamp for lockout expiration

#### login_attempts
Tracks all login attempts for fraud detection.

**Key Fields**:
- `geolocation_data`: Full JSON geolocation data
- `country_code`, `city`, `latitude`, `longitude`: Parsed location
- `is_suspicious`: Flag for suspicious attempts

#### fraud_flags
Records detected fraud patterns.

**Key Fields**:
- `severity`: 1 (Low) to 5 (Critical)
- `metadata`: Additional context (JSONB)
- `resolved`: Flag for manual review

#### audit_logs
Comprehensive security event log.

**Key Fields**:
- `action`: Event type (LOGIN_SUCCESS, FRAUD_FLAGGED, etc.)
- `severity`: INFO, WARN, ERROR
- `request_data`: Full request context (JSONB)

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+1234567890"
}
```

**Response** (201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 123,
    "email": "user@example.com"
  },
  "mfaSetup": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,..."
  }
}
```

**Errors**:
- 400: Validation failed
- 400: User already exists
- 429: Too many requests

---

#### POST /api/auth/login
Authenticate user and get access token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response** (200) - MFA Required:
```json
{
  "message": "MFA required",
  "mfaRequired": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200) - Direct Login:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com"
  }
}
```

**Errors**:
- 400: Validation failed
- 401: Invalid credentials
- 403: Account locked
- 429: Too many requests

---

#### POST /api/auth/verify-mfa
Verify MFA code and get final token.

**Request**:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mfaCode": "123456"
}
```

**Response** (200):
```json
{
  "message": "MFA verification successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com"
  }
}
```

**Errors**:
- 400: Invalid MFA code format
- 401: Invalid MFA code
- 403: IP address mismatch

---

#### GET /api/auth/profile
Get authenticated user profile.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "phone_number": "+1234567890",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2024-01-06T08:00:00Z"
  }
}
```

**Errors**:
- 401: No token provided
- 403: Invalid or expired token
- 404: User not found

---

### Fraud Detection Endpoints

#### GET /api/fraud/alerts
Get fraud alerts for authenticated user.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `limit`: Number of alerts to return (default: 10)

**Response** (200):
```json
{
  "alerts": [
    {
      "id": 1,
      "user_id": 123,
      "reason": "Multiple IP addresses used in short time period",
      "severity": 2,
      "ip_address": "192.168.1.100",
      "detected_at": "2024-01-06T08:00:00Z",
      "resolved": false,
      "metadata": {
        "ipCount": 3,
        "timeWindow": "1 hour",
        "ipAddresses": ["192.168.1.100", "10.0.0.1", "172.16.0.1"]
      }
    }
  ]
}
```

---

#### GET /api/fraud/login-history
Get login history for authenticated user.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `limit`: Number of entries to return (default: 10)

**Response** (200):
```json
{
  "history": [
    {
      "id": 1,
      "user_id": 123,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "success": true,
      "timestamp": "2024-01-06T08:00:00Z",
      "country_code": "US",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "is_suspicious": false
    }
  ]
}
```

---

## How It Works

### Complete User Journey

#### 1. Registration Process

```
Step 1: User visits registration page
    ↓
Step 2: Fills form (email, password, phone)
    ↓
Step 3: Frontend validates input
    ↓
Step 4: POST /api/auth/register
    ↓
Step 5: Backend validates input
    ↓
Step 6: Check if email exists
    ↓
Step 7: Hash password (bcrypt)
    ↓
Step 8: Generate MFA secret
    ↓
Step 9: Create QR code
    ↓
Step 10: Insert user into database
    ↓
Step 11: Log registration event
    ↓
Step 12: Return MFA setup data
    ↓
Step 13: User scans QR code with authenticator app
    ↓
Step 14: MFA configured, ready to login
```

#### 2. Login Process

```
Step 1: User enters email and password
    ↓
Step 2: POST /api/auth/login
    ↓
Step 3: Find user by email
    ↓
Step 4: Check account lockout
    ↓
Step 5: Verify password
    ↓
Step 6: Record login attempt (with geolocation)
    ↓
Step 7: Run fraud detection (async)
    ↓
Step 8: Check if MFA enabled
    ↓
Step 9a: If MFA enabled:
    - Return temp token
    - User enters 6-digit code
    - Verify TOTP code
    - Generate final JWT token
    ↓
Step 9b: If MFA not enabled:
    - Generate JWT token directly
    ↓
Step 10: Return token to frontend
    ↓
Step 11: Frontend stores token
    ↓
Step 12: Redirect to dashboard
```

#### 3. Fraud Detection Process

```
Every Login Attempt
    ↓
┌─────────────────────────────┐
│  Get IP Address            │
│  Get Geolocation Data       │
└───────────┬─────────────────┘
            ↓
┌─────────────────────────────┐
│  Record Login Attempt       │
│  (with geolocation)         │
└───────────┬─────────────────┘
            ↓
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────────┐
│ Failed  │    │  Successful  │
│ Login   │    │  Login       │
└────┬────┘    └──────┬───────┘
     │                │
     ▼                ▼
┌─────────────┐  ┌──────────────────────────┐
│ Check       │  │ 1. Check Multiple IPs  │
│ Failed      │  │ 2. Check Unusual Loc    │
│ Attempts    │  │ 3. Check Rapid Logins   │
│ (3 in 15min)│  │ 4. Update Geo Profile   │
└────┬────────┘  └───────────┬─────────────┘
     │                       │
     └───────────┬───────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Any Fraud    │
         │  Detected?    │
         └───────┬───────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    ┌─────────┐    ┌──────────┐
    │  Yes    │    │   No     │
    └────┬────┘    └──────────┘
         │
         ▼
┌─────────────────┐
│  Flag Fraud     │
│  Store in DB    │
│  Log Event      │
└─────────────────┘
```

### Security Flow

```
Request → Rate Limiter → Validation → Authentication
    ↓
Controller → Service → Database
    ↓
Fraud Detection (Async)
    ↓
Audit Logging
    ↓
Response
```

### Data Protection

```
Sensitive Data Flow:
    ↓
Password: Never logged, hashed before storage
    ↓
JWT Token: Stored in localStorage (frontend), validated on each request
    ↓
MFA Secret: Stored encrypted, never returned after initial setup
    ↓
IP Address: Logged for security, used for fraud detection
    ↓
Geolocation: Derived from IP, stored for pattern analysis
```

---

## Best Practices Implemented

### 1. SOLID Principles
- **Single Responsibility**: Each service/controller has one job
- **Open/Closed**: Extensible without modification
- **Liskov Substitution**: Proper inheritance patterns
- **Interface Segregation**: Focused interfaces
- **Dependency Inversion**: Dependencies on abstractions

### 2. Security Best Practices
- ✅ Password hashing (bcrypt)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ Rate limiting
- ✅ Account lockout
- ✅ MFA implementation
- ✅ Audit logging
- ✅ Secure headers (Helmet.js)
- ✅ CORS configuration

### 3. Error Handling
- Comprehensive error logging
- User-friendly error messages
- Security-conscious error responses (don't reveal user existence)
- Graceful degradation

### 4. Performance
- Async fraud detection (non-blocking)
- Database indexing
- Efficient queries
- Connection pooling

---

## Conclusion

This banking authentication system provides:

1. **Secure Authentication**: Multi-factor authentication with strong password requirements
2. **Advanced Fraud Detection**: Real-time monitoring with multiple detection rules
3. **Comprehensive Logging**: Complete audit trail for compliance
4. **Scalable Architecture**: Clean separation of concerns, easy to extend
5. **Production Ready**: Error handling, rate limiting, security best practices

The system is designed to protect customer assets while maintaining usability and providing detailed security insights.

---

## Appendix: Configuration

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=banking_auth
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRES_IN=24h

# Security
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_REQUESTS=true
LOG_QUERIES=false
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**System Version**: 1.0.0




