import Database from 'better-sqlite3';
import { LegalSource } from '../domain/sources.js';

export function createLegalSourceRepo(db: Database.Database) {
  return {
    create: (source: LegalSource): void => {
      const stmt = db.prepare(`
        INSERT INTO legal_sources (id, name, adapter_type, metadata, ingestion_status, last_synced, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        source.id,
        source.name,
        source.adapter_type,
        JSON.stringify(source.metadata),
        source.ingestion_status,
        source.last_synced,
        source.user_id,
        source.created_at
      );
    },

    getById: (id: string): LegalSource | null => {
      const stmt = db.prepare(`SELECT * FROM legal_sources WHERE id = ?`);
      const row = stmt.get(id) as any;
      return row ? {
        id: row.id,
        name: row.name,
        adapter_type: row.adapter_type,
        metadata: JSON.parse(row.metadata || '{}'),
        ingestion_status: row.ingestion_status,
        last_synced: row.last_synced,
        user_id: row.user_id,
        created_at: row.created_at,
      } : null;
    },

    listByUser: (userId: string): LegalSource[] => {
      const stmt = db.prepare(`SELECT * FROM legal_sources WHERE user_id = ? ORDER BY created_at DESC`);
      const rows = stmt.all(userId) as any[];
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        adapter_type: row.adapter_type,
        metadata: JSON.parse(row.metadata || '{}'),
        ingestion_status: row.ingestion_status,
        last_synced: row.last_synced,
        user_id: row.user_id,
        created_at: row.created_at,
      }));
    },

    updateStatus: (id: string, status: string): void => {
      const stmt = db.prepare(`UPDATE legal_sources SET ingestion_status = ?, last_synced = ? WHERE id = ?`);
      stmt.run(status, new Date().toISOString(), id);
    },
  };
}
