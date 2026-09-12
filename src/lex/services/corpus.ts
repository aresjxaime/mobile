import Database from 'better-sqlite3';
import { createLegalDocumentRepo, createLegalDocumentVersionRepo } from '../repositories/documents.js';
import { createCaseRepo } from '../repositories/cases.js';
import { createLegalSourceRepo } from '../repositories/sources.js';
import { LegalSourceAdapter } from '../adapters/protocol.js';
import { LegalDocument, LegalDocumentVersion, createLegalDocument, createLegalDocumentVersion } from '../domain/documents.js';
import { createCase } from '../domain/cases.js';

export function createCorpusService(db: Database.Database, emit?: (event: string, data: any) => void) {
  const docRepo = createLegalDocumentRepo(db);
  const versionRepo = createLegalDocumentVersionRepo(db);
  const caseRepo = createCaseRepo(db);
  const sourceRepo = createLegalSourceRepo(db);

  return {
    /**
     * Ingest documents from a source adapter
     */
    async ingestSource(
      sourceId: string,
      adapter: LegalSourceAdapter,
      userId: string
    ): Promise<{ documentsAdded: number; versionsCreated: number }> {
      const source = sourceRepo.getById(sourceId);
      if (!source) throw new Error(`Source ${sourceId} not found`);

      sourceRepo.updateStatus(sourceId, 'running');

      try {
        const results = await adapter.ingest({ sourceId }, userId);
        let docsAdded = 0;
        let versionsCreated = 0;

        for (const { document, versions } of results) {
          docRepo.create(document);
          docsAdded++;

          for (const version of versions) {
            versionRepo.create(version);
            versionsCreated++;
            docRepo.updateLatestVersion(document.id, version.id);
          }
        }

        sourceRepo.updateStatus(sourceId, 'complete');
        if (emit) emit('learning.corpus_ingested', { sourceId, documentsAdded: docsAdded, versionsCreated, userId });

        return { documentsAdded: docsAdded, versionsCreated };
      } catch (error) {
        sourceRepo.updateStatus(sourceId, 'idle');
        throw error;
      }
    },

    /**
     * Create a new version of a document
     */
    async createVersion(
      documentId: string,
      newContent: string,
      userId: string
    ): Promise<LegalDocumentVersion> {
      const doc = docRepo.getById(documentId);
      if (!doc) throw new Error(`Document ${documentId} not found`);

      const latestVersion = versionRepo.getLatest(documentId);
      const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

      const { createHash } = await import('crypto');
      const contentHash = createHash('sha256').update(newContent).digest('hex');

      const version = createLegalDocumentVersion(
        documentId,
        nextVersionNumber,
        newContent,
        contentHash,
        new Date().toISOString(),
        userId
      );

      versionRepo.create(version);
      docRepo.updateLatestVersion(documentId, version.id);

      if (emit) emit('learning.document_updated', { documentId, versionNumber: nextVersionNumber, userId });

      return version;
    },
  };
}
