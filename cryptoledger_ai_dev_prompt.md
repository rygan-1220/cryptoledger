# CryptoLedger — Full Web Application Development Prompt

> **Project:** CryptoLedger: Secure Collaborative Expense Reimbursement System  
> **Author:** Gan Ren Yi (1221305796), Multimedia University Malaysia  
> **Supervisor:** Dr. Hafiz Adnan Hussain  
> **Degree:** Bachelor of Computer Science (Hons.) in Cybersecurity  
> **FYP ID:** FYP01-CS-T2530-0397

---

## 1. Project Overview

Build **CryptoLedger**, a full-stack, web-based secure expense reimbursement system designed for small-to-medium enterprises (SMEs). The system uses a **Two-Layer AES-256 Encryption** architecture with a **Pattern Layer**, a **Recursive Hash Chain** integrity ledger, **Merkle Trim Tree-Based Authentication (MTTBA)** for batch verification, and strict **Role-Based Access Control (RBAC)**.

The core philosophy: sensitive vendor/receipt data must remain end-to-end encrypted at all times, while statistical reporting (dashboards, aggregations) must still function **without ever decrypting full plaintext** — achieved via the Pattern Layer design.

---

## 2. Technology Stack (Must Follow Exactly)

| Layer | Technology |
|---|---|
| Build Tool | Vite 5.x |
| Frontend | Vue 3.x (Composition API + `<script setup>`) |
| UI Styling | Tailwind CSS 3.x |
| Backend Runtime | Node.js 20 LTS |
| Web Framework | Express 4.x |
| Database | PostgreSQL 16 |
| Cache / Temp Storage | Redis (via `ioredis`) |
| Cryptography (Backend) | Node.js built-in `crypto` module (AES-256-GCM, BLAKE2b via `@noble/hashes`) |
| Cryptography (Frontend) | Web Crypto API (RSA-OAEP key generation, AES-GCM) |
| ORM / Query Builder | `pg` (raw SQL or `knex.js`) |
| Auth | Session-based auth (httpOnly cookie + Redis session store) |
| File Upload | `multer` (receipt images/PDFs, stored encrypted) |
| API Style | RESTful JSON API |

---

## 3. User Roles & Permissions

There are **5 roles** in the system. Implement RBAC middleware on every protected route.

| Role | Permissions |
|---|---|
| **Employee** | Register, Login, Submit Expense, View own expenses, Edit/Delete own PENDING expenses (soft delete only) |
| **Department Manager** | All Employee permissions + View all expenses in own department, Approve/Reject department expenses |
| **Finance Manager** | Login, View all pending expenses (all departments), Approve/Reject expenses, Request K_session to view full plaintext details |
| **Admin** | Login, View all expenses (all departments), View audit logs, Verify hash chain integrity, Request K_session, Trigger Merkle checkpoint creation |
| **CEO** | Login, View all expenses, View audit logs, View dashboard (aggregated reports only), Request K_session, Download reports |

**Principle of Least Privilege:** Every role sees only what is strictly necessary. No role should be able to access another department's plaintext without a valid K_session.

---

## 4. Cryptographic Architecture (Critical — Must Implement Correctly)

### 4.1 Key Hierarchy

Three types of AES-256 keys are used:

```
K_system  (System Key)
  └── Stored in server environment variable (.env), NEVER sent to client
  └── Used for: Layer 2 encryption, wrapping all K_real keys in DB

K_real  (Department Key)
  └── Unique per department
  └── Stored in DB as: wrapped_kreal = AES-256-GCM encrypt(K_real, K_system)
  └── Used for: Layer 1 encryption of sensitive expense fields
  └── Distributed to members via RSA wrapping (see Section 4.4)

K_session  (Session Key / Temporary Access)
  └── Stored in Redis with TTL = 1 hour
  └── Contains: encrypted K_real wrapped with requester's RSA public key
  └── Used for: privileged access by Finance/Admin/CEO to view full plaintext
  └── Every use is logged in audit log; key destroyed after TTL expires
```

### 4.2 Two-Layer Encryption Flow (Expense Submission)

