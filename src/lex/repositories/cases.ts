import Database from 'better-sqlite3';
import { Case } from '../domain/cases.js';

export function createCaseRepo(db: Database.Database) {
  return {
    create: (c: Case): void => {
      const stmt = db.prepare(`
        INSERT INTO cases (id, case_name, citation, year, court, document_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(c.id, c.case_name, c.citation, c.year, c.court, c.document_id, c.user_id, c.created_at);
    },

    getById: (id: string): Case | null => {
      const stmt = db.prepare(`SELECT * FROM cases WHERE id = ?`);
      const row = stmt.get(id) as any;
      return row ? { id: row.id, case_name: row.case_name, citation: row.citation, year: row.year, court: row.court, document_id: row.document_id, user_id: row.user_id, created_at: row.created_at } : null;
    },

    searchByCitation: (citation: string): Case | null => {
      const stmt = db.prepare(`SELECT * FROM cases WHERE citation = ?`);
      const row = stmt.get(citation) as any;
      return row ? { id: row.id, case_name: row.case_name, citation: row.citation, year: row.year, court: row.court, document_id: row.document_id, user_id: row.user_id, created_at: row.created_at } : null;
    },

    listByYear: (year: number): Case[] => {
      const stmt = db.prepare(`SELECT * FROM cases WHERE year = ? ORDER BY case_name ASC`);
      const rows = stmt.all(year) as any[];
      return rows.map(row => ({ id: row.id, case_name: row.case_name, citation: row.citation, year: row.year, court: row.court, document_id: row.document_id, user_id: row.user_id, created_at: row.created_at }));
    },

    listByUser: (userId: string): Case[] => {
      const stmt = db.prepare(`SELECT * FROM cases WHERE user_id = ? ORDER BY year DESC`);
      const rows = stmt.all(userId) as any[];
      return rows.map(row => ({ id: row.id, case_name: row.case_name, citation: row.citation, year: row.year, court: row.court, document_id: row.document_id, user_id: row.user_id, created_at: row.created_at }));
    },
  };
}
