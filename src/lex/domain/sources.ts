import { v4 as uuidv4 } from "uuid";

/**
 * LegalSource tracks which adapter/corpus provided a document.
 * Used for auditability and future support of multiple sources.
 */
export interface LegalSource {
  id: string;
  name: string;
  adapter_type: string; // "local_corpus" | "external_api" | etc.
  metadata: Record<string, unknown>;
  ingestion_status: "idle" | "running" | "complete";
  last_synced: string;
  user_id: string;
  created_at: string;
}

export function createLegalSource(
  name: string,
  adapter_type: string,
  metadata: Record<string, unknown>,
  user_id: string
): LegalSource {
  return {
    id: uuidv4(),
    name,
    adapter_type,
    metadata,
    ingestion_status: "idle",
    last_synced: new Date().toISOString(),
    user_id,
    created_at: new Date().toISOString(),
  };
}