When an employee submits an expense, the following must happen **in exact order**:

**Step 1 — Client Side (Layer 1 Encryption):**
```
Sensitive plaintext = {
  vendor_name: "XX Supplier",
  receipt_file: <base64 of uploaded file>,
  description: "Office supplies purchase"
}

Layer1_Ciphertext = AES-256-GCM_Encrypt(sensitive_plaintext, K_real)
  → Returns: { iv, authTag, ciphertext } all base64 encoded
```

**Step 2 — Client Side (Digital Signature):**
```
payload_to_sign = Layer1_Ciphertext + Pattern_Layer (JSON stringified)
Digital_Signature = RSA_Sign(payload_to_sign, user_private_key)
  → Ensures non-repudiation; verifiable server-side via stored public_key_pem
```

**Step 3 — Server Side (Signature Verification):**
```
Fetch user.public_key_pem from DB
Verify Digital_Signature against payload
If invalid → reject with 401
```

**Step 4 — Server Side (Pattern Extraction):**
```
Pattern_Layer = {
  amount: <from request body — NOT encrypted>,
  project_id: "P001",
  dept_id: "D01",
  date: "2026-01-09",
  category: "Office Supplies"
}
```

**Step 5 — Server Side (Layer 2 Encryption):**
```
Combined_Payload = {
  layer1_ciphertext: <from client>,
  pattern: Pattern_Layer
}

Layer2_Ciphertext = AES-256-GCM_Encrypt(JSON.stringify(Combined_Payload), K_system)
  → Returns: { iv, authTag, ciphertext } stored as BYTEA in DB
```

**Step 6 — Server Side (Hash Chain):**
```
prev_expense = SELECT hash FROM expenses ORDER BY created_at DESC LIMIT 1
current_hash = BLAKE2b(expense_id || prev_hash || amount || dept_id || created_at)
INSERT INTO expenses (..., layer2_ciphertext, prev_hash, hash, ...)
```

### 4.3 Decryption Flow

**Employee viewing own records:**
1. Server fetches encrypted record, decrypts Layer 2 using K_system → gets `{ layer1_ciphertext, pattern }`
2. Server sends `layer1_ciphertext` back to client
3. Client uses its stored K_real (from localStorage, IndexedDB, or in-memory) to decrypt Layer 1 → gets full plaintext

**Finance/Admin/CEO viewing any record (requires K_session):**
1. User requests K_session via `POST /api/session-keys/request`
2. Server: unwraps target dept's K_real using K_system → re-wraps K_real with requester's RSA public key → stores in Redis with TTL=1hr → returns session token
3. User decrypts session payload using their RSA private key → temporarily has K_real
4. User decrypts Layer 1 client-side
5. Every access is appended to `expense_audit_log` with actor_id, timestamp, target expense_id

### 4.4 New Member Key Distribution (RSA Wrapping)

When a new employee registers:
1. Client-side: Generate RSA-OAEP 2048-bit key pair using Web Crypto API
2. Client stores private key in IndexedDB (NEVER sent to server)
3. Client sends `public_key_pem` to server during registration
4. Server: retrieve `wrapped_kreal` for user's department → decrypt with K_system to get K_real → re-encrypt K_real using user's `public_key_pem` → return `wrapped_kreal_for_user`
5. Client decrypts `wrapped_kreal_for_user` using private key → stores K_real in IndexedDB
6. K_real is now available client-side for Layer 1 operations

---

## 5. Database Schema (PostgreSQL 16)

