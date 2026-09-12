import { LegalDocument, LegalDocumentVersion } from '../domain/documents.js';

/**
 * LegalSourceAdapter is a protocol for pluggable legal source backends.
 * Implementations provide ingestion and citation resolution.
 */
export interface LegalSourceAdapter {
  readonly sourceType: string;

  /**
   * Ingest documents from this source
   */
  ingest(
    metadata: Record<string, unknown>,
    userId: string
  ): Promise<Array<{ document: LegalDocument; versions: LegalDocumentVersion[] }>>;

  /**
   * Resolve a citation to a document (optional, for advanced sources)
   */
  resolveCitation?(citation: string): Promise<LegalDocument | null>;
}
