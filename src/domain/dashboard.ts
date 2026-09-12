import { indexWorkspace, Document, WorkspaceNode } from '../workspace/indexer.ts';

export interface DashboardSummary {
  totalDocuments: number;
  recentDocuments: Document[];
  folders: WorkspaceNode[];
}

export function buildDashboard(rootPath?: string): DashboardSummary {
  const { documents, nodes } = indexWorkspace(rootPath);
  const total = documents.length;
  const recent = documents.slice(0, 8);
  const folders = nodes.sort((a,b)=> b.documents - a.documents).slice(0, 20);
  return { totalDocuments: total, recentDocuments: recent, folders };
}
