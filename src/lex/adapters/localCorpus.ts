import { createHash } from 'crypto';
import { LegalSourceAdapter } from './protocol.js';
import { LegalDocument, LegalDocumentVersion, createLegalDocument, createLegalDocumentVersion } from '../domain/documents.js';
import { Case, createCase } from '../domain/cases.js';

/**
 * LocalCorpusAdapter ingests legal documents from local seed data.
 * Used for MVP validation with Constitution, Evidence Act, and landmark cases.
 */
export const LocalCorpusAdapter: LegalSourceAdapter = {
  sourceType: 'local_corpus',

  async ingest(
    metadata: Record<string, unknown>,
    userId: string
  ): Promise<Array<{ document: LegalDocument; versions: LegalDocumentVersion[] }>> {
    const corpus = [
      {
        title: 'Constitution of Kenya',
        type: 'statute' as const,
        year: 2010,
        content: `CONSTITUTION OF THE REPUBLIC OF KENYA

Preamble
We, the people of Kenya...

Article 1: Sovereignty
The people of Kenya are sovereign.

Article 2: Supremacy of Constitution
The Constitution is the supreme law of the land.

[Full Constitution text would be loaded from seed data]`,
      },
      {
        title: 'The Evidence Act (Cap. 80)',
        type: 'statute' as const,
        year: 1961,
        content: `THE EVIDENCE ACT
Chapter 80 of the Laws of Kenya

Section 1: Short Title
This Act may be cited as the Evidence Act.

Section 2: Application
This Act applies to all judicial proceedings.

Section 3: Competency of Witnesses
Every person is competent to give evidence.

[Full Evidence Act would be loaded from seed data]`,
      },
      {
        title: 'Wanjiru v. Attorney General',
        type: 'case' as const,
        year: 1990,
        citation: '[1990] KLR 521',
        court: 'Supreme Court',
        content: `WANJIRU v. ATTORNEY GENERAL
[1990] KLR 521

Before: [Judges]

Facts:
[Case facts and holding]

Decision:
[Judgment text]`,
      },
      {
        title: 'In the Matter of an Application for Judicial Review',
        type: 'case' as const,
        year: 2015,
        citation: '[2015] eKLR',
        court: 'High Court',
        content: `IN THE MATTER OF AN APPLICATION FOR JUDICIAL REVIEW
[2015] eKLR

Petitioner v. Respondent

Before: [Judges]

Facts:
[Case facts]

Decision:
[Judgment text]`,
      },
      {
        title: 'Kisii County v. Independent Electoral Commission',
        type: 'case' as const,
        year: 2022,
        citation: '[2022] eKLR',
        court: 'Supreme Court',
        content: `KISII COUNTY v. INDEPENDENT ELECTORAL COMMISSION
[2022] eKLR

Before: [Judges]

Facts:
Electoral dispute regarding county boundaries.

Decision:
[Constitutional judgment on electoral boundaries]`,
      },
    ];

    const results: Array<{ document: LegalDocument; versions: LegalDocumentVersion[] }> = [];

    for (const item of corpus) {
      const doc = createLegalDocument(
        item.title,
        item.type,
        `${item.year}-01-01T00:00:00Z`,
        metadata.sourceId as string || 'local_corpus',
        userId
      );

      const contentHash = createHash('sha256').update(item.content).digest('hex');
      const version = createLegalDocumentVersion(
        doc.id,
        1,
        item.content,
        contentHash,
        `${item.year}-01-01T00:00:00Z`,
        'migration'
      );

      doc.latest_version_id = version.id;
      results.push({ document: doc, versions: [version] });
    }

    return results;
  },

  async resolveCitation(citation: string): Promise<LegalDocument | null> {
    // Simple resolution: check if citation matches any local document
    // In a real system, this would query the database
    return null;
  },
};
