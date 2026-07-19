# GamerShield Firestore Security Rules Specification

This document outlines the security architecture, data invariants, adversarial payload analysis (the "Dirty Dozen"), and verification testing strategy for GamerShield.

## 1. Data Invariants

1. **Game Account Listings (`listings/{listingId}`)**:
   - Must contain valid game type, title, price, level, rank, skinsCount, characters list, status, credentials map, and stats (likes/views).
   - Price must be a non-negative number.
   - Status must only transition from 'available' to 'sold'. Once 'sold', the status cannot transition back.
   - `buyerEmail` can only be set during the transition of status to 'sold'.
   - Immutable fields once created: `game`, `sellerEmail`, `createdAt`.
   - Credentials map must contain `email` and `pass` strings.

2. **Verification Requests (`verification_requests/{requestId}`)**:
   - Must contain valid `sellerEmail`, `sellerName`, `documentType`, `documentNumber`, and `status`.
   - Status must be 'pending', 'approved', or 'rejected'.

---

## 2. The "Dirty Dozen" Payloads

Here are twelve adversarial payloads designed to test and breach GamerShield's identity, integrity, and state transition laws.

### Payload 1: Missing Mandatory Field (Listing)
- **Breach Intent**: Bypasses schema validation by omitting the `credentials` map.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Malicious Listing",
    "description": "No credentials map",
    "price": 0,
    "level": 50,
    "rank": "Heroic",
    "skinsCount": 10,
    "characters": ["Alok"],
    "verified": false,
    "sellerVerified": false,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 2: Massive Volumetric Resource Poisoning (Listing Title)
- **Breach Intent**: Attempts "Denial of Wallet" and storage exploitation by submitting a title greater than 200 characters.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "description": "Massive title test",
    "price": 10,
    "level": 50,
    "rank": "Heroic",
    "skinsCount": 10,
    "characters": ["Alok"],
    "verified": false,
    "sellerVerified": false,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 3: Negative Price Exploit
- **Breach Intent**: Creates a listing with a negative price to disrupt payment processing logic.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Super Promo",
    "description": "Free Fire ID",
    "price": -100,
    "level": 50,
    "rank": "Heroic",
    "skinsCount": 10,
    "characters": ["Alok"],
    "verified": false,
    "sellerVerified": false,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 4: Injection of Arbitrary Extra Keys (Ghost Fields)
- **Breach Intent**: Injecting unmapped "isAdmin" privileges to hijack database configurations.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Pro Account",
    "description": "Legendary skins",
    "price": 50,
    "level": 60,
    "rank": "Heroic",
    "skinsCount": 20,
    "characters": ["Alok"],
    "verified": true,
    "sellerVerified": true,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0,
    "isSystemAdmin": true
  }
  ```

### Payload 5: Type Poisoning (Skins Count as Boolean)
- **Breach Intent**: Violates strict type rules by sending an unexpected boolean for skinsCount.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Nice ID",
    "description": "Emotes unlocked",
    "price": 10,
    "level": 50,
    "rank": "Heroic",
    "skinsCount": true,
    "characters": ["Alok"],
    "verified": false,
    "sellerVerified": false,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 6: Mutating Immutable Creation Timestamp
- **Breach Intent**: Attempts to overwrite `createdAt` timestamp during an update.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Pro Account Updated",
    "description": "Legendary skins",
    "price": 50,
    "level": 60,
    "rank": "Heroic",
    "skinsCount": 20,
    "characters": ["Alok"],
    "verified": true,
    "sellerVerified": true,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2020-01-01T00:00:00Z",
    "status": "available",
    "likes": 1,
    "views": 1
  }
  ```

### Payload 7: Unauthorized Price Manipulation on Update
- **Breach Intent**: Alters the listing price on an active available listing during an update (which should only alter likes, views, or status).
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Pro Account",
    "description": "Legendary skins",
    "price": 1,
    "level": 60,
    "rank": "Heroic",
    "skinsCount": 20,
    "characters": ["Alok"],
    "verified": true,
    "sellerVerified": true,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 8: Mutating Credentials After Purchase
- **Breach Intent**: Tries to overwrite credentials after the listing is marked as sold.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Pro Account",
    "description": "Legendary skins",
    "price": 50,
    "level": 60,
    "rank": "Heroic",
    "skinsCount": 20,
    "characters": ["Alok"],
    "verified": true,
    "sellerVerified": true,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "stolen@gmail.com", "pass": "hacked123" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "sold",
    "buyerEmail": "buyer@gmail.com",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 9: Illegal Status Transition (Sold to Available)
- **Breach Intent**: Attempts to bypass the purchase cycle by reverting a listing from 'sold' to 'available'.
- **Payload**:
  ```json
  {
    "game": "Free Fire",
    "title": "Pro Account",
    "description": "Legendary skins",
    "price": 50,
    "level": 60,
    "rank": "Heroic",
    "skinsCount": 20,
    "characters": ["Alok"],
    "verified": true,
    "sellerVerified": true,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

### Payload 10: Injecting Malicious Script in Selfie URL (KYC Verification Request)
- **Breach Intent**: Storing cross-site scripting attack vectors inside a verification request.
- **Payload**:
  ```json
  {
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "documentType": "Aadhar Card",
    "documentNumber": "1234-5678-9012",
    "status": "approved",
    "createdAt": "2026-07-14T11:48:38Z",
    "selfieUrl": "javascript:alert('XSS')"
  }
  ```

### Payload 11: Invalid Verification Status (Spoofed Verification)
- **Breach Intent**: Creates a verification request directly as 'approved' bypassing administrative checks.
- **Payload**:
  ```json
  {
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "documentType": "Aadhar Card",
    "documentNumber": "1234-5678-9012",
    "status": "approved",
    "createdAt": "2026-07-14T11:48:38Z"
  }
  ```

### Payload 12: Invalid Game Type Listing
- **Breach Intent**: Bypasses allowed games listing constraint by specifying an unsupported game.
- **Payload**:
  ```json
  {
    "game": "Invalid Super Game Pro",
    "title": "Nice Account",
    "description": "Game details",
    "price": 10,
    "level": 50,
    "rank": "Heroic",
    "skinsCount": 10,
    "characters": ["Alok"],
    "verified": false,
    "sellerVerified": false,
    "sellerEmail": "scammer@gmail.com",
    "sellerName": "Scammer",
    "credentials": { "email": "test@test.com", "pass": "secret" },
    "createdAt": "2026-07-14T11:48:38Z",
    "status": "available",
    "likes": 0,
    "views": 0
  }
  ```

---

## 3. Test Runner Design

While standard environments compile tests in Node, our production verification will run via direct client-side simulated writes. If any of the dirty dozen payloads are attempted, Firestore must return an explicit access exception.