### Table: `departments`
```sql
CREATE TABLE departments (
  dept_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_name     VARCHAR(255) NOT NULL UNIQUE,
  wrapped_kreal BYTEA NOT NULL,  -- K_real encrypted with K_system
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `users`
```sql
CREATE TABLE users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(255) NOT NULL UNIQUE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,  -- bcrypt hash
  role           VARCHAR(50) NOT NULL CHECK (role IN ('employee','dept_manager','finance_manager','admin','ceo')),
  dept_id        UUID REFERENCES departments(dept_id),
  public_key_pem TEXT NOT NULL,          -- RSA public key from client
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `expenses` (Hash Chain Table)
```sql
CREATE TABLE expenses (
  expense_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(user_id),
  dept_id           UUID NOT NULL REFERENCES departments(dept_id),
  amount            FLOAT NOT NULL,            -- Pattern Layer field (plaintext for stats)
  project_id        VARCHAR(100),              -- Pattern Layer field
  category          VARCHAR(100),              -- Pattern Layer field
  status            VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  layer2_ciphertext BYTEA NOT NULL,            -- Combined Layer1 ciphertext + Pattern Layer, encrypted by K_system
  digital_signature TEXT NOT NULL,             -- RSA signature from submitting user
  prev_hash         VARCHAR(255) NOT NULL,     -- Hash of previous expense record
  hash              VARCHAR(255) NOT NULL,     -- BLAKE2b hash of this record
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted           BOOLEAN DEFAULT FALSE,     -- Soft delete only
  deleted_at        TIMESTAMPTZ
);
```

### Table: `expense_audit_log` (Hash Chain Table — Append Only)
```sql
CREATE TABLE expense_audit_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID REFERENCES expenses(expense_id),
  action      VARCHAR(50) NOT NULL CHECK (action IN ('CREATE','APPROVE','REJECT','VIEW_PLAINTEXT','DELETE','VERIFY')),
  actor_id    UUID NOT NULL REFERENCES users(user_id),
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB,        -- Extra context: session_id, target_dept, IP address, etc.
  prev_hash   VARCHAR(255) NOT NULL,
  hash        VARCHAR(255) NOT NULL
);
```

### Table: `merkle_roots` (Checkpoint Records)
```sql
CREATE TABLE merkle_roots (
  root_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_hash        VARCHAR(255) NOT NULL,
  start_expense_id UUID NOT NULL,
  end_expense_id   UUID NOT NULL,
  record_count     INTEGER NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES users(user_id)
);
```

### Redis Keys (Temporary Session Keys)
```
Key pattern:  session:{session_id}
Value (JSON): {
  session_id,
  requester_user_id,
  target_dept_id,
  wrapped_kreal_for_requester,  -- K_real encrypted with requester's RSA public key
  issued_at,
  expires_at
}
TTL: 3600 seconds (1 hour)
```

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user, distribute K_real via RSA wrapping | Public |
| POST | `/api/auth/login` | Validate credentials, create server session, set httpOnly cookie | Public |
| POST | `/api/auth/logout` | Destroy server session and clear auth cookie | Authenticated |
| GET  | `/api/auth/me` | Get current user profile from active session | Authenticated |

### Expenses
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/expenses` | Submit new expense (receives Layer1 ciphertext + pattern fields + digital signature) | Employee+ |
| GET  | `/api/expenses` | List own expenses (paginated) | Employee |
| GET  | `/api/expenses/department` | List all expenses in own dept | Dept Manager+ |
| GET  | `/api/expenses/all` | List all expenses (all depts) | Finance/Admin/CEO |
| GET  | `/api/expenses/:id` | Get single expense (Layer2 decrypted server-side, Layer1 sent to client) | Owner / Admin+ |
| PATCH | `/api/expenses/:id/status` | Approve or Reject | Dept Manager / Finance |
| DELETE | `/api/expenses/:id` | Soft delete (only if status=pending, only by owner) | Employee |

### Session Keys (Privileged Access)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/session-keys/request` | Request K_session for a dept | Finance/Admin/CEO |
| DELETE | `/api/session-keys/:session_id` | Revoke session early | Requester / Admin |

### Dashboard & Reports
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Total amounts, counts by status (Pattern Layer only) | Finance/Admin/CEO |
| GET | `/api/dashboard/by-department` | Group by dept, aggregate totals | Finance/Admin/CEO |
| GET | `/api/dashboard/by-project` | Group by project_id | Finance/Admin/CEO |
| GET | `/api/dashboard/by-category` | Group by category | Finance/Admin/CEO |
| GET | `/api/dashboard/monthly-trends` | Monthly aggregation by date | Finance/Admin/CEO |
| GET | `/api/dashboard/export` | Export report as CSV/JSON | Admin/CEO |

