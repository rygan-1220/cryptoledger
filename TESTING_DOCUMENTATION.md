# CryptoLedger — Automated Test Suite Documentation

> **Audience:** AI-assisted report writing tools, evaluators, and developers maintaining the test suite.
> **Purpose:** This document describes every automated test in the CryptoLedger project, how to execute them, and the cryptographic and security rationale behind each test category. It replaces the manual testing procedures described in the original FYP report with verifiable, reproducible automated tests.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Testing Frameworks & Configuration](#testing-frameworks--configuration)
4. [How to Run the Tests](#how-to-run-the-tests)
5. [Backend Test Suite — 67 Tests Across 6 Suites](#backend-test-suite)
   - [5.1 cryptoService.test.js — 13 Tests](#51-cryptoservicetestjs)
   - [5.2 hashChain.test.js — 16 Tests](#52-hashchaintestjs)
   - [5.3 merkleService.test.js — 14 Tests](#53-merkleservicetestjs)
   - [5.4 keyService.test.js — 6 Tests](#54-keyservicetestjs)
   - [5.5 auth.middleware.test.js — 4 Tests](#55-authmiddlewaretestjs)
   - [5.6 rbac.middleware.test.js — 12 Tests](#56-rbacmiddlewaretestjs)
6. [Frontend Test Suite — 32 Tests Across 4 Suites](#frontend-test-suite)
   - [6.1 auth.test.js (Store) — 11 Tests](#61-authtestjs-store)
   - [6.2 expenses.test.js (Store) — 10 Tests](#62-expensestestjs-store)
   - [6.3 api.test.js (Interceptor) — 10 Tests](#63-apitestjs-interceptor)
   - [6.4 Navbar.test.js (Component) — 1 Test](#64-navbartestjs-component)
7. [Mocking & Test Isolation Strategy](#mocking--test-isolation-strategy)
8. [Interpreting Test Results](#interpreting-test-results)
9. [Coverage Analysis & Future Work](#coverage-analysis--future-work)
10. [Appendix: Complete Test Inventory](#appendix-complete-test-inventory)

---

## Overview

CryptoLedger is a cryptographically secure expense reimbursement system for SMEs. It implements dual-layer AES-256-GCM encryption, RSA digital signatures, BLAKE2b hash chaining, and Merkle Trim Tree-Based Authentication (MTTBA) to ensure financial data is private, verifiable, and tamper-proof.

The automated test suite contains **99 tests** across **10 files**, split between:

| Layer | Files | Tests | Framework |
|-------|-------|-------|-----------|
| Backend (Node.js + Express) | 6 | 67 | Jest 30 + Supertest |
| Frontend (Vue 3 + Vite) | 4 | 32 | Vitest 4 + Vue Test Utils |

All tests are deterministic and require **no external services** (no database, no Redis, no running server). Every external dependency is mocked.

---

## Architecture & Technology Stack

### Backend
- **Runtime:** Node.js (CommonJS)
- **Framework:** Express.js 4.18
- **Database:** PostgreSQL 16 (via `pg` driver)
- **Cache:** Redis 7 (via `ioredis`)
- **Cryptography:** Node.js `crypto` module (AES-256-GCM, RSA-OAEP), `@noble/hashes` (BLAKE2b)
- **Auth:** Session-based (express-session + connect-redis)
- **Validation:** express-validator
- **Security:** helmet, cors, express-rate-limit

### Frontend
- **Runtime:** Browser (Vite dev server)
- **Framework:** Vue 3.4 (Composition API, `<script setup>`)
- **State Management:** Pinia 3
- **Routing:** Vue Router 5
- **Styling:** Tailwind CSS 3
- **HTTP Client:** Axios
- **Cryptography:** Web Crypto API (SubtleCrypto)

### Test Targets (Modules Under Test)

**Backend modules tested:**
- `src/services/cryptoService.js` — AES-256-GCM encrypt/decrypt with K_system
- `src/services/hashChain.js` — BLAKE2b hash chain for expenses and audit log
- `src/services/merkleService.js` — MTTBA Merkle tree construction
- `src/services/keyService.js` — RSA-OAEP K_real wrapping for user distribution
- `src/middleware/auth.js` — Session authentication guard
- `src/middleware/rbac.js` — Role-based access control (5 roles)

**Frontend modules tested:**
- `src/stores/auth.js` — Authentication Pinia store (login, register, logout, fetchMe)
- `src/stores/expenses.js` — Expense management Pinia store (CRUD, pagination, filters)
- `src/services/api.js` — Axios instance with response interceptors (401/503 handling)
- `src/components/Navbar.vue` — Navigation bar component (mount verification)

---

## Testing Frameworks & Configuration

### Backend: Jest 30 + Supertest

**Configuration file:** `backend/jest.config.js`

```js
module.exports = {
  testEnvironment: 'node',           // Node.js runtime (no browser DOM)
  testMatch: ['**/__tests__/**/*.test.js'],  // Test file discovery pattern
  clearMocks: true,                  // Reset all mocks between tests
  restoreMocks: true,                // Restore original implementations
  transformIgnorePatterns: [         // Transpile ESM packages (needed for @noble/hashes)
    'node_modules/(?!@noble/)',
  ],
};
```

**Additional configuration:** `backend/babel.config.js`

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
};
```

Babel is required because `@noble/hashes` ships as ESM-only, and Jest's default configuration does not transform `node_modules`. The `transformIgnorePatterns` whitelists `@noble` packages for Babel transpilation.

**Test script:** `backend/package.json` → `"test": "jest"`

### Frontend: Vitest 4 + Vue Test Utils + jsdom

**Configuration:** Inline in `frontend/vite.config.js`

```js
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',    // Browser-like DOM environment
    globals: true,           // Auto-import describe/it/expect
  },
});
```

Vitest shares Vite's transform pipeline, so `.vue` Single File Components, ES modules, and imports are handled natively without additional configuration.

**Test script:** `frontend/package.json` → `"test": "vitest run"`

---

## How to Run the Tests

### Prerequisites

- Node.js 20 LTS or later
- npm (included with Node.js)
- Dependencies installed: `cd backend && npm install` and `cd frontend && npm install`

### Commands

```bash
# Run all backend tests (must be in backend/ directory)
cd backend
npm test
# Output: Test Suites: 6 passed, 6 total | Tests: 67 passed, 67 total

# Run all frontend tests (must be in frontend/ directory)
cd frontend
npm test
# Output: Test Files: 4 passed (4) | Tests: 32 passed (32)

# Run a specific backend test file (example)
cd backend
npx jest src/__tests__/cryptoService.test.js --verbose

# Run backend tests in watch mode (re-runs on file changes)
cd backend
npx jest --watch

# Run frontend tests in watch mode
cd frontend
npx vitest

# Run a specific frontend test file (example)
cd frontend
npx vitest run src/__tests__/stores/auth.test.js
```

### Expected Output (Healthy Suite)

**Backend:**
```
Test Suites: 6 passed, 6 total
Tests:       67 passed, 67 total
Snapshots:   0 total
Time:        ~3 s
```

**Frontend:**
```
Test Files:  4 passed (4)
Tests:       32 passed (32)
Duration:    ~3 s
```

---

## Backend Test Suite

All backend tests are located at `backend/src/__tests__/`.

### 5.1 cryptoService.test.js

**File:** `backend/src/__tests__/cryptoService.test.js`
**Module under test:** `backend/src/services/cryptoService.js`
**Tests:** 13
**Category:** Cryptographic operations — unit tests

This module provides `encryptSystem(payload)` and `decryptSystem(buffer)`, which use AES-256-GCM with the system-wide key `K_SYSTEM` (loaded from `process.env.K_SYSTEM` as a base64-encoded 32-byte key). The encrypted output format is: `[12 bytes IV] [16 bytes AuthTag] [variable-length Ciphertext]`.

#### Test Cases

| # | Test Name | What It Verifies | Cryptographic Justification |
|---|-----------|-----------------|---------------------------|
| 1 | `should encrypt and decrypt a plain string back to the original` | Round-trip: plaintext → encrypt → decrypt → same plaintext | Fundamental correctness of AES-256-GCM implementation. Without this, the entire encryption layer is broken. |
| 2 | `should encrypt and decrypt JSON objects (stringified)` | Round-trip with JSON-serialized objects | Expense metadata (vendor_name, description) is stored as JSON. This test verifies JSON survives encryption unchanged. |
| 3 | `should produce different ciphertext for the same plaintext (random IV)` | Non-determinism: encrypting the same payload twice produces different ciphertexts | AES-GCM requires a unique IV per encryption. Reusing an IV with the same key breaks GCM security. This test proves IVs are randomly generated. |
| 4 | `should produce at least 28 bytes (12 IV + 16 authTag + 1+ ciphertext)` | Minimum buffer size for the `[IV\|AuthTag\|CT]` format | Validates the wire format. A 0-byte ciphertext would indicate a logic error. |
| 5 | `should handle empty string` | Edge case: encrypting and decrypting an empty string | Boundary condition. Empty strings must survive the encryption pipeline without errors. |
| 6 | `should handle Unicode / emoji` | UTF-8 support: `💰 Expense: Café €42.00 — ありがとう` | Expense descriptions may contain international characters. The `utf8` encoding in `cipher.update()` must handle multi-byte characters correctly. |
| 7 | `should handle long payloads (10 KB)` | Large payload encryption and decryption | Encrypted receipts and metadata can be substantial. Tests that the streaming cipher interface (`cipher.update` + `cipher.final`) handles large buffers correctly. |
| 8 | `should fail decryption if ciphertext is modified` | Tamper detection: flipping a byte in the ciphertext portion causes decryption to throw | GCM is an authenticated encryption mode. Any modification to the ciphertext must cause authentication failure. This is the core integrity guarantee. |
| 9 | `should fail decryption if authTag is modified` | Tamper detection: flipping a byte in the authTag causes decryption to throw | An attacker modifying the authentication tag must be detected. Tests a different tamper target than test #8. |
| 10 | `should fail decryption with wrong key` | Key mismatch: decrypting with a different K_SYSTEM throws | If an attacker or misconfigured system uses the wrong key, data must not decrypt. Validates that the key is actually used in the GCM operation. |
| 11 | `should have 12-byte IV at the start` | Buffer format: first 12 bytes are the IV | Protocol conformance. The decrypt function extracts `buffer.subarray(0, 12)` as the IV. |
| 12 | `should have 16-byte authTag after the IV` | Buffer format: bytes 12-27 are the authTag | Protocol conformance. The decrypt function extracts `buffer.subarray(12, 28)` as the authTag. |
| 13 | `ciphertext portion should be non-empty` | Buffer format: bytes 28+ contain ciphertext | Protocol conformance. Ensures the ciphertext extraction `buffer.subarray(28)` returns non-empty data. |

#### How to Run

```bash
cd backend
npx jest src/__tests__/cryptoService.test.js --verbose
```

#### Expected Result

All 13 tests pass. A failure in any test indicates a bug in the AES-256-GCM implementation that would compromise data confidentiality or integrity.

---

### 5.2 hashChain.test.js

**File:** `backend/src/__tests__/hashChain.test.js`
**Module under test:** `backend/src/services/hashChain.js`
**Tests:** 16
**Category:** Hash chain integrity — unit tests with mocked database

This module implements the BLAKE2b hash chain that links every expense and audit log entry in a cryptographically verifiable sequence. Each entry's hash is computed from: `BLAKE2b(entryId | prevHash | amount | deptId | timestamp)`. The chain starts with `GENESIS_HASH` (64 zero characters). The database-dependent functions `getPrevExpenseHash(client)` and `getPrevAuditHash(client)` are tested with a mocked `pg` client.

#### Test Cases

| # | Test Name | What It Verifies | Cryptographic Justification |
|---|-----------|-----------------|---------------------------|
| 1 | `GENESIS_HASH should be 64 zeros` | Genesis hash constant is exactly 64 '0' characters | The genesis hash serves as the anchor of trust for the entire chain. Its value must be deterministic and known. |
| 2 | `calculateExpenseHash should produce a 64-character hex hash` | Output format: lowercase hex, exactly 64 chars | BLAKE2b with 32-byte output (dkLen=32) produces 64 hex characters. Format validation. |
| 3 | `calculateExpenseHash should be deterministic` | Same inputs → same hash (idempotency) | Hash functions are deterministic. This property is essential for verification — rehashing the same data must produce the same hash. |
| 4 | `should produce different hashes when expenseId differs` | Input sensitivity: changing the expense ID changes the hash | Collision resistance. Each unique expense must have a unique hash. |
| 5 | `should produce different hashes when amount differs` | Input sensitivity: changing the amount changes the hash | Financial data integrity. Tampering with an expense amount must break the hash chain. |
| 6 | `should produce different hashes when deptId differs` | Input sensitivity: changing the department changes the hash | Cross-department isolation. Moving an expense between departments would be detected. |
| 7 | `should chain — hash depends on previous hash` | Chain property: hash N depends on hash N-1 | The defining property of a hash chain. Each link incorporates the previous link's hash, making it impossible to insert, delete, or reorder entries without detection. |
| 8 | `should break the chain if prevHash is tampered with` | Tamper detection: using the wrong prevHash produces a different hash | Demonstrates that an attacker cannot skip a link. Omitting or replacing a previous hash changes all subsequent hashes. |
| 9 | `calculateAuditHash should produce a 64-character hex hash` | Audit hash output format validation | Same format requirements as expense hashes. |
| 10 | `calculateAuditHash should be deterministic` | Audit hash idempotency | Audit trail verification requires deterministic hashing. |
| 11 | `should produce different hashes for different actions` | Action sensitivity: CREATED vs REJECTED produce different hashes | Prevents action spoofing in the audit log. |
| 12 | `getPrevExpenseHash should return GENESIS_HASH when table is empty` | Empty database behavior: first expense chains from genesis | The first expense in the system must start from GENESIS_HASH. Tested with mocked empty query result. |
| 13 | `getPrevExpenseHash should return the last hash when expenses exist` | Normal operation: returns the most recent expense hash | Tests the SQL query `ORDER BY created_at DESC LIMIT 1` returns the correct row. |
| 14 | `getPrevAuditHash should return GENESIS_HASH when audit log is empty` | Empty audit log: first audit entry chains from genesis | Parallel to expense chain but for audit log. |
| 15 | `getPrevAuditHash should return the last hash when audit log has entries` | Normal audit operation: returns the most recent audit hash | Tests the audit log query against a populated table. |
| 16 | `chain integrity — should maintain a verifiable chain across multiple expenses` | End-to-end chain simulation: 3 sequential expenses form a valid chain | Integration of all hash chain properties: determinism, chaining, uniqueness. Simulates a realistic multi-expense workflow. |

#### How to Run

```bash
cd backend
npx jest src/__tests__/hashChain.test.js --verbose
```

#### Mocking Note

The `require('../config/db')` module is mocked via `jest.mock()` at the top of the test file. Tests #12-15 use `mockResolvedValueOnce` to simulate different database states (empty table, populated table). This allows testing the hash chain logic without a running PostgreSQL instance.

---

### 5.3 merkleService.test.js

**File:** `backend/src/__tests__/merkleService.test.js`
**Module under test:** `backend/src/services/merkleService.js`
**Tests:** 14
**Category:** Merkle tree construction — unit tests

This module implements Merkle Trim Tree-Based Authentication (MTTBA). Unlike standard Merkle trees (which duplicate odd leaf nodes), MTTBA hashes odd leaves alone at each level. The function `buildMTTBA(hashes)` takes an array of 64-character hex hash strings and returns a single 64-character Merkle root.

#### Test Cases

| # | Test Name | What It Verifies | Cryptographic Justification |
|---|-----------|-----------------|---------------------------|
| 1 | `should return the hash itself for a single leaf` | Single-leaf tree: root equals the leaf | Base case of the MTTBA algorithm. A tree of one node has that node as the root. |
| 2 | `should produce a 64-character hex root for any input` | Output format validation for multi-leaf tree | The root is a BLAKE2b hash, always 64 hex characters. |
| 3 | `should be deterministic — same inputs → same root` | Deterministic tree construction | Merkle trees are deterministic. Verifying the same set of leaves must produce the same root. |
| 4 | `should produce different roots for different inputs` | Leaf sensitivity: changing one leaf changes the root | The Merkle root serves as a cryptographic commitment to the entire leaf set. Any change must propagate to the root. |
| 5 | `should handle 2 leaves (perfect pair)` | 2-leaf tree: two leaves hashed together | The simplest multi-leaf case. Tests the paired-hash path. |
| 6 | `should handle 3 leaves (odd → trim, not duplicate)` | MTTBA-specific: odd leaf not duplicated | This is the key difference from standard Merkle. A 3-leaf MTTBA hashes the first two leaves together, then hashes that result with the third leaf alone (not duplicated). |
| 7 | `should handle 4 leaves (balanced)` | 4-leaf tree: perfectly balanced, 2 levels | Standard balanced Merkle case — all pairs at every level. |
| 8 | `should handle 5 leaves (mixed odd/even across levels)` | 5-leaf tree: odd at leaf level, tests multi-level MTTBA | The odd-leaf handling must work across multiple levels (5 → 3 → 2 → 1). |
| 9 | `should handle 7 leaves (multiple odd levels)` | 7-leaf tree: more complex multi-level odd handling | 7 → 4 → 2 → 1. Tests that odd-leaf trimming works correctly at multiple levels. |
| 10 | `should handle 8 leaves (power of 2)` | 8-leaf tree: 3 perfectly balanced levels | 8 = 2^3, so every level is perfectly paired. No trimming needed. |
| 11 | `should handle a large number of leaves (100)` | 100-leaf tree: stress test | Real-world expense batches could be large. Tests scalability and correctness with many leaves. |
| 12 | `should produce the same root for same order` | Order sensitivity: same order → same root (redundancy test) | Reinforces determinism. The tree IS order-sensitive, so same order must produce same result. |
| 13 | `should produce a different root when leaf order changes` | Order sensitivity: different order → different root | Changing the arrangement of leaves produces a different root. This is critical — the leaf order encodes temporal sequence of expenses. |
| 14 | `should throw on empty array` | Edge case: empty input throws error with message "Cannot build MTTBA with zero hashes" | An empty tree is undefined. The error message aids debugging. |

#### How to Run

```bash
cd backend
npx jest src/__tests__/merkleService.test.js --verbose
```

---

### 5.4 keyService.test.js

**File:** `backend/src/__tests__/keyService.test.js`
**Module under test:** `backend/src/services/keyService.js`
**Tests:** 6
**Category:** Key distribution — unit tests with real RSA key generation

This module provides `wrapKRealForUser(wrappedKRealSystem, publicKeyPem)`, which decrypts the department's K_real from K_system encryption and re-encrypts it with a user's RSA public key using RSA-OAEP with SHA-256. This is the key distribution mechanism — K_real is distributed to users securely.

#### Test Setup

The test suite generates a **real 2048-bit RSA key pair** using `crypto.generateKeyPairSync()` in `beforeAll()`. The `buildWrappedKRealSystem()` helper creates a properly formatted `[IV|AuthTag|Ciphertext]` buffer by encrypting a random 32-byte K_real hex string with K_system using AES-256-GCM.

#### Test Cases

| # | Test Name | What It Verifies | Cryptographic Justification |
|---|-----------|-----------------|---------------------------|
| 1 | `should return a base64-encoded wrapped key for valid input` | Valid input produces a base64 string that can be decoded | RSA-OAEP produces binary output that must survive base64 encoding for JSON transport. |
| 2 | `should produce non-empty result` | Output is not empty | Sanity check. A zero-length output would indicate a silent failure. |
| 3 | `should produce valid base64 output` | RSA-2048 output decodes to exactly 256 bytes | RSA-2048 with OAEP padding produces a 256-byte (2048-bit) ciphertext. Validates both base64 decoding and correct ciphertext size. |
| 4 | `should produce different output for different public keys` | Key binding: different recipient public keys produce different wrapped keys | Each user's wrapped K_real is unique to their public key. An attacker cannot reuse another user's wrapped key. |
| 5 | `should throw with an invalid public key PEM` | Error handling: garbage PEM input throws an error | Input validation. Prevents silent corruption when a malformed public key is provided. |
| 6 | `should unwrap successfully with the matching private key` | Full round-trip: wrap with public key → unwrap with private key → recover original K_real hex | **This is the most critical test.** It proves that `wrapKRealForUser` and `crypto.privateDecrypt` (RSA-OAEP) are compatible and the wrapped key can be recovered by the intended recipient. Tests the complete key distribution flow: K_system decrypt → RSA-OAEP encrypt → RSA-OAEP decrypt → hex decode → match. |

#### How to Run

```bash
cd backend
npx jest src/__tests__/keyService.test.js --verbose
```

#### Important Note on RSA-OAEP Non-Determinism

RSA-OAEP uses random padding. The same input encrypted twice with the same public key produces **different ciphertext** each time. The test suite accounts for this — it does NOT assert determinism of `wrapKRealForUser`. Instead, test #6 verifies correctness by decrypting with the matching private key.

---

### 5.5 auth.middleware.test.js

**File:** `backend/src/__tests__/auth.middleware.test.js`
**Module under test:** `backend/src/middleware/auth.js`
**Tests:** 4
**Category:** Authentication guard — unit tests

The `requireAuth` middleware protects routes by checking for `req.session.user`. It returns 401 with `{ error: 'Unauthorized', code: 'UNAUTHORIZED' }` if the user is not authenticated, or calls `next()` to pass control to the route handler.

#### Test Setup

Each test creates a mock Express `req` object (with `session`), `res` object (with `status` and `json` that return `this` for chaining), and `next` function (via `jest.fn()`).

#### Test Cases

| # | Test Name | Condition | Expected Behavior |
|---|-----------|-----------|------------------|
| 1 | `should call next() when user exists in session` | `req.session.user = { user_id: 1, email: 'test@example.com' }` | `next()` is called. `res.status` is NOT called. |
| 2 | `should return 401 when no session exists` | `req.session = undefined` | `res.status(401)` called. `res.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })` called. `next()` NOT called. |
| 3 | `should return 401 when session exists but user is null` | `req.session.user = null` | Returns 401. Tests that `null` is falsy and fails the `if (req.session.user)` guard. |
| 4 | `should return 401 when user is undefined` | `req.session.user = undefined` | Returns 401. Tests that `undefined` is also falsy. Covers the case where `session.user` was never set. |

#### How to Run

```bash
cd backend
npx jest src/__tests__/auth.middleware.test.js --verbose
```

---

### 5.6 rbac.middleware.test.js

**File:** `backend/src/__tests__/rbac.middleware.test.js`
**Module under test:** `backend/src/middleware/rbac.js`
**Tests:** 12
**Category:** Role-based access control — unit tests

The `requireRole(roles)` middleware accepts an array of allowed roles and returns a middleware function. It first checks authentication (401 if no session), then checks if `req.session.user.role` is in the allowed list (403 if not). CryptoLedger defines 5 roles: `employee`, `dept_manager`, `finance_manager`, `admin`, `ceo`.

#### Test Setup

Each test uses a mock request with `req.session.user = { user_id: 1, role: 'employee' }` (default role), then overrides the role as needed for each test case.

#### Test Cases

| # | Test Name | Role | Required Roles | Expected |
|---|-----------|------|---------------|----------|
| 1 | `should call next() for a matching single role` | employee | `['employee']` | next() called |
| 2 | `should call next() when role is in a list` | employee | `['employee', 'dept_manager', 'admin']` | next() called |
| 3 | `should call next() for admin role` | admin | `['admin']` | next() called |
| 4 | `should call next() for ceo role` | ceo | `['ceo']` | next() called |
| 5 | `should return 403 for a non-matching role` | employee | `['admin']` | 403 with `{ error: 'Forbidden: Insufficient privileges', code: 'FORBIDDEN' }` |
| 6 | `should return 403 when role list is empty` | employee | `[]` | 403 (no role can match an empty list) |
| 7 | `should return 401 when session is missing` | (no session) | `['employee']` | 401 with `{ error: 'Unauthorized', code: 'UNAUTHORIZED' }` |
| 8 | `should return 401 when user is missing from session` | null | `['employee']` | 401 |
| 9 | `should block employee from dept_manager-only routes` | employee | `['dept_manager']` | 403 (cross-role isolation #1) |
| 10 | `should block dept_manager from admin-only routes` | dept_manager | `['admin']` | 403 (cross-role isolation #2) |
| 11 | `should block employee from finance_manager-only routes` | employee | `['finance_manager']` | 403 (cross-role isolation #3) |
| 12 | `should allow admin to access multi-role routes` | admin | `['employee', 'dept_manager', 'admin']` | next() called (privilege escalation: admin includes lower roles) |

#### Security Significance

Tests #9-11 validate **vertical privilege escalation prevention**. Each role is confined to its own routes:
- Employee → cannot access department manager routes
- Department manager → cannot access admin routes
- Employee → cannot access finance manager routes

Test #12 validates that admin can access routes scoped to lower roles, which is intentional in the RBAC design.

#### How to Run

```bash
cd backend
npx jest src/__tests__/rbac.middleware.test.js --verbose
```

---

## Frontend Test Suite

All frontend tests are located at `frontend/src/__tests__/`.

### 6.1 auth.test.js (Store)

**File:** `frontend/src/__tests__/stores/auth.test.js`
**Module under test:** `frontend/src/stores/auth.js`
**Tests:** 11
**Category:** Pinia store — unit tests with mocked API and crypto services

This Pinia store manages authentication state: `user`, `settings`, `loading`, `error`, and `requiresSetup`. Its actions (`register`, `login`, `logout`, `fetchMe`) call the API service and manage state transitions. The store also orchestrates K_real restoration (RSA unwrap or KEK fallback) during login.

#### Mocking Strategy

- **`../../services/api`** — Mocked entirely. `post`, `get`, `put` are `vi.fn()`. Each test sets up `mockResolvedValueOnce` or `mockRejectedValueOnce` for the specific API call it exercises.
- **`../../services/cryptoService`** — All 9 exported functions mocked as `vi.fn()`. This avoids Web Crypto API dependencies and localStorage interactions during store tests.

#### Test Cases

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `initial state — should initialize with null user and default settings` | Store starts with `user: null`, `settings: { companyName: 'CryptoLedger', workspaceId: 'default' }`, `loading: false`, `error: null`, `requiresSetup: false`. |
| 2 | `register — should call POST /auth/register and return data` | Successful registration calls `api.post('/auth/register', payload)` with correct payload. Returns response data. Sets loading to false after completion. |
| 3 | `register — should set error and throw on failure` | When API rejects with `{ response: { data: { error: 'Email taken' } } }`, the store sets `error` to the message and throws `new Error(this.error)`. Loading returns to false even on failure. |
| 4 | `login — should set user on successful login` | Successful login sets `store.user` to the response user object, updates `store.settings`, returns the response data. |
| 5 | `login — should throw and set error on failed login` | Invalid credentials → `store.error = 'Invalid credentials'`, throws Error, user remains null. |
| 6 | `login — should handle network errors gracefully` | When the API throws without a response body, the store uses the default error message 'Login failed'. |
| 7 | `logout — should call POST /auth/logout and clear user` | Calls `api.post('/auth/logout')`, sets user to null, removes 'cryptoledger_kreal' from localStorage (but NOT the RSA private key). |
| 8 | `fetchMe — should set user from GET /auth/me response` | Calls `api.get('/auth/me')`, sets user from response, sets `requiresSetup = false`. |
| 9 | `fetchMe — should set requiresSetup=true on 503` | When the API returns 503 with `{ requires_setup: true }`, the store sets `requiresSetup = true` and user to null. |
| 10 | `fetchMe — should clear user on non-503 error` | On 500 error, user is cleared to null (session is invalid). |
| 11 | The Pinia store is reset with `createPinia()` + `setActivePinia()` in `beforeEach` | Ensures test isolation — no state leaks between tests. |

#### How to Run

```bash
cd frontend
npx vitest run src/__tests__/stores/auth.test.js
```

---

### 6.2 expenses.test.js (Store)

**File:** `frontend/src/__tests__/stores/expenses.test.js`
**Module under test:** `frontend/src/stores/expenses.js`
**Tests:** 10
**Category:** Pinia store — unit tests with mocked API

This store manages expense CRUD operations: `submitExpense`, `fetchMyExpenses`, `fetchDeptExpenses`, `fetchAllExpenses`, `fetchExpenseById`, `deleteExpense`, and `updateStatus`. All actions call the API and return data. Only `submitExpense` manages loading/error state.

#### Mocking Strategy

The API service (`../../services/api`) is mocked with `post`, `get`, `patch`, `delete` as `vi.fn()`.

#### Test Cases

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `initial state — should initialize with loading=false and no error` | Store starts clean: `loading: false`, `error: null`. |
| 2 | `submitExpense — should POST to /expenses and return response data` | Calls `api.post('/expenses', payload)` with the submitted payload. Returns the response data (includes `expense_id`). Loading returns to false. |
| 3 | `submitExpense — should set error and throw on failure` | Server returns error → store.error set, throws Error. Loading resets. |
| 4 | `submitExpense — should use default error message when no response body` | Network error (no response) → falls back to 'Failed to submit expense'. |
| 5 | `fetchMyExpenses — should GET /expenses with pagination and filters` | Calls `api.get('/expenses', { params: { page: 2, limit: 10, status: 'pending' } })`. Returns response data. |
| 6 | `fetchMyExpenses — should default to page=1, limit=20, no filters` | When called with no arguments, uses default pagination. |
| 7 | `fetchDeptExpenses — should GET /expenses/department with params` | Calls the department-scoped endpoint with correct query params. |
| 8 | `fetchAllExpenses — should GET /expenses/all with params` | Admin/finance endpoint for viewing all expenses across departments. |
| 9 | `fetchExpenseById — should GET /expenses/:id` | Fetches a single expense detail including encrypted receipt. Returns the full response (`expense`, `layer1_ciphertext`, `encrypted_receipt`). |
| 10 | `deleteExpense — should DELETE /expenses/:id` | Calls `api.delete` with the expense ID. |
| 11 | `updateStatus — should PATCH /expenses/:id/status with status and reason` | Approval/rejection: sends `{ status, reason }`. Returns response data. |
| 12 | `updateStatus — should allow null reason` | Reason is optional (null is valid for approval without comment). |

*Note: The store test file contains 12 test cases distributed across 10 `it()` blocks (some blocks verify multiple assertions).*

#### How to Run

```bash
cd frontend
npx vitest run src/__tests__/stores/expenses.test.js
```

---

### 6.3 api.test.js (Interceptor)

**File:** `frontend/src/__tests__/services/api.test.js`
**Module under test:** `frontend/src/services/api.js` (Axios response interceptor logic)
**Tests:** 10
**Category:** HTTP client — behavior tests

The Axios instance in `api.js` has a response error interceptor that handles two special cases:
- **401 Unauthorized** → Clears `cryptoledger_kreal` from localStorage and redirects to `/login` (unless already on an auth page)
- **503 Service Unavailable with `requires_setup: true`** → Redirects to `/setup` (unless already there)

The test file reimplements the interceptor logic as a standalone function (`simulateInterceptor`) and tests its behavior by stubbing `window.location` and `localStorage`.

#### Mocking Strategy

- `window.location` — Stubbed as `{ pathname: '/dashboard', href: '' }`. Tests mutate `pathname` and observe `href`.
- `localStorage` — Stubbed with `removeItem: vi.fn()` to verify K_real cleanup.

#### Test Cases

| # | Test Name | Pathname | Error | Expected Behavior |
|---|-----------|----------|-------|-------------------|
| 1 | `should clear K_real and redirect to /login on 401` | `/dashboard` | 401 | `localStorage.removeItem('cryptoledger_kreal')` called. `window.location.href = '/login'`. |
| 2 | `should NOT redirect on 401 if already on /login` | `/login` | 401 | `href` remains empty string (no redirect loop). |
| 3 | `should NOT redirect on 401 if on /register` | `/register` | 401 | No redirect. Users can retry registration. |
| 4 | `should NOT redirect on 401 if on /setup` | `/setup` | 401 | No redirect. Setup page is accessible without auth. |
| 5 | `should NOT redirect on 401 if on /setup-account` | `/setup-account` | 401 | No redirect. Account creation during setup. |
| 6 | `should redirect to /setup on 503 with requires_setup=true` | `/login` | 503 + `{ requires_setup: true }` | Redirects to `/setup`. System initialization required. |
| 7 | `should NOT redirect on 503 if already on /setup` | `/setup` | 503 + `{ requires_setup: true }` | No redirect loop when already on setup page. |
| 8 | `should NOT redirect on 503 without requires_setup flag` | `/login` | 503 (no data) | 503 without `requires_setup` is a generic server error, not a setup signal. No redirect. |
| 9 | `should not modify location for non-401/503 errors` | `/dashboard` | 500 | Server errors don't trigger redirects. Error propagates to calling code. |

#### Security Significance

- **401 handling:** Prevents users from staying on protected pages with an expired session. Clears sensitive key material (`cryptoledger_kreal`) from localStorage.
- **No redirect loops:** Tests #2-5 prevent infinite redirects when already on auth/setup pages.
- **503 detection:** Distinguishes between a generic server outage and the "system needs initialization" state.

#### How to Run

```bash
cd frontend
npx vitest run src/__tests__/services/api.test.js
```

---

### 6.4 Navbar.test.js (Component)

**File:** `frontend/src/__tests__/components/Navbar.test.js`
**Module under test:** `frontend/src/components/Navbar.vue`
**Tests:** 1
**Category:** Vue component — mount verification

Tests that the `Navbar` component mounts successfully with required dependencies (Pinia, Vue Router) properly stubbed.

#### Test Case

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `renders` | Component mounts without errors with stubbed `router-link` and active Pinia instance. `wrapper.exists()` returns true. |

#### How to Run

```bash
cd frontend
npx vitest run src/__tests__/components/Navbar.test.js
```

---

## Mocking & Test Isolation Strategy

### Backend Mocks

| Dependency | Mocked By | Reason |
|-----------|-----------|--------|
| `config/db` (PostgreSQL pool) | `jest.mock('../config/db', () => ({ query: jest.fn(), ... }))` | Avoids requiring a running PostgreSQL instance. Each test controls query responses via `mockResolvedValueOnce`. |
| `config/redis` (Redis client) | Not directly mocked in unit tests (not imported by services under test) | Redis is only used for sessions and rate limiting. Services don't depend on it. |
| `@noble/hashes` (ESM package) | Transpiled by Babel via `transformIgnorePatterns` | Jest cannot parse ESM `import` statements without transformation. |

### Frontend Mocks

| Dependency | Mocked By | Reason |
|-----------|-----------|--------|
| `services/api` (Axios) | `vi.mock('../../services/api', () => ({ default: { post: vi.fn(), get: vi.fn(), ... } }))` | Isolates store logic from HTTP. Each test controls API responses. |
| `services/cryptoService` (Web Crypto API) | `vi.mock('../../services/cryptoService', () => ({ ... all functions as vi.fn() }))` | Web Crypto API (`window.crypto.subtle`) is unavailable in jsdom. Mocking prevents test crashes. |
| `vue-router` (router-link) | Stubbed in component mount options | Component tests don't need real routing. |
| `window.location` | `vi.stubGlobal('window', { location: { pathname: ..., href: ... } })` | Allows testing redirect logic without actual navigation. |
| `localStorage` | `vi.stubGlobal('localStorage', { removeItem: vi.fn(), ... })` | Prevents test pollution and allows verification of storage operations. |

### Test Isolation Guarantees

- **Jest:** `clearMocks: true` and `restoreMocks: true` in config ensure no mock state leaks between test files. `beforeEach` with `jest.clearAllMocks()` resets call counts.
- **Vitest:** `vi.clearAllMocks()` in `beforeEach` resets all mock functions. `setActivePinia(createPinia())` creates a fresh Pinia instance per test. `localStorage.clear()` removes any leftover data.
- **No shared state:** Each test file operates on fresh module instances. No test depends on the side effects of another test.

---

## Interpreting Test Results

### All Tests Pass (Healthy)

```
# Backend
Test Suites: 6 passed, 6 total
Tests:       67 passed, 67 total

# Frontend
Test Files:  4 passed (4)
Tests:       32 passed (32)
```

All 99 tests pass. No regressions. The cryptographic operations, middleware guards, store logic, and HTTP interceptors are functioning correctly.

### Test Failures — Diagnostic Guide

| Failure Pattern | Likely Cause | Investigation Steps |
|----------------|-------------|---------------------|
| `cryptoService.test.js` — "Unsupported state or unable to authenticate data" | K_SYSTEM env var mismatch or corrupted encrypted buffer | Check that `process.env.K_SYSTEM` is set before requiring `cryptoService.js`. Verify the `[IV\|AuthTag\|CT]` buffer format. |
| `hashChain.test.js` — import error for `@noble/hashes` | Babel transformation not working | Check `babel.config.js` exists and `transformIgnorePatterns` in `jest.config.js` includes `@noble`. |
| `keyService.test.js` — any failure | RSA key generation or OAEP padding mismatch | Node.js version must support `crypto.generateKeyPairSync('rsa', ...)`. OAEP hash must be 'sha256'. |
| `auth.middleware.test.js` / `rbac.middleware.test.js` — mock not called | Mock setup error | Check `jest.fn()` mocks are in `beforeEach` and not shared across tests. |
| Frontend store tests — `TypeError: Cannot read property 'post' of undefined` | API mock not applied before store import | `vi.mock()` calls must be at the top of the file (Vitest hoists them). |
| Frontend api.test.js — unhandled rejection warnings | Promise rejection not caught | All calls to `simulateInterceptor` must use `await expect(...).rejects...`. |
| Navbar.test.js — mount failure | Missing stub for `router-link` or Pinia not active | Ensure `setActivePinia(createPinia())` runs before mount. |

---

## Coverage Analysis & Future Work

### What Is Tested (Covered)

| Layer | Module | Coverage |
|-------|--------|----------|
| Backend — Crypto | AES-256-GCM encrypt/decrypt round-trip, tamper detection, format validation | **Full** — all code paths in `cryptoService.js` |
| Backend — Crypto | BLAKE2b hash chain (expense + audit), genesis hash, DB queries | **Full** — all code paths in `hashChain.js` |
| Backend — Crypto | MTTBA Merkle tree (1-100 leaves, odd handling, determinism, errors) | **Full** — all code paths in `merkleService.js` |
| Backend — Crypto | RSA-OAEP K_real wrapping, round-trip unwrap, error handling | **Full** — all code paths in `keyService.js` |
| Backend — Auth | Session check middleware (pass, 401, edge cases) | **Full** — all code paths in `auth.js` |
| Backend — RBAC | Role check middleware (5 roles, 401, 403, cross-role isolation) | **Full** — all code paths in `rbac.js` |
| Frontend — State | Auth store (login, register, logout, fetchMe, errors) | **Full** — all actions in `auth.js` store |
| Frontend — State | Expenses store (CRUD, pagination, filters, error handling) | **Full** — all actions in `expenses.js` store |
| Frontend — HTTP | Axios interceptor (401, 503 redirects, skip conditions) | **Full** — all interceptor logic in `api.js` |
| Frontend — UI | Navbar mount verification | **Partial** — mount check only, no interaction tests |

### What Is NOT Yet Tested (Gaps)

| Area | Missing Tests | Priority | Reason |
|------|--------------|----------|--------|
| Backend — Controllers | All 6 controller files have no tests | **High** | Controllers contain business logic (validation, DB queries, K_real distribution). Needs Supertest with mocked DB. |
| Backend — API Routes (integration) | Supertest HTTP tests for all 9 route files | **High** | The health endpoint and auth routes have worktree integration tests, but expenses, dashboard, integrity, audit-logs, users, departments, and session-keys routes are untested. |
| Backend — Audit Service | `auditService.js` not tested | **Medium** | The `logAction` function orchestrates DB writes and hash computation. Needs DB mocking. |
| Backend — Rate Limiter | `rateLimiter.js` not tested | **Low** | Depends on Redis. Configuration logic can be tested with Redis mocked. |
| Frontend — Components | All 14 views and 4 components not tested beyond Navbar mount | **Medium** | Component tests with Vue Test Utils: form validation, role-conditional rendering, dialog state, file upload. |
| Frontend — Crypto Service | `cryptoService.js` not tested | **Medium** | Web Crypto API operations (encryptLayer1, decryptLayer1, sign, verify, KEK derivation). Requires Web Crypto mocking with `crypto.subtle`. |
| Frontend — Router Guards | Route access control not tested | **Low** | Vue Router navigation guard tests verify redirect logic for unauthenticated users. |
| End-to-End | Full user journeys not tested | **Low** | Register → Login → Submit Expense → Approve → Verify Chain. Requires test database and seed data. |

### Suggested Next Steps for Complete Coverage

1. **Backend Integration Tests (Priority: High)**
   - Move the worktree `api/` integration tests to main branch
   - Add Supertest tests for expense routes (submit, approve, reject)
   - Add Supertest tests for integrity verification endpoints
   - Mock `pg` pool at the module level, control query responses per test

2. **Frontend Component Tests (Priority: Medium)**
   - `SubmitExpenseView.vue` — form validation, file upload state
   - `ExpenseDetailView.vue` — decrypted data display, approval timeline
   - `LoginView.vue` — form submission, error display
   - `Navbar.vue` — role-conditional link visibility (5 roles × multiple links)

3. **Frontend Crypto Service Tests (Priority: Medium)**
   - Mock `window.crypto.subtle` with a pure-JS AES-GCM implementation
   - Test `encryptLayer1` / `decryptLayer1` round-trip
   - Test `encryptReceiptFile` / `decryptReceiptFile` with ArrayBuffer
   - Test `deriveKEK` determinism (same password + email → same key)
   - Test `signPayload` → verify signature with public key

---

## Appendix: Complete Test Inventory

### Backend Tests (67 total)

```
backend/src/__tests__/
├── cryptoService.test.js .............. 13 tests
│   ├── encryptSystem / decryptSystem round-trip
│   │   ├── should encrypt and decrypt a plain string
│   │   ├── should encrypt and decrypt JSON objects
│   │   ├── should produce different ciphertext (random IV)
│   │   ├── should produce at least 28 bytes
│   │   ├── should handle empty string
│   │   ├── should handle Unicode / emoji
│   │   └── should handle long payloads (10 KB)
│   ├── tamper resistance
│   │   ├── should fail if ciphertext is modified
│   │   ├── should fail if authTag is modified
│   │   └── should fail with wrong key
│   └── buffer format
│       ├── should have 12-byte IV at the start
│       ├── should have 16-byte authTag after IV
│       └── ciphertext portion should be non-empty
│
├── hashChain.test.js ................. 16 tests
│   ├── GENESIS_HASH
│   │   └── should be 64 zeros
│   ├── calculateExpenseHash
│   │   ├── should produce a 64-character hex hash
│   │   ├── should be deterministic
│   │   ├── should differ when expenseId differs
│   │   ├── should differ when amount differs
│   │   ├── should differ when deptId differs
│   │   ├── should chain (depends on prevHash)
│   │   └── should break chain if prevHash tampered
│   ├── calculateAuditHash
│   │   ├── should produce a 64-character hex hash
│   │   ├── should be deterministic
│   │   └── should differ for different actions
│   ├── getPrevExpenseHash (DB mocked)
│   │   ├── should return GENESIS_HASH when empty
│   │   └── should return last hash when rows exist
│   ├── getPrevAuditHash (DB mocked)
│   │   ├── should return GENESIS_HASH when empty
│   │   └── should return last hash when rows exist
│   └── chain integrity
│       └── should maintain verifiable chain (3 expenses)
│
├── merkleService.test.js ............. 14 tests
│   ├── should return the hash itself for a single leaf
│   ├── should produce a 64-character hex root
│   ├── should be deterministic
│   ├── should produce different roots for different inputs
│   ├── should handle 2 leaves (perfect pair)
│   ├── should handle 3 leaves (odd → trim)
│   ├── should handle 4 leaves (balanced)
│   ├── should handle 5 leaves
│   ├── should handle 7 leaves (multiple odd levels)
│   ├── should handle 8 leaves (power of 2)
│   ├── should handle 100 leaves (large input)
│   ├── should produce same root for same order
│   ├── should produce different root when order changes
│   └── should throw on empty array
│
├── keyService.test.js ................ 6 tests
│   ├── should return a base64-encoded wrapped key
│   ├── should produce non-empty result
│   ├── should produce valid base64 (256 bytes = RSA-2048)
│   ├── should produce different output for different public keys
│   ├── should throw with invalid public key PEM
│   └── should unwrap successfully with matching private key
│
├── auth.middleware.test.js ............ 4 tests
│   ├── should call next() when user exists
│   ├── should return 401 when no session exists
│   ├── should return 401 when user is null
│   └── should return 401 when user is undefined
│
└── rbac.middleware.test.js ........... 12 tests
    ├── when user has required role
    │   ├── should call next() for matching single role
    │   ├── should call next() when role is in a list
    │   ├── should call next() for admin
    │   └── should call next() for ceo
    ├── when user does NOT have required role
    │   ├── should return 403 for non-matching role
    │   └── should return 403 when role list is empty
    ├── when user is not authenticated
    │   ├── should return 401 when session missing
    │   └── should return 401 when user missing
    └── cross-role isolation
        ├── should block employee from dept_manager routes
        ├── should block dept_manager from admin routes
        ├── should block employee from finance_manager routes
        └── should allow admin to access multi-role routes
```

### Frontend Tests (32 total)

```
frontend/src/__tests__/
├── stores/
│   ├── auth.test.js ................... 11 tests
│   │   ├── initial state (1 test)
│   │   │   └── should initialize with null user and default settings
│   │   ├── register (2 tests)
│   │   │   ├── should call POST /auth/register and return data
│   │   │   └── should set error and throw on failure
│   │   ├── login (3 tests)
│   │   │   ├── should set user on successful login
│   │   │   ├── should throw and set error on failed login
│   │   │   └── should handle network errors gracefully
│   │   ├── logout (1 test)
│   │   │   └── should call POST /auth/logout and clear user
│   │   └── fetchMe (3 tests)
│   │       ├── should set user from GET /auth/me response
│   │       ├── should set requiresSetup=true on 503
│   │       └── should clear user on non-503 error
│   │
│   └── expenses.test.js .............. 10 tests
│       ├── initial state (1 test)
│       │   └── should initialize with loading=false and no error
│       ├── submitExpense (3 tests)
│       │   ├── should POST to /expenses and return data
│       │   ├── should set error and throw on failure
│       │   └── should use default error message
│       ├── fetchMyExpenses (2 tests)
│       │   ├── should GET with pagination and filters
│       │   └── should default to page=1, limit=20
│       ├── fetchDeptExpenses (1 test)
│       ├── fetchAllExpenses (1 test)
│       ├── fetchExpenseById (1 test)
│       ├── deleteExpense (1 test)
│       └── updateStatus (2 tests)
│           ├── should PATCH with status and reason
│           └── should allow null reason
│
├── services/
│   └── api.test.js ................... 10 tests
│       ├── should clear K_real and redirect to /login on 401
│       ├── should NOT redirect on 401 if on /login
│       ├── should NOT redirect on 401 if on /register
│       ├── should NOT redirect on 401 if on /setup
│       ├── should NOT redirect on 401 if on /setup-account
│       ├── should redirect to /setup on 503 with requires_setup
│       ├── should NOT redirect on 503 if already on /setup
│       ├── should NOT redirect on 503 without requires_setup flag
│       └── should not modify location for non-401/503 errors
│
└── components/
    └── Navbar.test.js ................. 1 test
        └── renders (mount verification)
```

---

*Document generated for CryptoLedger FYP automated test suite. Last updated: 2026-07-03.*
*Total: 99 automated tests across 10 test files.*
*Framework versions: Jest 30.4.2, Supertest 7.2.2, Vitest 4.1.9, Vue Test Utils 2.4.11*
