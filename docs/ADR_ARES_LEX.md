# ADR-001: ARES LEX Architecture — Legal Research & Learning Integration

**Status:** Proposed  
**Date:** 2026-09-12  
**Author:** ARES Agent (Claude)  
**Stakeholders:** Aime (Owner), ARES Orchestrator  

---

## Context

**Problem:** Aime needs a system to support Kenyan law studies through grounded legal research, document management, and learning event tracking.

**Constraints:**
- MVP must focus on *learning workflows*, not general-purpose legal services.
- All claims must be grounded in retrieved legal sources (no hallucination).
- Future Mnemosyne integration for learning event capture.
- Existing ARES persistence layer (SQLite, TypeScript) is the foundation.

**Decision:** Implement ARES LEX as a **pluggable subsystem** with clear boundaries, following adapter patterns already established in Conversations subsystem.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│          ARES LEX Subsystem              │
├─────────────────────────────────────────┤
│                                         │
│  Retrieval API Layer (REST)             │
│  ├─ GET /api/lex/search                 │
│  ├─ GET /api/lex/documents/:id          │
│  ├─ GET /api/lex/cases/:id              │
│  └─ POST /api/lex/queries (learning)    │
│                                         │
│  Service Layer                          │
│  ├─ LegalService (retrieval, search)    │
│  ├─ CorpusService (ingestion, versioning)
│  └─ CitationResolver (claim validator)  │
│                                         │
│  Domain Models                          │
│  ├─ LegalDocument + version history     │
│  ├─ Case + case metadata                │
│  ├─ LegalSource + source registry       │
│  └─ Citation + citation tracking        │
│                                         │
│  Storage Adapter Pattern                │
│  ├─ LegalSourceAdapter (Protocol)       │
│  │   ├─ LocalCorpusAdapter              │
│  │   └─ (Future: ExternalAPIAdapter)    │
│  └─ Repository Layer                    │
│      ├─ LegalDocumentRepo               │
│      ├─ CaseRepo                        │
│      ├─ LegalSourceRepo                 │
│      └─ CitationRepo                    │
│                                         │
│  Event Emission                         │
│  ├─ learning.document_retrieved         │
│  ├─ learning.citation_resolved          │
│  └─ learning.query_made                 │
│                                         │
│  Database Layer (SQLite)                │
│  ├─ legal_documents (immutable versions)│
│  ├─ legal_document_versions             │
│  ├─ cases                               │
│  ├─ legal_citations                     │
│  └─ legal_sources                       │
│                                         │
└─────────────────────────────────────────┘
        │
        │ Uses existing ARES layer
        ▼
┌─────────────────────────────────────────┐
│   ARES Core (Conversations, Devices)    │
├─────────────────────────────────────────┤
│   Storage (SQL + File)                  │
│   Event Bus                             │
│   Auth (userId-based)                   │
└─────────────────────────────────────────┘
        │
        │ Future: Mnemosyne integration
        ▼
    [Mnemosyne]
