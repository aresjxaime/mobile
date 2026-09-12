import fs from 'fs';
import path from 'path';

export interface Document {
  id: string;
  path: string;
  title: string | null;
  excerpt: string | null;
  folder: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceNode {
  path: string;
  name: string;
  documents: number;
}

function readFileUtf8(p: string) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function findMarkdownFiles(root: string): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) {
        // skip node_modules and .git and .data
        if (it.name === 'node_modules' || it.name === '.git' || it.name === '.data') continue;
        walk(full);
      } else if (it.isFile() && full.toLowerCase().endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk(root);
  return results;
}

function extractTitle(content: string): string | null {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.trim();
    if (m.startsWith('# ')) return m.replace(/^# /, '').trim();
  }
  // fallback: first non-empty line
  for (const line of lines) { if (line.trim()) return line.trim().slice(0, 80); }
  return null;
}

function extractExcerpt(content: string): string | null {
  const paragraphs = content.split(/\r?\n\s*\r?\n/).map(p=>p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;
  const first = paragraphs[0];
  return first.length > 240 ? first.slice(0,240) + '...' : first;
}

export function indexWorkspace(rootPath?: string): { documents: Document[]; nodes: WorkspaceNode[] } {
  const root = rootPath || process.cwd();
  const mdFiles = findMarkdownFiles(root);
  const docs: Document[] = [];
  const folderMap: Record<string, number> = {};
  for (const f of mdFiles) {
    try {
      const rel = path.relative(root, f);
      const content = readFileUtf8(f);
      const title = extractTitle(content);
      const excerpt = extractExcerpt(content);
      const stat = fs.statSync(f);
      const folder = path.dirname(rel) === '.' ? null : path.dirname(rel);
      if (folder) folderMap[folder] = (folderMap[folder] || 0) + 1;
      docs.push({ id: rel.replace(/\\/g, '/'), path: rel.replace(/\\/g, '/'), title, excerpt, folder, createdAt: stat.birthtime.toISOString(), updatedAt: stat.mtime.toISOString() });
    } catch (e) {
      // ignore file read errors
    }
  }
  const nodes: WorkspaceNode[] = Object.keys(folderMap).map(p => ({ path: p, name: path.basename(p), documents: folderMap[p] }));
  // sort recent by updatedAt desc
  docs.sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt));
  return { documents: docs, nodes };
}
