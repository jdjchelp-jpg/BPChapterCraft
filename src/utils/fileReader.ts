import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { DocumentUploadResult, BookMetadata } from '../types';
import { findFormatByExtension } from '../data/supportedFormats';
import {
  extractFromChapterCraftHtml,
  cleanChapterCraftExportedText,
  isChapterCraftContent,
} from './chaptercraftImporter';

export async function readUploadedDocument(file: File): Promise<DocumentUploadResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const formatDef = findFormatByExtension(fileName);
  const displayType = formatDef ? `${formatDef.name} (.${ext})` : `${ext.toUpperCase()} File`;

  // 1. EPUB & KPUB digital books (Open EPUB container using JSZip)
  if (ext === 'epub' || ext === 'kpub') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Look for META-INF/container.xml
      const containerFile = zip.file('META-INF/container.xml');
      let opfPath = '';
      if (containerFile) {
        const containerXml = await containerFile.async('text');
        const match = containerXml.match(/full-path="([^"]+)"/i);
        if (match) opfPath = match[1];
      }

      // If no container, search for any .opf file
      if (!opfPath) {
        const opfCandidate = Object.keys(zip.files).find((p) => p.toLowerCase().endsWith('.opf'));
        if (opfCandidate) opfPath = opfCandidate;
      }

      const extractedChapters: string[] = [];
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      const epubMetadata: Partial<BookMetadata> = {};

      if (opfPath && zip.file(opfPath)) {
        const opfXml = await zip.file(opfPath)!.async('text');
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(opfXml, 'application/xml');

        // Extract metadata from OPF
        const opfTitle = opfDoc.querySelector('title, dc\\:title')?.textContent?.trim();
        const opfCreator = opfDoc.querySelector('creator, dc\\:creator')?.textContent?.trim();
        const opfPublisher = opfDoc.querySelector('publisher, dc\\:publisher')?.textContent?.trim();
        const opfDate = opfDoc.querySelector('date, dc\\:date')?.textContent?.trim();
        const opfSubject = opfDoc.querySelector('subject, dc\\:subject')?.textContent?.trim();
        const opfDescription = opfDoc.querySelector('description, dc\\:description')?.textContent?.trim();

        if (opfTitle) epubMetadata.title = opfTitle;
        if (opfCreator) epubMetadata.author = opfCreator;
        if (opfPublisher) epubMetadata.publisher = opfPublisher;
        if (opfDate) epubMetadata.year = opfDate.match(/\d{4}/)?.[0] || opfDate;
        if (opfSubject) epubMetadata.genre = opfSubject;
        if (opfDescription) epubMetadata.synopsis = opfDescription;

        // Get manifest items map: id -> href
        const manifestMap = new Map<string, string>();
        opfDoc.querySelectorAll('item').forEach((item) => {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          if (id && href) manifestMap.set(id, href);
        });

        // Follow spine order
        const itemrefs = opfDoc.querySelectorAll('spine itemref');
        for (let i = 0; i < itemrefs.length; i++) {
          const idref = itemrefs[i].getAttribute('idref');
          if (idref && manifestMap.has(idref)) {
            const rawHref = manifestMap.get(idref)!;
            const fullHref = opfDir + rawHref;
            
            // Skip cover, title page, toc, and nav files so they do not pollute manuscript
            const lowerHref = rawHref.toLowerCase();
            const lowerId = idref.toLowerCase();
            if (
              lowerHref.includes('cover') ||
              lowerHref.includes('title') ||
              lowerHref.includes('toc') ||
              lowerHref.includes('nav') ||
              lowerHref.includes('colophon') ||
              lowerId.includes('cover') ||
              lowerId.includes('title') ||
              lowerId.includes('toc')
            ) {
              continue;
            }

            const entry = zip.file(fullHref) || zip.file(rawHref);
            if (entry) {
              const htmlContent = await entry.async('text');
              const structured = convertHtmlToStructuredText(htmlContent);
              if (structured.trim()) {
                extractedChapters.push(structured);
              }
            }
          }
        }
      }

      // If spine extraction was empty, search all xhtml/html files in the zip (excluding cover/toc)
      if (extractedChapters.length === 0) {
        const htmlFiles = Object.keys(zip.files)
          .filter(
            (p) =>
              /\.(xhtml|html|htm)$/i.test(p) &&
              !p.toLowerCase().includes('toc') &&
              !p.toLowerCase().includes('nav') &&
              !p.toLowerCase().includes('cover') &&
              !p.toLowerCase().includes('title')
          )
          .sort();
        for (const path of htmlFiles) {
          const content = await zip.file(path)!.async('text');
          const structured = convertHtmlToStructuredText(content);
          if (structured.trim()) extractedChapters.push(structured);
        }
      }

      const fullEpubText = extractedChapters.join('\n\n* * *\n\n');
      if (fullEpubText.trim()) {
        const cleanedResult = cleanChapterCraftExportedText(fullEpubText);
        return {
          fileName,
          fileSize,
          fileType: displayType,
          rawText: cleanedResult.cleanedText,
          metadata: { ...epubMetadata, ...cleanedResult.metadata },
          isChapterCraft: cleanedResult.isChapterCraft,
        };
      }
    } catch (epubErr) {
      console.warn('Failed to parse EPUB with JSZip, falling back to raw text extraction:', epubErr);
    }
  }

  // 2. HTML, XHTML, XML, DocBook, DITA, FDX, etc.
  if (['html', 'htm', 'xhtml', 'xht', 'xml', 'dbk', 'dita', 'ditamap', 'abw', 'fdx', 'hwpml', 'uof', 'uoml'].includes(ext)) {
    try {
      const text = await file.text();

      // Check if it's an HTML file made by ChapterCraft
      const ccResult = extractFromChapterCraftHtml(text);
      if (ccResult && ccResult.isChapterCraft) {
        return {
          fileName,
          fileSize,
          fileType: 'ChapterCraft HTML Document',
          rawText: ccResult.cleanedText,
          metadata: ccResult.metadata,
          isChapterCraft: true,
        };
      }

      const converted = convertHtmlToStructuredText(text);
      const cleaned = cleanChapterCraftExportedText(converted);
      return {
        fileName,
        fileSize,
        fileType: displayType,
        rawText: cleaned.cleanedText,
        metadata: cleaned.metadata,
        isChapterCraft: cleaned.isChapterCraft,
      };
    } catch (xmlErr) {
      console.warn('XML/HTML text read failed:', xmlErr);
    }
  }

  // 3. OpenDocument Text files (.odt, .ott, .odm, .sxw, .stw)
  if (['odt', 'ott', 'odm', 'sxw', 'stw'].includes(ext)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const contentXmlFile = zip.file('content.xml');
      if (contentXmlFile) {
        const xmlText = await contentXmlFile.async('text');
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');

        const paragraphs: string[] = [];
        const bodyElements = doc.querySelectorAll('text\\:h, text\\:p, h, p');
        bodyElements.forEach((el) => {
          const tagName = el.tagName.toLowerCase();
          const text = el.textContent?.trim() || '';
          if (!text) return;

          if (tagName.includes('h')) {
            const level = el.getAttribute('text:outline-level') || '2';
            const hashes = '#'.repeat(Math.min(parseInt(level, 10) || 2, 4));
            paragraphs.push(`${hashes} ${text}`);
          } else {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length > 0) {
          const fullText = paragraphs.join('\n\n');
          const cleaned = cleanChapterCraftExportedText(fullText);
          return {
            fileName,
            fileSize,
            fileType: displayType,
            rawText: cleaned.cleanedText,
            metadata: cleaned.metadata,
            isChapterCraft: cleaned.isChapterCraft,
          };
        }
      }
    } catch (odtErr) {
      console.warn('ODT extraction error:', odtErr);
    }
  }

  // 4. Word Documents (.docx, .docm, .dotx)
  if (['docx', 'docm', 'dotx'].includes(ext)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const converted = convertHtmlToStructuredText(result.value);
      const cleaned = cleanChapterCraftExportedText(converted);
      return {
        fileName,
        fileSize,
        fileType: displayType,
        rawText: cleaned.cleanedText,
        metadata: cleaned.metadata,
        isChapterCraft: cleaned.isChapterCraft,
      };
    } catch (err) {
      console.warn('Mammoth conversion error, attempting raw text extraction:', err);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const rawResult = await mammoth.extractRawText({ arrayBuffer });
        const cleaned = cleanChapterCraftExportedText(rawResult.value);
        return {
          fileName,
          fileSize,
          fileType: displayType,
          rawText: cleaned.cleanedText,
          metadata: cleaned.metadata,
          isChapterCraft: cleaned.isChapterCraft,
        };
      } catch (fallbackErr) {
        console.warn('Mammoth fallback failed, falling back to stream text:', fallbackErr);
      }
    }
  }

  // 5. Rich Text Format (.rtf)
  if (ext === 'rtf') {
    try {
      const rtfRaw = await file.text();
      const cleanedRtf = stripRtfFormatting(rtfRaw);
      const cleaned = cleanChapterCraftExportedText(cleanedRtf);
      return {
        fileName,
        fileSize,
        fileType: displayType,
        rawText: cleaned.cleanedText,
        metadata: cleaned.metadata,
        isChapterCraft: cleaned.isChapterCraft,
      };
    } catch (rtfErr) {
      console.warn('RTF parsing fallback:', rtfErr);
    }
  }

  // 6. General Text / Markup / Code / Logs
  // (e.g. .txt, .md, .csv, .log, .0, .1st, .600, .602, .ans, .asc, .me, .tex, .info, .troff, etc.)
  try {
    const rawContent = await file.text();
    const isMostlyText = !rawContent.includes('\0\0\0');
    if (isMostlyText) {
      const cleaned = cleanChapterCraftExportedText(rawContent);
      return {
        fileName,
        fileSize,
        fileType: displayType,
        rawText: cleaned.cleanedText,
        metadata: cleaned.metadata,
        isChapterCraft: cleaned.isChapterCraft,
      };
    }
  } catch (err) {
    console.warn('file.text() error:', err);
  }

  // 7. Binary documents fallback (e.g., .doc, .wpd, .wps, .pages, .hwp, .sdw, .pdf)
  try {
    const buffer = await file.arrayBuffer();
    const extracted = extractCleanPrintableText(new Uint8Array(buffer));
    if (extracted.trim().length > 20) {
      const cleaned = cleanChapterCraftExportedText(extracted);
      return {
        fileName,
        fileSize,
        fileType: displayType,
        rawText: cleaned.cleanedText,
        metadata: cleaned.metadata,
        isChapterCraft: cleaned.isChapterCraft,
      };
    }
  } catch (binErr) {
    console.warn('Binary text extraction error:', binErr);
  }

  // Final fallback: try raw text anyway
  const finalFallback = await file.text();
  const finalCleaned = cleanChapterCraftExportedText(finalFallback);
  return {
    fileName,
    fileSize,
    fileType: displayType,
    rawText: finalCleaned.cleanedText || 'Document imported. You can edit the text directly in the Manuscript tab.',
    metadata: finalCleaned.metadata,
    isChapterCraft: finalCleaned.isChapterCraft,
  };
}

