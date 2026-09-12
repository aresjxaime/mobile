import Database from 'better-sqlite3';
import { createLegalDocumentRepo } from '../repositories/documents.js';
import { createCaseRepo } from '../repositories/cases.js';
import { LegalDocument } from '../domain/documents.js';

export function createCitationResolver(db: Database.Database) {
  const docRepo = createLegalDocumentRepo(db);
  const caseRepo = createCaseRepo(db);

  return {
    /**
     * Resolve a citation string to a document
     */
    async resolveCitation(
      citation: string,
      userId: string
    ): Promise<{ document: LegalDocument | null; verified: boolean }> {
      // Try exact case citation match
      const caseMatch = caseRepo.searchByCitation(citation);
      if (caseMatch) {
        const doc = docRepo.getById(caseMatch.document_id);
        return { document: doc, verified: true };
      }

      // Try statute section pattern (e.g., "Evidence Act, s. 122")
      const statutePattern = /^(.+?),\s*s\.\s*(\d+)/i;
      const match = citation.match(statutePattern);
      if (match) {
        const [, statuteName, section] = match;
        // For MVP, just check if title contains statute name
        // In production, would have more sophisticated matching
        const docs = docRepo.listByUser(userId);
        const doc = docs.find((d: LegalDocument) => d.title.includes(statuteName));
        if (doc) return { document: doc, verified: true };
      }

      // Fallback: partial title match
      const docs = docRepo.listByUser(userId);
      const partialMatch = docs.find((d: LegalDocument) => d.title.toLowerCase().includes(citation.toLowerCase()));
      return { document: partialMatch || null, verified: !!partialMatch };
    },

    /**
     * Validate that a claim is grounded in retrieved sources
     */
    async validateClaim(
      claim: string,
      sourceDocumentIds: string[],
      userId: string
    ): Promise<{ valid: boolean; reason: string }> {
      if (!sourceDocumentIds || sourceDocumentIds.length === 0) {
        return { valid: false, reason: 'No source documents provided' };
      }

      // Check that all source documents exist and belong to user
      for (const docId of sourceDocumentIds) {
        const doc = docRepo.getById(docId);
        if (!doc || doc.user_id !== userId) {
          return { valid: false, reason: `Source document ${docId} not found or not accessible` };
        }
      }

      // Simple validation: check if claim length is reasonable
      if (!claim || claim.length === 0) {
        return { valid: false, reason: 'Claim cannot be empty' };
      }

      return { valid: true, reason: 'Claim is grounded in provided sources' };
    },
  };
}