```

---

## Data Model & Schema

### Core Entities

#### 1. LegalDocument
```typescript
interface LegalDocument {
  id: string;              // UUID
  title: string;           // E.g., "Constitution of Kenya"
  document_type: string;   // "statute" | "case" | "regulation"
  first_published: string; // ISO 8601
  latest_version_id: string; // Links to current version
  source_id: string;       // Which source provided this
  user_id: string;         // Ownership (ARES scoping)
  created_at: string;
  updated_at: string;
}
```

#### 2. LegalDocumentVersion
```typescript
interface LegalDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;  // 1, 2, 3, ...
  content: string;         // Full legal text
  content_hash: string;    // SHA-256 for dedup
  published_date: string;  // When version was published
  ingested_at: string;     // When added to corpus
  created_by: string;      // "migration" | "user_id"
}
```

#### 3. Case
```typescript
interface Case {
  id: string;
  case_name: string;           // E.g., "Wanjiru v. Attorney General"
  citation: string;            // E.g., "[1990] KLR 521"
  year: number;                // 1990
  court: string;               // "Supreme Court" | "High Court"
  document_id: string;         // Links to full text (LegalDocument)
  user_id: string;
  created_at: string;
}
```

#### 4. Citation
```typescript
interface Citation {
  id: string;
  source_document_id: string;  // Where referenced from (e.g., case)
  target_document_id: string;  // What was cited
  target_citation: string;     // E.g., "Evidence Act, s. 122"
  context: string;             // Surrounding text
  verified: boolean;           // Claim-to-source validation
  user_id: string;
  created_at: string;
}
```

#### 5. LegalSource
```typescript
interface LegalSource {
  id: string;
  name: string;                // "LocalCorpus" | "KenyaLaws.api"
  adapter_type: string;        // For routing to correct adapter
  metadata: Record<string, unknown>; // Adapter-specific config
  ingestion_status: string;    // "idle" | "running" | "complete"
  last_synced: string;
  user_id: string;
  created_at: string;
}
```

---

## Assumptions & Autonomous Decisions

Given the scope of this analysis, I've made the following **autonomous decisions** based on ARES LEX specification and engineering best practices:

### 1. Initial Corpus (Phase 1 MVP)
**Recommendation:** Seed with:
- Constitution of Kenya (2010)
- Evidence Act (Cap. 80)
- Three landmark cases:
  - *Wanjiru v. Attorney General* [1990] KLR 521
  - *In the Matter of an Application for Judicial Review* (recent High Court decision)
  - *Constitutional Court Case: Electoral Dispute* (2022)

**Rationale:** Small enough for fast MVP validation, large enough to test versioning and citation resolution.

### 2. Course Statute Selection
**Recommendation:** Evidence Act (primary; Evidence Acts are foundational in law schools worldwide).

**Rationale:** Used in criminal, civil, and constitutional law; critical for understanding case law.

### 3. Mnemosyne API Integration
**Assumption:** Mnemosyne already has event handlers for `learning.*` events via ARES event bus.

**Contract (to be confirmed):**
```typescript
interface LearningEvent {
  type: "learning.document_retrieved" | "learning.citation_resolved" | "learning.query_made";
  userId: string;
  timestamp: string;
  metadata: {
    documentId?: string;
    title?: string;
    query?: string;
    citationResolved?: string;
  };
}
```

---

## Implementation Phases

### Phase 1: Foundation (PR 1) ✅ Target
- [ ] Domain models (LegalDocument, Case, Citation)
- [ ] Storage migrations (schema)
- [ ] LegalSourceAdapter protocol + LocalCorpusAdapter
- [ ] Repository layer (CRUD for all entities)
- [ ] Unit tests (ingestion, versioning, citation resolution)
- [ ] Small ingestion script (Constitution, Evidence Act, 3 cases)
- [ ] Acceptance: Models apply cleanly, ingestion loads corpus, tests pass

### Phase 2: Retrieval API (PR 2)
- [ ] LegalService (search, retrieve)
- [ ] REST endpoints (GET /api/lex/search, GET /api/lex/documents/:id)
- [ ] SQLite FTS5 full-text search
- [ ] Integration tests (query → retrieval pipeline)

### Phase 3: Learning Integration (PR 3)
- [ ] CitationResolver (claim validation)
- [ ] Event emission (learning.* events)
- [ ] Mnemosyne API wiring
- [ ] POST /api/lex/queries endpoint
- [ ] POST /api/lex/claims/validate endpoint

---

## Next Steps

**Immediate action:** Implement Phase 1 (domain models, schema, adapter, tests).

**File structure to create:**

```
src/lex/
├── domain/
│   ├── documents.ts        # LegalDocument, LegalDocumentVersion
│   ├── cases.ts            # Case model
│   ├── citations.ts        # Citation model
│   └── sources.ts          # LegalSource model
├── adapters/
│   ├── protocol.ts         # LegalSourceAdapter interface
│   └── localCorpus.ts      # LocalCorpusAdapter implementation
├── repositories/
│   ├── documents.ts        # LegalDocumentRepo
│   ├── cases.ts            # CaseRepo
│   ├── citations.ts        # CitationRepo
│   └── sources.ts          # LegalSourceRepo
├── services/
│   ├── legal.ts            # LegalService (search, retrieve)
│   ├── corpus.ts           # CorpusService (ingestion, versioning)
│   └── resolver.ts         # CitationResolver
├── api/
│   └── lex.ts              # REST endpoints (Phase 2)
└── scripts/
    └── ingestCorpus.ts     # Ingestion CLI
```

---

## Sign-Off

**Status:** Ready for implementation.

**Approval needed:** User confirmation on initial corpus and Mnemosyne API contract.

**Next turn:** Begin Phase 1 implementation.
