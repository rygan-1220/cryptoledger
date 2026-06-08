# CryptoLedger

**CryptoLedger** is a state-of-the-art, cryptographically secure expense management system built as a Final Year Project (FYP). It leverages advanced encryption and integrity techniques to ensure that financial data is private, verifiable, and tamper-proof.

## 🚀 Key Features

- **🔐 Dual-Layer Encryption**: Sensitive financial data is encrypted on the client side (Layer 1) and wrapped in a system-level envelope (Layer 2) on the server.
- **🖊️ RSA Digital Signatures**: Every transaction is digitally signed, ensuring non-repudiation and authenticity.
- **🔑 Cross-Device Key Recovery**: Department encryption keys (K_real) are backed up to the server encrypted with a password-derived key (PBKDF2), enabling seamless recovery on new devices without compromising E2EE security.
- **⛓️ Cryptographic Hash Chaining**: All expense records and audit logs are linked in a BLAKE2b hash chain, making tampering impossible without detection.
- **🌳 Merkle Tree Verification**: Implements MTTBA (Merkle Trim Tree-Based Authentication) for efficient, high-performance integrity checks.
- **🎭 Granular RBAC**: A sophisticated Role-Based Access Control system with 5 distinct roles: Employee, Dept Manager, Finance Manager, Admin, and CEO.
- **🛡️ Immutable Audit Trail**: A permanent, chained record of all sensitive actions, including approvals, rejections, and data viewing.
- **📊 Real-time Analytics**: Interactive dashboard providing deep insights into spending by department, category, and project.

## 🏗️ Technical Stack

- **Frontend**: Vue.js 3, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL 16.
- **Caching/Security**: Redis.
- **Cryptography**: Node `crypto` (RSA, AES-GCM), Noble Hashes (BLAKE2b).

## 👥 Role-Based Access Control (RBAC)

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **Employee** | Basic | Submit encrypted expenses and track their status. |
| **Dept Manager** | Managerial | Oversee department spending and perform first-stage approvals. |
| **Finance Manager** | Professional | Full financial oversight, final approvals, and report generation. |
| **Admin** | System | Manage users, departments, and system integrity/checkpoints. |
| **CEO** | Executive | Full organizational visibility and administrative control. |

## 🛠️ Project Structure

- `frontend/`: Vue.js application with secure key generation.
- `backend/`: Express.js API with encryption middleware and hash chain logic.
- `database/`: SQL migrations and schema definitions.
- `design-system/`: Centralized design tokens and UI components.

## 🚦 Getting Started

### 1. Infrastructure & Backend
Start the local services and the backend server:
```bash
# Start Docker services (Database & Redis)
docker compose up -d

# Setup Backend
cd backend
npm install
npm run dev
```

### 2. Frontend & Setup
Start the frontend and follow the **Setup Wizard**:
```bash
# Setup Frontend
cd frontend
npm install
npm run dev
```
Once the frontend is running, navigate to `http://localhost:5173`. The system will automatically detect if it is uninitialized and guide you through the **Setup Wizard** to configure the database, generate encryption keys, and create the initial administrative account.


---

For detailed documentation, see:
- [API Documentation](backend/API_DOCUMENTATION.md)
- [Technical (Code) Documentation](backend/CODE_DOCUMENTATION.md)