### Audit & Integrity
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/audit-logs` | List audit logs (paginated, filterable) | Admin/CEO |
| POST | `/api/integrity/verify-chain` | Run hash chain verification on expenses table | Admin |
| POST | `/api/integrity/create-merkle-checkpoint` | Build MTTBA checkpoint for current unverified batch | Admin |
| GET  | `/api/integrity/merkle-roots` | List all Merkle checkpoints | Admin |
| POST | `/api/integrity/verify-merkle/:root_id` | Re-verify a specific Merkle checkpoint | Admin |

---

## 7. Hash Chain Logic (Backend)

### 7.1 Hash Generation (BLAKE2b)
Every new expense record must compute its hash as:
```js
const hash = blake2b(
  expense_id + "|" + prev_hash + "|" + amount + "|" + dept_id + "|" + created_at.toISOString()
)
```

The very first expense record uses `prev_hash = "0000000000000000000000000000000000000000000000000000000000000000" // 64 zero chars`.

### 7.2 Chain Verification Algorithm
```
GET /api/integrity/verify-chain

1. Fetch ALL expenses ordered by created_at ASC include `deleted=true`.
2. For each record[i]:
   a. Recompute expected_hash = BLAKE2b(record[i].expense_id + record[i].prev_hash + ...)
   b. If expected_hash !== record[i].hash → CHAIN BROKEN at record[i].expense_id
   c. If record[i].prev_hash !== record[i-1].hash → CHAIN BROKEN (prev_hash mismatch)
3. Return { valid: true } or { valid: false, broken_at: expense_id, reason: "..." }
```

### 7.3 Merkle Trim Tree-Based Authentication (MTTBA)
Implement the MTTBA algorithm proposed by Gracy & Jeyavadhanam (2022):

- Unlike a traditional Merkle tree, **do NOT duplicate leaf nodes** for odd counts. Instead, trim the last unpaired node by computing a "trimmed hash" for it alone.
- Build tree bottom-up from expense `hash` values in a batch.
- Store the final `root_hash` in the `merkle_roots` table with `start_expense_id` and `end_expense_id`.
- To verify: re-fetch the same batch of expense hashes, rebuild the MTTBA, compare root hash.

```
createMTTBA(hashes[]):
  if hashes.length == 1: return hashes[0]
  nodes = hashes
  while nodes.length > 1:
    next_level = []
    for i = 0; i < nodes.length; i += 2:
      if i+1 < nodes.length:
        next_level.push( BLAKE2b(nodes[i] + nodes[i+1]) )
      else:
        next_level.push( BLAKE2b(nodes[i]) )  // trim: hash alone, don't duplicate
    nodes = next_level
  return nodes[0]  // root hash
```

---

## 8. Frontend Pages & Components (Vue 3)

### 8.1 Page List

| Page | Route | Visible to |
|---|---|---|
| Login | `/login` | Public |
| Register | `/register` | Public |
| Dashboard (Stats) | `/dashboard` | Finance/Admin/CEO |
| My Expenses | `/expenses` | Employee |
| Submit Expense | `/expenses/new` | Employee |
| Expense Detail | `/expenses/:id` | Owner / privileged |
| Dept Expenses | `/department/expenses` | Dept Manager |
| All Expenses | `/admin/expenses` | Finance/Admin/CEO |
| Audit Logs | `/admin/audit-logs` | Admin/CEO |
| Hash Chain Verify | `/admin/integrity` | Admin |
| Merkle Checkpoints | `/admin/merkle` | Admin |
| User Management | `/admin/users` | Admin |
| Profile / Key Mgmt | `/profile` | All |

### 8.2 Key Frontend Behaviors

**Key Storage:**
- On registration, generate RSA key pair using `window.crypto.subtle.generateKey`
- Store private key in `IndexedDB` under key `cryptoledger_private_key`
- Store K_real (after unwrapping) in `IndexedDB` under key `cryptoledger_kreal_{dept_id}`
- On login, prompt user to confirm keys are available (show warning if keys missing from IndexedDB — data cannot be decrypted without them)

