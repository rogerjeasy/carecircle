import 'server-only';

/**
 * Text extraction + chunking for ingest.
 *
 * - Extraction: PDFs via `pdf-parse`; text-like files (txt/csv/md/json/html) decoded directly.
 *   Images and binary office formats we can't read as text are skipped (the caller logs + moves on).
 * - Chunking: LangChain's RecursiveCharacterTextSplitter (semantic-ish boundaries, with overlap)
 *   so neighbouring chunks share context and retrieval doesn't cut a fact in half.
 */
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const TEXT_MIME_PREFIXES = ['text/'];
const TEXT_MIME_EXACT = new Set([
  'application/json',
  'application/xml',
  'application/csv',
  'application/rtf',
]);

/** Can we extract text from this mime/filename at all? */
export function isExtractable(mimeType: string | null | undefined, fileName?: string | null): boolean {
  const mt = (mimeType ?? '').toLowerCase();
  const name = (fileName ?? '').toLowerCase();
  if (mt === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (TEXT_MIME_PREFIXES.some((p) => mt.startsWith(p)) || TEXT_MIME_EXACT.has(mt)) return true;
  return /\.(txt|md|markdown|csv|json|log|html?|xml|rtf)$/.test(name);
}

/** Extract plain text from raw bytes. Returns '' when nothing usable can be read. */
export async function extractText(
  bytes: Buffer,
  mimeType: string | null | undefined,
  fileName?: string | null,
): Promise<string> {
  const mt = (mimeType ?? '').toLowerCase();
  const name = (fileName ?? '').toLowerCase();

  if (mt === 'application/pdf' || name.endsWith('.pdf')) {
    // pdf-parse v2: class-based API, imported from the package root. Externalized in next.config.ts
    // (it + pdfjs-dist don't bundle cleanly). new PDFParse({ data }) → getText() → destroy().
    let parser: import('pdf-parse').PDFParse | null = null;
    try {
      const { PDFParse } = await import('pdf-parse');
      parser = new PDFParse({ data: new Uint8Array(bytes) });
      const result = await parser.getText();
      return (result.text ?? '').trim();
    } catch {
      return '';
    } finally {
      await parser?.destroy().catch(() => {});
    }
  }

  if (isExtractable(mt, name)) {
    try {
      return bytes.toString('utf8').trim();
    } catch {
      return '';
    }
  }
  return '';
}

let _splitter: RecursiveCharacterTextSplitter | null = null;
function splitter(): RecursiveCharacterTextSplitter {
  if (!_splitter) {
    _splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  }
  return _splitter;
}

// NUL bytes break embeddings + Postgres text; built via RegExp so no literal NUL lands in source.
const NUL = new RegExp(String.fromCharCode(0), 'g');

/** Split text into overlapping chunks; drops empties. Caps total chunks to bound cost. */
export async function chunkText(text: string, maxChunks = 200): Promise<string[]> {
  const clean = text.replace(NUL, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const chunks = await splitter().splitText(clean);
  return chunks.map((c) => c.trim()).filter(Boolean).slice(0, maxChunks);
}
