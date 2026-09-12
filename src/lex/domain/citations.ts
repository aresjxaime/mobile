import { v4 as uuidv4 } from "uuid";

/**
 * Citation tracks references between legal documents.
 * Used to validate that claims are grounded in retrieved sources.
 */
export interface Citation {
  id: string;
  source_document_id: string; // Where the citation appears
  target_document_id: string | null; // What was cited (may be null if unresolved)
  target_citation: string; // E.g., "Evidence Act, s. 122"
  context: string; // Surrounding text
  verified: boolean; // Has this citation been validated?
  user_id: string;
  created_at: string;
}

export function createCitation(
  source_document_id: string,
  target_citation: string,
  context: string,
  user_id: string,
  target_document_id?: string
): Citation {
  return {
    id: uuidv4(),
    source_document_id,
    target_document_id: target_document_id || null,
    target_citation,
    context,
    verified: false,
    user_id,
    created_at: new Date().toISOString(),
  };
}
