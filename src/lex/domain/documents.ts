import { v4 as uuidv4 } from "uuid";

/**
 * LegalDocument represents a legal statute, case, or regulation.
 * Documents are immutable; changes are tracked via LegalDocumentVersion.
 */
export interface LegalDocument {
  id: string;
  title: string;
  document_type: "statute" | "case" | "regulation";
  first_published: string; // ISO 8601
  latest_version_id: string;
  source_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * LegalDocumentVersion stores immutable copies of document content.
 * Each version includes a content hash for deduplication and audit.
 */
export interface LegalDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string; // Full legal text
  content_hash: string; // SHA-256
  published_date: string;
  ingested_at: string;
  created_by: string; // "migration" | user_id
}

export function createLegalDocument(
  title: string,
  document_type: "statute" | "case" | "regulation",
  first_published: string,
  source_id: string,
  user_id: string
): LegalDocument {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title,
    document_type,
    first_published,
    latest_version_id: "", // Set by version creation
    source_id,
    user_id,
    created_at: now,
    updated_at: now,
  };
}

export function createLegalDocumentVersion(
  document_id: string,
  version_number: number,
  content: string,
  content_hash: string,
  published_date: string,
  created_by: string
): LegalDocumentVersion {
  return {
    id: uuidv4(),
    document_id,
    version_number,
    content,
    content_hash,
    published_date,
    ingested_at: new Date().toISOString(),
    created_by,
  };
}
