# ARES Repository Audit for LEX Subsystem

**Date:** 2026-09-12  
**Auditor:** ARES Agent (Claude)  
**Scope:** Existing ARES architecture for LEX subsystem integration  

---

## Executive Summary

The **aresjxaime/mobile** repository contains a working TypeScript-based ARES backend built on **Milestone 1: Persistent Conversations**. The architecture is modular and well-suited for LEX integration. Key reusable patterns exist for data persistence, service orchestration, and REST API design.

**Reuse opportunities:** Storage adapters, service patterns, API middleware, event emission framework.  
**Gaps:** No legal domain models, no full-text search, no Mnemosyne integration yet.  
**Risk:** TypeScript + Node.js stack; LEX may need Python for NLP/legal analysis (future consideration).

---

## Current Architecture Overview

### Directory Structure
```
src/
├── api/              # (implied REST layer)
├── data/             # Persistence layer
│   ├── conversation.ts      # Conversation & Message repos
│   ├── device.ts            # Device repo
│   ├── sqlStorage.ts        # SQL adapter (SQLite via better-sqlite3)
│   ├── storage.ts           # File storage fallback
│   └── storage_adapter.ts   # Abstraction interface
├── domain/           # Business entities
│   └── dashboard.ts  # Dashboard model (lightweight)
├── events.ts         # Event emission (framework exists)
├── http/             # HTTP layer
├── server.ts         # Main server entry
├── services/         # Business logic
│   ├── aresService.ts           # ARES orchestration
│   ├── conversationService.ts   # Conversation logic
│   └── deviceService.ts         # Device pairing logic
└── workspace/        # Workspace integration (implied)
```

### Key Technologies
- **Runtime:** Node.js (TypeScript, ES modules)
- **DB:** SQLite (better-sqlite3) with file storage fallback
- **HTTP:** Built-in Node.js http module, no Express
- **Async/await:** Native Promises, no Redux/complex state
- **Testing:** Vitest (unit + integration)
- **Versioning:** Git (branch: aresjxaime-bookish-giggle, ready for PR)

### Milestone 1 Status (Conversations)
- ✅ SQL + file storage with migrations
- ✅ Conversation/Message models (immutable, append-only)
- ✅ Device pairing + token lifecycle
- ✅ WebSocket realtime broadcast
- ✅ 35 tests passing, 80%+ coverage
- ✅ GitHub Actions CI/CD
- ✅ Authorization (userId-based scoping)

---

## Reusable Patterns & Interfaces

### 1. Storage Adapter Pattern
**File:** `src/data/storage_adapter.ts`

```typescript
export interface StorageAdapter {
  // CRUD for conversations, messages, devices, tokens
  // Both file and SQL implementations exist
  // Pattern: protocol-based, easily extensible
}
```

**Reuse for LEX:** Extend adapter to include `LegalDocument`, `LegalSource`, `Case`, `Citation` repos.

### 2. Service Layer
**Pattern:** Stateless, async services (e.g., `ConversationService`, `DeviceService`)

**Reuse for LEX:** `LegalService` for document retrieval, `CorpusService` for ingestion and versioning.

### 3. Repository Pattern
**Pattern:** Repository objects (`ConversationRepo`, `DeviceRepo`) with CRUD + domain-specific queries.

**Example:**
```typescript
export const ConversationRepo = {
  createConversation: async (userId: string, title: string): Promise<Conversation> => { ... },
  getConversation: async (id: string): Promise<Conversation | null> => { ... },
  appendMessage: async (conversationId: string, role: string, content: string) => { ... }
};
```

**Reuse for LEX:** 
- `LegalDocumentRepo` (with versioning and search)
- `CaseRepo` (with citation tracking)
- `LegalSourceRepo` (for adapter metadata)

### 4. Event Emission Framework
**File:** `src/events.ts`

**Pattern:** Centralized event registry; services emit events for orchestration and auditing.

**Reuse for LEX:** Emit `learning.document_retrieved`, `learning.citation_resolved`, `learning.query_made` events to Mnemosyne.

