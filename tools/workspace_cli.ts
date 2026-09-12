#!/usr/bin/env node
import { buildDashboard } from '../src/domain/dashboard.ts';

const root = process.argv[2] || process.cwd();
const summary = buildDashboard(root);
console.log('Workspace Dashboard Summary');
console.log('Total documents:', summary.totalDocuments);
console.log('\nRecent documents:');
for (const d of summary.recentDocuments) console.log(`- ${d.path} | ${d.title || 'untitled'} | ${d.updatedAt}`);
console.log('\nTop folders:');
for (const f of summary.folders) console.log(`- ${f.path} (${f.documents})`);
