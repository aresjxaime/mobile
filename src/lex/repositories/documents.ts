import Database from 'better-sqlite3';
import { LegalDocument, LegalDocumentVersion } from '../domain/documents.js';

export function createLegalDocumentRepo(db: Database.Database) {
  return {
    create: (doc: LegalDocument): void => {
      const stmt = db.prepare(`
        INSERT INTO legal_documents 
        (id, title, document_type, first_published, latest_version_id, source_id, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        doc.id,
        doc.title,
        doc.document_type,
        doc.first_published,
        doc.latest_version_id,
        doc.source_id,
        doc.user_id,
        doc.created_at,
        doc.updated_at
      );
    },

    getById: (id: string): LegalDocument | null => {
      const stmt = db.prepare(`
        SELECT * FROM legal_documents WHERE id = ?
      `);
      const row = stmt.get(id) as any;
      return row ? {
        id: row.id,
        title: row.title,
        document_type: row.document_type,
        first_published: row.first_published,
        latest_version_id: row.latest_version_id,
        source_id: row.source_id,
        user_id: row.user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : null;
    },

    listBySource: (sourceId: string): LegalDocument[] => {
      const stmt = db.prepare(`
        SELECT * FROM legal_documents WHERE source_id = ?
      `);
      const rows = stmt.all(sourceId) as any[];
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        document_type: row.document_type,
        first_published: row.first_published,
        latest_version_id: row.latest_version_id,
        source_id: row.source_id,
        user_id: row.user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },

    listByUser: (userId: string): LegalDocument[] => {
      const stmt = db.prepare(`
        SELECT * FROM legal_documents WHERE user_id = ?
      `);
      const rows = stmt.all(userId) as any[];
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        document_type: row.document_type,
        first_published: row.first_published,
        latest_version_id: row.latest_version_id,
        source_id: row.source_id,
        user_id: row.user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },

    updateLatestVersion: (id: string, versionId: string): void => {
      const stmt = db.prepare(`
        UPDATE legal_documents SET latest_version_id = ?, updated_at = ? WHERE id = ?
      `);
      stmt.run(versionId, new Date().toISOString(), id);
    },
  };
}

export function createLegalDocumentVersionRepo(db: Database.Database) {
  return {
    create: (version: LegalDocumentVersion): void => {
      const stmt = db.prepare(`
        INSERT INTO legal_document_versions
        (id, document_id, version_number, content, content_hash, published_date, ingested_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        version.id,
        version.document_id,
        version.version_number,
        version.content,
        version.content_hash,
        version.published_date,
        version.ingested_at,
        version.created_by
      );
    },

    getLatest: (documentId: string): LegalDocumentVersion | null => {
      const stmt = db.prepare(`
        SELECT * FROM legal_document_versions WHERE document_id = ? ORDER BY version_number DESC LIMIT 1
      `);
      const row = stmt.get(documentId) as any;
      return row ? {
        id: row.id,
        document_id: row.document_id,
        version_number: row.version_number,
        content: row.content,
        content_hash: row.content_hash,
        published_date: row.published_date,
        ingested_at: row.ingested_at,
        created_by: row.created_by,
      } : null;
    },

    getByDocumentAndNumber: (documentId: string, versionNumber: number): LegalDocumentVersion | null => {
      const stmt = db.prepare(`
        SELECT * FROM legal_document_versions WHERE document_id = ? AND version_number = ?
      `);
      const row = stmt.get(documentId, versionNumber) as any;
      return row ? {
        id: row.id,
        document_id: row.document_id,
        version_number: row.version_number,
        content: row.content,
        content_hash: row.content_hash,
        published_date: row.published_date,
        ingested_at: row.ingested_at,
        created_by: row.created_by,
      } : null;
    },

    listAllVersions: (documentId: string): LegalDocumentVersion[] => {
      const stmt = db.prepare(`
        SELECT * FROM legal_document_versions WHERE document_id = ? ORDER BY version_number ASC
      `);
      const rows = stmt.all(documentId) as any[];
      return rows.map(row => ({
        id: row.id,
        document_id: row.document_id,
        version_number: row.version_number,
        content: row.content,
        content_hash: row.content_hash,
        published_date: row.published_date,
        ingested_at: row.ingested_at,
        created_by: row.created_by,
      }));
    },
  };
}