**Expense Submission Form fields:**
- Vendor Name (text) — goes into Layer 1
- Description (textarea) — goes into Layer 1
- Receipt File (file upload, image or PDF) — base64 encoded, goes into Layer 1
- Amount (number) — Pattern Layer
- Project ID (select or text) — Pattern Layer
- Category (select: Office Supplies, Travel, Meals, Equipment, Other) — Pattern Layer
- Date (date picker) — Pattern Layer

**Dashboard Charts (use Chart.js or Recharts):**
- Donut chart: Expenses by status (Pending / Approved / Rejected)
- Bar chart: Monthly total amount trend (last 12 months)
- Bar chart: Total by department
- Bar chart: Total by category
- Table: Top projects by total reimbursement amount

**Audit Log Table:**
- Columns: Timestamp, Actor, Action, Expense ID, Metadata
- Filter by: action type, actor, date range
- Highlight `VIEW_PLAINTEXT` actions in orange (sensitive access)

**Hash Chain Integrity Page:**
- Button: "Run Verification"
- Shows: green ✓ if valid, red ✗ with broken record ID if tampered
- Button: "Create Merkle Checkpoint" (Admin only)
- Table: list of past Merkle root checkpoints with record counts and re-verify button

---

## 9. Security Requirements

1. **Passwords:** Hash with `bcrypt` (cost factor 12). Never store plaintext.
2. **Session Authentication:** Use server-side sessions (Redis-backed). Session ID must be stored in a secure httpOnly cookie. Session TTL = 15 minutes (idle timeout or sliding window). Optional remember-me session TTL = 7 days.
3. **RBAC Middleware:** Every protected API route must use session-auth middleware, then check role. Return `403 Forbidden` if insufficient role.
4. **Soft Delete Only:** `DELETE` on an expense must set `deleted = true` and `deleted_at = NOW()`. Never remove records from DB. Hash chain must still link through deleted records.
5. **Audit Everything:** Every action (Create, Approve, Reject, Delete, View Plaintext, Verify) must insert a new record into `expense_audit_log` with its own hash chain entry.
6. **K_session Audit:** Every time a privileged user uses K_session to view plaintext, a `VIEW_PLAINTEXT` log entry is created with `session_id` in metadata.
7. **No Plaintext in DB:** The `layer2_ciphertext` field is the only place expense data lives. Pattern fields (`amount`, `dept_id`, `project_id`, `category`, `created_at`) can exist as plaintext columns for fast querying — they are not sensitive.
8. **Input Validation:** Validate all API inputs using `express-validator` or `zod`. Sanitize user input.
9. **Rate Limiting:** Apply `express-rate-limit` to auth endpoints (max 10 requests/minute per IP).
10. **CSRF Protection:** For all state-changing routes (POST/PATCH/DELETE), enforce CSRF token validation or SameSite strategy with strict origin checks.
11. **CORS:** Configure CORS to only allow the frontend origin.
12. **Environment Variables:** K_system, session secret, DB connection string, Redis URL must all come from `.env`. Never hardcode.
13. **No Bearer Token Auth:** Protected routes must authenticate via session middleware only; bearer token authentication is out of scope.

---

## 10. Project File Structure