/**
 * Strips RTF syntax codes while preserving paragraphs and bold delimiters
 */
function stripRtfFormatting(rtf: string): string {
  // Replace paragraph tokens
  let text = rtf
    .replace(/\\par[d]?\s*/gi, '\n\n')
    .replace(/\\line\s*/gi, '\n')
    .replace(/\\tab\s*/gi, '\t')
    .replace(/\\b\s+([^\\{}]+)\\b0/gi, '**$1**');

  // Strip RTF control words like \rtf1\ansi...
  text = text.replace(/\\[a-zA-Z0-9\-]+(\s|(?=[\\{}]))/g, '');

  // Strip group brackets
  text = text.replace(/[{}]/g, '');

  // Clean extra whitespace
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts HTML / XML content into structured text preserving headings and bold lines
 */
function convertHtmlToStructuredText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Strip script, style, meta, link, svg, noscript
  const removeElements = doc.querySelectorAll('script, style, meta, link, svg, noscript');
  removeElements.forEach((el) => el.remove());

  // Replace headings with Markdown equivalents
  for (let level = 1; level <= 6; level++) {
    const headings = doc.querySelectorAll(`h${level}`);
    headings.forEach((h) => {
      const hashes = '#'.repeat(level);
      const text = h.textContent?.trim() || '';
      h.outerHTML = `\n\n${hashes} ${text}\n\n`;
    });
  }

  // Process bold blocks that might be chapter headers like <p><strong>Chapter 1</strong></p>
  const paragraphs = doc.querySelectorAll('p, div, li');
  paragraphs.forEach((p) => {
    const strong = p.querySelector('strong, b');
    if (strong && strong.textContent?.trim() === p.textContent?.trim()) {
      p.outerHTML = `\n\n**${strong.textContent?.trim()}**\n\n`;
    }
  });

  // Extract clean text
  let content = doc.body.textContent || '';
  
  // Clean multiple empty lines
  content = content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content;
}

