/**
 * Ingest text extraction + chunking — pdf-parse is MOCKED; everything else is pure (no AWS, no DB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getTextMock = vi.fn();
const destroyMock = vi.fn(async () => {});
vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(() => ({ getText: getTextMock, destroy: destroyMock })),
}));

import { isExtractable, extractText, chunkText } from '../chunk';

beforeEach(() => {
  getTextMock.mockReset();
  destroyMock.mockClear();
});

describe('isExtractable', () => {
  it.each([
    ['application/pdf', null],
    ['text/plain', null],
    ['text/csv', null],
    ['application/json', null],
    [null, 'notes.md'],
    [null, 'scan.PDF'.toLowerCase()],
    ['application/octet-stream', 'export.csv'], // filename rescues a generic mime
  ])('accepts mime=%s file=%s', (mime, name) => {
    expect(isExtractable(mime, name)).toBe(true);
  });

  it.each([
    ['image/png', 'photo.png'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc.docx'],
    [null, null],
    ['', ''],
  ])('rejects mime=%s file=%s', (mime, name) => {
    expect(isExtractable(mime, name)).toBe(false);
  });
});

describe('extractText', () => {
  it('decodes text-like bytes directly', async () => {
    expect(await extractText(Buffer.from('  hello world \n'), 'text/plain')).toBe('hello world');
  });

  it('extracts PDFs through the MOCKED pdf-parse and always destroys the parser', async () => {
    getTextMock.mockResolvedValue({ text: '  Care plan, page 1.  ' });
    const out = await extractText(Buffer.from('%PDF-fake'), 'application/pdf', 'plan.pdf');
    expect(out).toBe('Care plan, page 1.');
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('returns "" (never throws) when the PDF parser fails', async () => {
    getTextMock.mockRejectedValue(new Error('corrupt pdf'));
    await expect(extractText(Buffer.from('junk'), 'application/pdf')).resolves.toBe('');
  });

  it('returns "" for unreadable binary formats so the caller can skip them', async () => {
    expect(await extractText(Buffer.from([0xff, 0xd8]), 'image/jpeg', 'photo.jpg')).toBe('');
  });
});

describe('chunkText', () => {
  it('returns [] for empty / whitespace-only input', async () => {
    expect(await chunkText('')).toEqual([]);
    expect(await chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', async () => {
    expect(await chunkText('A short care note.')).toEqual(['A short care note.']);
  });

  it('splits long text into overlapping chunks within the 1000-char size', async () => {
    const text = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} about daily care.`).join(' ');
    const chunks = await chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
    // Overlap: consecutive chunks share context so retrieval doesn't cut a fact in half.
    const tail = chunks[0].slice(-40);
    expect(chunks[1]).toContain(tail.split(' ').slice(1).join(' ').slice(0, 20));
  });

  it('strips NUL bytes (they break embeddings and Postgres text)', async () => {
    const nul = String.fromCharCode(0);
    const chunks = await chunkText(`before${nul}after`);
    expect(chunks).toEqual(['beforeafter']);
  });

  it('caps the number of chunks to bound embedding cost', async () => {
    const text = Array.from({ length: 500 }, (_, i) => `Paragraph ${i}. ${'word '.repeat(150)}`).join('\n\n');
    const chunks = await chunkText(text, 10);
    expect(chunks).toHaveLength(10);
  });
});