```
cryptoledger/
├── frontend/                    # Vue 3 + Vite
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.js         # Vue Router with route guards
│   │   ├── stores/
│   │   │   ├── auth.js          # Pinia store: user, session state
│   │   │   └── crypto.js        # Pinia store: K_real, RSA key access helpers
│   │   ├── services/
│   │   │   ├── api.js           # Axios instance with cookie-based auth support
│   │   │   ├── cryptoService.js # Web Crypto API: encrypt/decrypt Layer 1, RSA ops
│   │   │   └── keyStore.js      # IndexedDB helpers for key persistence
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   ├── RegisterView.vue
│   │   │   ├── DashboardView.vue
│   │   │   ├── MyExpensesView.vue
│   │   │   ├── SubmitExpenseView.vue
│   │   │   ├── ExpenseDetailView.vue
│   │   │   ├── DeptExpensesView.vue
│   │   │   ├── AllExpensesView.vue
│   │   │   ├── AuditLogsView.vue
│   │   │   ├── IntegrityView.vue
│   │   │   └── ProfileView.vue
│   │   └── components/
│   │       ├── ExpenseTable.vue
│   │       ├── ExpenseForm.vue
│   │       ├── DecryptedExpenseModal.vue
│   │       ├── SessionKeyModal.vue
│   │       ├── DashboardCharts.vue
│   │       └── Navbar.vue
│   ├── index.html
│   └── vite.config.js
│
├── backend/                     # Node.js + Express
│   ├── src/
│   │   ├── index.js             # Express app entry point
│   │   ├── config/
│   │   │   ├── db.js            # PostgreSQL pool
│   │   │   └── redis.js         # Redis client
│   │   ├── middleware/
│   │   │   ├── auth.js          # Session verification middleware
│   │   │   ├── rbac.js          # Role-based access control middleware
│   │   │   └── validate.js      # Input validation middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── expenses.routes.js
│   │   │   ├── sessionKeys.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── auditLogs.routes.js
│   │   │   └── integrity.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── expenses.controller.js
│   │   │   ├── sessionKeys.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── auditLogs.controller.js
│   │   │   └── integrity.controller.js
│   │   └── services/
│   │       ├── cryptoService.js     # AES-256-GCM encrypt/decrypt using K_system
│   │       ├── hashChain.js         # BLAKE2b hash chain logic
│   │       ├── merkleService.js     # MTTBA construction and verification
│   │       ├── keyService.js        # K_real wrapping/unwrapping, K_session management
│   │       └── auditService.js      # Append-only audit log insertion
│   └── .env
│
├── database/
│   ├── migrations/
│   │   ├── 001_create_departments.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_expenses.sql
│   │   ├── 004_create_audit_log.sql
│   │   └── 005_create_merkle_roots.sql
│   └── seeds/
│       └── seed_departments.sql    # Seed 3-4 test departments with K_real
│
└── docker-compose.yml              # PostgreSQL + Redis for local dev
```

---

## 11. Implementation Notes & Edge Cases

### Handling First Expense (Genesis)
The very first expense in the chain has no previous record. Use:
```js
prev_hash = "0000000000000000000000000000000000000000000000000000000000000000" // 64 zero chars
```

### Soft Delete & Hash Chain
When an expense is soft-deleted (`deleted = true`), the hash chain must remain intact. Subsequent expenses still reference the deleted record's hash as their `prev_hash`. Do not skip deleted records in chain traversal.

### Pattern Layer vs Encrypted Fields
The following fields are stored as **plaintext columns** in the `expenses` table for fast queries (these are low-sensitivity statistical fields):
- `amount`, `dept_id`, `project_id`, `category`, `status`, `created_at`

The following are encrypted inside `layer2_ciphertext` (and within that, inside Layer 1 ciphertext):
- Layer 1 (K_real): `vendor_name`, `description`, `receipt_file` (base64)
- Combined with Pattern before Layer 2: same pattern fields (duplicated for integrity)

### Receipt File Upload
- Accept image (JPEG/PNG) and PDF files, max 5MB
- On client side: read file as base64, include in the Layer 1 plaintext JSON before encryption
- Do NOT store the raw file on disk — store it only as part of `layer2_ciphertext`

### K_real Loss (Key Recovery)
If a user loses their private RSA key (clears IndexedDB / changes device):
- They **cannot** recover their K_real — this is intentional (E2EE tradeoff)
- Show a clear warning on the Profile page: "Your private key is stored only on this device. Clearing your browser data will permanently lose access to your encrypted expenses."
- Provide a "Export My Private Key" button to download key as a `.pem` file for backup

### Pagination
All list endpoints must support `?page=1&limit=20` query parameters. Return `{ data: [...], total, page, limit }`.

---

## 12. Development Phases (Agile Sprints)

