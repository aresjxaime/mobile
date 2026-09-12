import { v4 as uuidv4 } from "uuid";

/**
 * Case represents reported case law (court decisions).
 */
export interface Case {
  id: string;
  case_name: string;
  citation: string; // E.g., "[1990] KLR 521"
  year: number;
  court: string; // "Supreme Court" | "High Court" | etc.
  document_id: string; // Links to full text (LegalDocument)
  user_id: string;
  created_at: string;
}

export function createCase(
  case_name: string,
  citation: string,
  year: number,
  court: string,
  document_id: string,
  user_id: string
): Case {
  return {
    id: uuidv4(),
    case_name,
    citation,
    year,
    court,
    document_id,
    user_id,
    created_at: new Date().toISOString(),
  };
}
