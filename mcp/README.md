## Provenance MCP Server (Minimal)

This service exposes a minimal MCP-style API surface for Provenance and Blockvault operations used by the loan demo.

### Why an MCP server?
- Centralize key management and blockchain calls
- Provide consistent, typed tools for frontend/backend consumers
- Add observability and audit logs around chain operations
- Enable safe testnet/mainnet switching via env

### Endpoints
- `GET /health` — service status
- `GET /tools/provenance/status` — network status
- `POST /tools/provenance/register-asset` — register a loan asset (stub)
- `POST /tools/provenance/process-payment` — process a payment (stub)
- `POST /tools/provenance/asset-class` — create or ensure asset class (stub)
- `POST /tools/provenance/asset` — create asset instance for a loan (stub)
- `POST /tools/provenance/ledger/create` — create loan ledger (stub)
- `POST /tools/provenance/ledger/post` — post DISBURSEMENT/PAYMENT/INTEREST (stub)
- `POST /tools/provenance/registry/assign` — assign roles (stub)
- `POST /tools/blockvault/store` — store a document (stub)
- `POST /tools/blockvault/attest` — create an attestation (stub)

All write endpoints currently simulate behavior for safe local development.

### Quick start
1. Copy `.env.example` to `.env` and set values
2. Install deps: `npm install`
3. Run dev: `npm run dev`
4. Health check: `GET http://localhost:6060/health`

### Integrating with the existing app
- Backend can call MCP endpoints instead of directly simulating blockchain logic
- Later, replace stubs with real Provenance and Blockvault SDK calls