### 5. REST Endpoint Convention
**Pattern:** Implemented in `src/server.ts` without Express.

**Existing routes:**
- `POST /v1/pair/start` — Pairing initiation
- `POST /v1/pair/confirm` — Confirm pairing code
- `POST /v1/conversations` — Create conversation
- `GET /v1/conversations/:id/messages` — List messages
- `POST /v1/conversations/:id/messages` — Append message
- `WebSocket /v1/realtime` — Real-time sync

**Reuse for LEX:**
- `GET /api/lex/search?q=...` — Legal search
- `GET /api/lex/documents/:id` — Retrieve document
- `GET /api/lex/cases/:id` — Retrieve case
- `POST /api/lex/queries` — Log learning query

---

## Existing Database Schema (Conversations)

```sql
-- Key tables for reference
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  paired_at TEXT NOT NULL,
  last_seen TEXT
);

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT,
  revoked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

**Patterns to reuse:**
- Timestamps as ISO 8601 strings
- UUID for IDs
- SQLite for simplicity (no ORM)
- Immutable history (append-only for messages)
- user_id for scoping

---

## Gaps & Dependencies for LEX MVP

| Requirement | Current Status | Action |
| --- | --- | --- |
| Legal domain models | ❌ None | Add `LegalDocument`, `Case`, `Citation` models |
| Storage for legal documents | ❌ None | Extend schema with legal tables |
| Full-text search | ⚠️ Basic SQL FTS | Enable SQLite FTS5 for legal content |
| Versioning framework | ⚠️ Exists (for messages) | Adapt for document versions |
| Mnemosyne event integration | ❌ None | Define contract, emit learning events |
| Legal source adapters | ❌ None | Implement Protocol and LocalCorpusAdapter |
| Ingestion CLI | ❌ None | Build corpus loader (Constitution, cases, statutes) |
| Claim-to-source validator | ❌ None | Implement citation resolver |

---

## Migration Path for LEX

### Phase 1: Foundation (This PR)
1. Create `src/lex/domain/` models (LegalDocument, Case, Citation)
2. Extend storage adapter and migrations for legal tables
3. Implement `LegalSourceAdapter` protocol and `LocalCorpusAdapter`
4. Add unit tests for ingestion and versioning
5. **Deliverable:** Models + storage + basic ingestion

### Phase 2: Retrieval API
1. Implement `GET /api/lex/search`, `/api/lex/documents/:id`
2. Add full-text search via SQLite FTS5
3. Integration tests for query → retrieval pipeline
4. **Deliverable:** Public retrieval endpoints

### Phase 3: Learning Integration
1. Define Mnemosyne event contract
2. Emit `learning.*` events from retrieval and query services
3. Implement claim-to-source validator
4. **Deliverable:** Grounded answer wiring

---

## Recommendations

1. **Keep TypeScript** for type safety; if LEX needs Python NLP later, run as a separate microservice and wire via API.

2. **Extend storage_adapter.ts** to define `LegalSourceAdapter` as a Protocol, consistent with existing Conversation/Device patterns.

3. **Use immutable versioning** for legal documents (similar to append-only messages); store all versions and content hashes for auditability.

4. **Seed with small corpus** (Constitution, Evidence Act, 3–5 landmark cases) to validate ingestion and retrieval before scaling.

5. **Emit events from day one** so Mnemosyne can track learning behavior even in MVP.

6. **CI must pass** before PR is eligible for merge (existing GitHub Actions setup will catch regressions).

---

## Conclusion

**The existing ARES architecture is well-positioned for LEX integration.** Storage adapters, service patterns, and event frameworks can be reused with minimal friction. The main work is domain modeling (legal documents, cases, citations), extending storage, and wiring Mnemosyne events.

**Estimated effort for Phase 1 MVP:** 6–8 hours (models + migrations + adapter + tests + small ingestion script).

---

**Next step:** Draft ADR for LEX architecture and begin implementation of Phase 1.