### Sprint 1 — Foundation
- [ ] Set up Vite + Vue 3 + Tailwind frontend scaffold
- [ ] Set up Node.js + Express backend scaffold
- [ ] PostgreSQL schema migrations
- [ ] Redis connection
- [ ] Docker Compose for local dev

### Sprint 2 — Auth & Key Distribution
- [ ] User registration with RSA key generation (client-side Web Crypto API)
- [ ] K_real wrapping and distribution on register
- [ ] Login with server-side session + secure httpOnly cookie
- [ ] RBAC middleware
- [ ] Profile page with key status & export

### Sprint 3 — Expense Submission & Encryption
- [ ] Expense submission form (Vue)
- [ ] Layer 1 encryption on client (vendor, description, receipt)
- [ ] Digital signature generation
- [ ] Layer 2 encryption on server
- [ ] Hash chain append on each insert

### Sprint 4 — Expense Viewing & Decryption
- [ ] My Expenses list (Employee)
- [ ] Expense detail with Layer 2 → Layer 1 decryption flow
- [ ] Dept Expenses list (Manager)
- [ ] All Expenses list (Finance/Admin/CEO)
- [ ] K_session request modal and flow

### Sprint 5 — Approval Workflow
- [ ] Approve / Reject by Dept Manager and Finance Manager
- [ ] Status update with audit log entry
- [ ] Email or in-app notification (optional)

### Sprint 6 — Dashboard & Reports
- [ ] Pattern Layer aggregation API (no plaintext decryption)
- [ ] Dashboard page with charts (Chart.js)
- [ ] Export report as CSV/JSON

### Sprint 7 — Integrity & Audit
- [ ] Hash chain verification endpoint + UI
- [ ] MTTBA checkpoint creation
- [ ] Merkle checkpoint verification
- [ ] Audit log page with filtering

### Sprint 8 — Security Hardening & Testing
- [ ] Rate limiting on auth routes
- [ ] Input validation & sanitization
- [ ] Unit tests for crypto service (hash chain, encryption)
- [ ] Integration tests for key API flows
- [ ] Basic security testing: tamper a DB record and confirm chain breaks

---

## 13. Example `.env` File (Backend)

```env
PORT=3001
DATABASE_URL=postgresql://cryptoledger:password@localhost:5432/cryptoledger_db
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your_session_secret_here_min_32_chars
SESSION_TTL=900
SESSION_REMEMBER_TTL=604800
K_SYSTEM=your_base64_encoded_32_byte_aes_key_here
K_SESSION_TTL=3600
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## 14. Sample Seed Data

Create the following departments on first run:
- Engineering (dept_id: auto-generated)
- Finance (dept_id: auto-generated)
- Operations (dept_id: auto-generated)
- Marketing (dept_id: auto-generated)

For each department, generate a random AES-256 K_real, wrap it with K_system, store as `wrapped_kreal`.

Create one user per role for testing:
- `employee@test.com` / password: `Test1234!` / role: employee / dept: Engineering
- `manager@test.com` / role: dept_manager / dept: Engineering
- `finance@test.com` / role: finance_manager / dept: Finance
- `admin@test.com` / role: admin / dept: null
- `ceo@test.com` / role: ceo / dept: null

---

## 15. Non-Functional Requirements

- **Performance:** All API responses under 500ms for normal operations. Hash chain verification over 1000 records under 2 seconds.
- **Responsiveness:** UI must be fully functional on mobile (responsive Tailwind layout).
- **Error Handling:** All API errors return `{ error: "message", code: "ERROR_CODE" }`. Frontend shows user-friendly error toasts.
- **Accessibility:** Basic WCAG 2.1 AA compliance (labels, contrast, keyboard navigation).
- **No Real Payment Integration:** Payout is simulated — an "Approved" status is the final state. No Stripe/PayPal integration needed.
- **No HSM:** Key management is software-based (environment variables + pgcrypto). Hardware security modules are out of scope.
- **Single Tenant:** This is a single-company system. No multi-tenancy.

---

*This prompt is derived from the FYP1 Interim Report "CryptoLedger: Secure Collaborative Expense System" by Gan Ren Yi, Multimedia University Malaysia, February 2026.*
