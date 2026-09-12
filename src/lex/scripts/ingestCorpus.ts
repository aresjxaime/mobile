import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createLegalSourceRepo } from '../repositories/sources.js';
import { createCorpusService } from '../services/corpus.js';
import { LocalCorpusAdapter } from '../adapters/localCorpus.js';
import { createLegalSource } from '../domain/sources.js';

/**
 * Ingest seed corpus: Constitution, Evidence Act, and landmark cases
 * Run with: node tools/ingestCorpus.ts
 */
async function main() {
  const DB_PATH = path.resolve(process.cwd(), '.data', 'aries.db');

  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Initialize schema if not already done
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        document_type TEXT NOT NULL,
        first_published TEXT,
        latest_version_id TEXT,
        source_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS legal_document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        published_date TEXT,
        ingested_at TEXT NOT NULL,
        created_by TEXT,
        UNIQUE(document_id, version_number)
      );
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_name TEXT NOT NULL,
        citation TEXT UNIQUE NOT NULL,
        year INTEGER,
        court TEXT,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS legal_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        adapter_type TEXT NOT NULL,
        metadata TEXT,
        ingestion_status TEXT DEFAULT 'idle',
        last_synced TEXT,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  } catch (e) {
    // Tables already exist
  }

  const sourceRepo = createLegalSourceRepo(db);
  const corpusService = createCorpusService(db, (event: string, data: Record<string, unknown>) => {
    console.log(`[LEX] ${event}:`, data);
  });

  const userId = 'migration';

  // Create source
  const source = createLegalSource(
    'Local Corpus',
    'local_corpus',
    { description: 'Constitution, Evidence Act, and landmark cases' },
    userId
  );

  try {
    sourceRepo.create(source);
    console.log(`✅ Created source: ${source.id}`);

    // Ingest
    const result = await corpusService.ingestSource(source.id, LocalCorpusAdapter, userId);
    console.log(`✅ Ingestion complete: ${result.documentsAdded} documents, ${result.versionsCreated} versions`);

    // Verify
    const allDocs = db.prepare('SELECT COUNT(*) as count FROM legal_documents').get() as any;
    const allVersions = db.prepare('SELECT COUNT(*) as count FROM legal_document_versions').get() as any;
    console.log(`✅ Verification: ${allDocs.count} documents, ${allVersions.count} versions in database`);

    db.close();
    console.log('✅ Ingestion script completed successfully');
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    db.close();
    process.exit(1);
  }
}

main();