/**
 * Extracts printable ASCII/UTF-8 strings from binary buffers (for legacy word processors / formats)
 */
function extractCleanPrintableText(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let currentWord = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Printable ASCII character (space to ~) plus newline and tab
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentWord += String.fromCharCode(byte);
    } else {
      if (currentWord.trim().length > 3) {
        chunks.push(currentWord.trim());
      }
      currentWord = '';
    }
  }

  if (currentWord.trim().length > 3) {
    chunks.push(currentWord.trim());
  }

  // Filter out compiler or binary noise (e.g. strings of weird symbols)
  const filtered = chunks.filter((c) => {
    const letters = c.replace(/[^a-zA-Z]/g, '').length;
    return letters / c.length > 0.4;
  });

  return filtered.join(' ');
}

/**
 * Attempts to extract title, subtitle, author, publisher, year, genre, synopsis from initial lines or metadata
 */
export function extractInitialMetadata(text: string, fileName: string): Partial<BookMetadata> {
  const ccCheck = cleanChapterCraftExportedText(text);
  if (ccCheck.isChapterCraft && Object.keys(ccCheck.metadata).length > 0) {
    return ccCheck.metadata;
  }

  let title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  let author = '';
  let subtitle = '';
  let publisher = '';
  let year = '';
  let genre = '';
  let synopsis = '';

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 30);

  for (const line of lines) {
    const byMatch = line.match(/^(?:by|author:?)\s+([A-Z][a-zA-Z0-9\s\.,&]+)/i);
    if (byMatch) {
      author = byMatch[1].trim();
    }
    const titleMatch = line.match(/^title:?\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/[\*#]/g, '').trim();
    }
    const subMatch = line.match(/^subtitle:?\s+(.+)$/i);
    if (subMatch) {
      subtitle = subMatch[1].replace(/[\*#]/g, '').trim();
    }
    const pubMatch = line.match(/^(?:publisher:?)\s+([A-Z][a-zA-Z0-9\s\.,&]+)/i);
    if (pubMatch) {
      publisher = pubMatch[1].trim();
    }
    const yearMatch = line.match(/^(?:year|publication year|date):?\s*(\d{4})/i);
    if (yearMatch) {
      year = yearMatch[1];
    }
    const genreMatch = line.match(/^genre:?\s+(.+)$/i);
    if (genreMatch) {
      genre = genreMatch[1].trim();
    }
  }

  // Capitalize title nicely if from file name
  if (title === fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')) {
    title = title
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    title,
    author: author || undefined,
    subtitle: subtitle || undefined,
    publisher: publisher || undefined,
    year: year || undefined,
    genre: genre || undefined,
    synopsis: synopsis || undefined,
  };
}

