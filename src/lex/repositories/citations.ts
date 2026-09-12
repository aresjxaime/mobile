import Database from 'better-sqlite3';
import { Citation } from '../domain/citations.js';

export function createCitationRepo(db: Database.Database) {
  return {
    create: (citation: Citation): void => {
      const stmt = db.prepare(`
        INSERT INTO legal_citations (id, source_document_id, target_document_id, target_citation, context, verified, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        citation.id,
        citation.source_document_id,
        citation.target_document_id,
        citation.target_citation,
        citation.context,
        citation.verified ? 1 : 0,
        citation.user_id,
        citation.created_at
      );
    },

    getById: (id: string): Citation | null => {
      const stmt = db.prepare(`SELECT * FROM legal_citations WHERE id = ?`);
      const row = stmt.get(id) as any;
      return row ? { id: row.id, source_document_id: row.source_document_id, target_document_id: row.target_document_id, target_citation: row.target_citation, context: row.context, verified: row.verified === 1, user_id: row.user_id, created_at: row.created_at } : null;
    },

    getBySourceDocument: (sourceDocId: string): Citation[] => {
      const stmt = db.prepare(`SELECT * FROM legal_citations WHERE source_document_id = ? ORDER BY created_at DESC`);
      const rows = stmt.all(sourceDocId) as any[];
      return rows.map(row => ({ id: row.id, source_document_id: row.source_document_id, target_document_id: row.target_document_id, target_citation: row.target_citation, context: row.context, verified: row.verified === 1, user_id: row.user_id, created_at: row.created_at }));
    },

    markVerified: (id: string): void => {
      const stmt = db.prepare(`UPDATE legal_citations SET verified = 1 WHERE id = ?`);
      stmt.run(id);
    },

    listByUser: (userId: string): Citation[] => {
      const stmt = db.prepare(`SELECT * FROM legal_citations WHERE user_id = ? ORDER BY created_at DESC`);
      const rows = stmt.all(userId) as any[];
      return rows.map(row => ({ id: row.id, source_document_id: row.source_document_id, target_document_id: row.target_document_id, target_citation: row.target_citation, context: row.context, verified: row.verified === 1, user_id: row.user_id, created_at: row.created_at }));
    },
  };
}
