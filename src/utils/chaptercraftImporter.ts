import { BookMetadata, ChapterItem } from '../types';

/**
 * Result of detecting and extracting ChapterCraft export data
 */
export interface ChapterCraftImportResult {
  isChapterCraft: boolean;
  metadata: Partial<BookMetadata>;
  cleanedText: string;
}

/**
 * Checks if a string (HTML or plain text) contains ChapterCraft export signatures
 */
export function isChapterCraftContent(content: string): boolean {
  if (!content) return false;

  // HTML signatures (modern & legacy ChapterCraft exports)
  if (
    content.includes('class="book-jacket"') ||
    content.includes('class="title-colophon-page"') ||
    content.includes('class="chapter-article"') ||
    content.includes('class="colophon-card"') ||
    content.includes('class="book-container"') ||
    content.includes('name="generator" content="ChapterCraft') ||
    content.includes('id="ch-chap-') ||
    content.includes('id="ch-') ||
    content.includes('class="chapter-header"') ||
    content.includes('class="chapter-body"') ||
    content.includes('class="chapter-ornament"') ||
    content.includes('class="drop-cap-p"') ||
    (content.includes('class="jacket-title"') && content.includes('class="jacket-author"')) ||
    (content.includes('class="jacket-genre"') && content.includes('jacket-ornament-top'))
  ) {
    return true;
  }

  // Text signatures (from copied/re-uploaded HTML text or text exports)
  const hasCoverOrColophon =
    (content.includes('WRITTEN BY') || content.includes('Publisher:') || content.includes('Publication Year:')) &&
    (content.includes('Table of Contents') || content.includes('EST.') || content.includes('✦ ❖ ✦') || content.includes('§'));

  return hasCoverOrColophon;
}

/**
 * Helper to convert HTML DOM node to clean Markdown while preserving italics, bold,
 * and handling drop-cap spans cleanly without duplicating text.
 */
function htmlNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Drop cap span: just return the letter cleanly
  if (
    el.classList.contains('drop-cap') ||
    el.classList.contains('dropcap') ||
    el.classList.contains('drop_cap') ||
    el.classList.contains('first-letter')
  ) {
    return el.textContent || '';
  }

  // Scene break element
  if (el.classList.contains('scene-break') || el.classList.contains('scene-divider')) {
    return '\n* * *\n';
  }

  let inner = '';
  el.childNodes.forEach((child) => {
    inner += htmlNodeToMarkdown(child);
  });

  if (tag === 'em' || tag === 'i') {
    const leading = inner.match(/^\s*/)?.[0] || '';
    const trailing = inner.match(/\s*$/)?.[0] || '';
    const trimmed = inner.trim();
    return trimmed ? `${leading}*${trimmed}*${trailing}` : inner;
  }
  if (tag === 'strong' || tag === 'b') {
    const leading = inner.match(/^\s*/)?.[0] || '';
    const trailing = inner.match(/\s*$/)?.[0] || '';
    const trimmed = inner.trim();
    return trimmed ? `${leading}**${trimmed}**${trailing}` : inner;
  }
  if (tag === 'code') {
    const trimmed = inner.trim();
    return trimmed ? `\`${trimmed}\`` : '';
  }
  if (tag === 'br') {
    return '\n';
  }

  return inner;
}

/**
 * Parses ChapterCraft HTML document:
 * Extracts cover & colophon metadata, strips cover/colophon/TOC DOM elements,
 * and extracts pristine chapter/episode text across all ChapterCraft versions.
 */
export function extractFromChapterCraftHtml(html: string): ChapterCraftImportResult | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const hasChapterArticles = doc.querySelectorAll('.chapter-article, article[id^="ch-"], .chapter-body').length > 0;
    const hasJacket = doc.querySelector('.book-jacket') !== null;
    const hasColophon = doc.querySelector('.title-colophon-page, .colophon-card') !== null;
    const hasBookContainer = doc.querySelector('.book-container') !== null;
    const hasMetaGenerator = doc.querySelector('meta[name="generator"][content*="ChapterCraft"]') !== null;

    if (!hasChapterArticles && !hasJacket && !hasColophon && !hasBookContainer && !hasMetaGenerator) {
      return null;
    }

    const metadata: Partial<BookMetadata> = {};

    // 1. Title
    const jacketTitle = doc.querySelector('.jacket-title')?.textContent?.trim();
    const bookH1 = doc.querySelector('.book-h1')?.textContent?.trim();
    const docTitle = doc.querySelector('title')?.textContent?.trim();
    const metaTitle = doc.querySelector('meta[name="title"]')?.getAttribute('content')?.trim();
    if (jacketTitle) metadata.title = jacketTitle;
    else if (bookH1) metadata.title = bookH1;
    else if (metaTitle) metadata.title = metaTitle;
    else if (docTitle) {
      metadata.title = docTitle.split('—')[0].split('-')[0].trim();
    }

    // 2. Subtitle
    const jacketSub = doc.querySelector('.jacket-subtitle')?.textContent?.trim();
    const bookSub = doc.querySelector('.book-subtitle')?.textContent?.trim();
    if (jacketSub) metadata.subtitle = jacketSub;
    else if (bookSub) metadata.subtitle = bookSub;

    // 3. Author
    const jacketAuthor = doc.querySelector('.jacket-author')?.textContent?.trim();
    const bookAuthorEl = doc.querySelector('.book-author')?.textContent?.trim();
    const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();
    if (jacketAuthor) {
      metadata.author = jacketAuthor.replace(/^By\s+/i, '').trim();
    } else if (metaAuthor) {
      metadata.author = metaAuthor;
    } else if (bookAuthorEl) {
      metadata.author = bookAuthorEl.replace(/^By\s+/i, '').trim();
    }

    // 4. Publisher, Year, Genre, ISBN, Synopsis from Colophon Card
    const colophon = doc.querySelector('.colophon-card');
    if (colophon) {
      // Direct DOM traversal of div elements in colophon card
      const divs = colophon.querySelectorAll('div');
      divs.forEach((div) => {
        const text = div.textContent?.trim() || '';
        const strongText = div.querySelector('strong')?.textContent?.trim() || '';
        const strongLower = strongText.toLowerCase();

        if (strongLower.includes('publisher') || text.toLowerCase().startsWith('publisher:')) {
          const val = text.replace(/^Publisher:\s*/i, '').trim();
          if (val) metadata.publisher = val;
        } else if (
          strongLower.includes('year') ||
          strongLower.includes('date') ||
          text.toLowerCase().startsWith('publication year:') ||
          text.toLowerCase().startsWith('year:')
        ) {
          const val = text
            .replace(/^Publication Year:\s*/i, '')
            .replace(/^Year:\s*/i, '')
            .replace(/^Date:\s*/i, '')
            .trim();
          if (val) metadata.year = val;
        } else if (strongLower.includes('genre') || text.toLowerCase().startsWith('genre:')) {
          const val = text.replace(/^Genre:\s*/i, '').trim();
          if (val) metadata.genre = val;
        } else if (strongLower.includes('isbn') || text.toLowerCase().startsWith('isbn:')) {
          const val = text.replace(/^ISBN:\s*/i, '').trim();
          if (val) metadata.isbn = val;
        } else if (
          div.getAttribute('style')?.includes('italic') ||
          div.classList.contains('synopsis') ||
          text.startsWith('“') ||
          text.startsWith('"') ||
          text.startsWith('&ldquo;')
        ) {
          // Synopsis quote (handles multiple paragraphs and smart quotes)
          const cleanSynopsis = text
            .replace(/^[\s\u201C\u201D\u2018\u2019"']+|[\s\u201C\u201D\u2018\u2019"']+$/g, '')
            .trim();
          if (cleanSynopsis.length > 10) {
            metadata.synopsis = cleanSynopsis;
          }
        }
      });

      // Fallback regex over colophon text if divs were not standard
      if (!metadata.publisher || !metadata.year || !metadata.genre || !metadata.synopsis) {
        const colophonText = colophon.textContent || '';

        if (!metadata.publisher) {
          const pubMatch = colophonText.match(/Publisher:\s*([^\n\r]+?)(?=\s*Publication Year:|\s*Genre:|\s*ISBN:|\s*“|\n|$)/i);
          if (pubMatch && pubMatch[1].trim()) metadata.publisher = pubMatch[1].trim();
        }

        if (!metadata.year) {
          const yearMatch = colophonText.match(/Publication Year:\s*([^\n\r]+?)(?=\s*Genre:|\s*ISBN:|\s*“|\n|$)/i);
          if (yearMatch && yearMatch[1].trim()) {
            metadata.year = yearMatch[1].trim();
          } else {
            const m = colophonText.match(/\d{4}(?:\s*,\s*\d{4})?/);
            if (m) metadata.year = m[0];
          }
        }

        if (!metadata.genre) {
          const genreMatch = colophonText.match(/Genre:\s*([^\n\r“]+?)(?=\s*ISBN:|\s*“|\n|$)/i);
          if (genreMatch && genreMatch[1].trim()) metadata.genre = genreMatch[1].trim();
        }

        if (!metadata.isbn) {
          const isbnMatch = colophonText.match(/ISBN:\s*([^\n\r“]+?)(?=\s*“|\n|$)/i);
          if (isbnMatch && isbnMatch[1].trim()) metadata.isbn = isbnMatch[1].trim();
        }

        if (!metadata.synopsis) {
          const synopsisMatch = colophonText.match(/[“"']([^”"'\n\r]{20,})[”"']/);
          if (synopsisMatch && synopsisMatch[1].trim()) metadata.synopsis = synopsisMatch[1].trim();
        }
      }
    }

    // Secondary sources for Publisher, Year, Genre, Synopsis
    if (!metadata.publisher) {
      const jacketPub = doc.querySelector('.jacket-publisher')?.textContent?.trim();
      const metaPub = doc.querySelector('meta[name="publisher"]')?.getAttribute('content')?.trim();
      if (jacketPub) metadata.publisher = jacketPub;
      else if (metaPub) metadata.publisher = metaPub;
    }

    if (!metadata.year) {
      const jacketYear = doc.querySelector('.jacket-year')?.textContent?.trim();
      const metaDate = doc.querySelector('meta[name="date"]')?.getAttribute('content')?.trim();
      if (jacketYear) {
        const cleanJacketYear = jacketYear.replace(/^EST\.\s*/i, '').trim();
        if (cleanJacketYear) metadata.year = cleanJacketYear;
      } else if (metaDate) {
        metadata.year = metaDate.trim();
      }
    }

    if (!metadata.genre) {
      const jacketGenre = doc.querySelector('.jacket-genre')?.textContent?.trim();
      if (jacketGenre) metadata.genre = jacketGenre;
    }

    if (!metadata.synopsis) {
      const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
      if (metaDesc) metadata.synopsis = metaDesc;
    }

    // 5. Cover Theme
    const jacketEl = doc.querySelector('.book-jacket');
    if (jacketEl) {
      const classes = jacketEl.getAttribute('class') || '';
      const themeMatch = classes.match(/theme-([a-z0-9-]+)/);
      if (themeMatch && ['classic-navy', 'dark-editorial', 'warm-amber', 'forest-sage', 'crimson-leather'].includes(themeMatch[1])) {
        metadata.coverTheme = themeMatch[1] as any;
      }
    }

    // 6. Custom Cover Image
    const coverImg = doc.querySelector('.book-cover-img, img.cover-image') as HTMLImageElement | null;
    if (coverImg && coverImg.src) {
      metadata.coverImageUrl = coverImg.src;
    }

    // 7. Extract Clean Chapters Markdown
    // Find chapter containers (supports .chapter-article, article[id^="ch-"], .chapter, etc.)
    let articles = Array.from(doc.querySelectorAll('.chapter-article'));
    if (articles.length === 0) {
      articles = Array.from(
        doc.querySelectorAll('article[id^="ch-"], section[id^="ch-"], div[id^="ch-"], article.chapter, section.chapter, div.chapter')
      );
    }
    if (articles.length === 0) {
      const bodies = Array.from(doc.querySelectorAll('.chapter-body'));
      const parentSet = new Set<Element>();
      bodies.forEach((b) => {
        if (b.parentElement && b.parentElement !== doc.body && !b.parentElement.classList.contains('book-container')) {
          parentSet.add(b.parentElement);
        } else {
          parentSet.add(b);
        }
      });
      if (parentSet.size > 0) {
        articles = Array.from(parentSet);
      }
    }

    const chapterTexts: string[] = [];

    if (articles.length > 0) {
      articles.forEach((art, artIdx) => {
        const hEl = art.querySelector('h2, h1, h3, .chapter-title, .chapter-name');
        let titleText = hEl?.textContent?.trim() || '';
        if (!titleText && art.id) {
          titleText = art.id.replace(/^ch-chap-|^ch-|^chapter-?/i, 'Chapter ');
        }
        titleText = titleText.replace(/^[\§\✦\❖\•\s\-\–\—]+/, '').trim();
        if (!titleText) {
          titleText = `Chapter ${artIdx + 1}`;
        }

        const bodyEl = art.querySelector('.chapter-body') || art;
        const parasText: string[] = [];

        // Helper to check if an element is strictly a divider/scene break
        const isDividerElement = (el: Element): boolean => {
          if (
            el.classList.contains('scene-break') ||
            el.classList.contains('scene-divider') ||
            el.tagName.toLowerCase() === 'hr'
          ) {
            return true;
          }
          const text = el.textContent?.trim() || '';
          return text === '* * *' || text === '***' || text === '✦ ✦ ✦' || text === '✦ ❖ ✦' || text === '•';
        };

        const elements = bodyEl.querySelectorAll('p, .scene-break, .scene-divider, hr, blockquote, pre');

        elements.forEach((el) => {
          // If the element is a standalone scene break / divider
          if (isDividerElement(el)) {
            if (parasText.length > 0 && parasText[parasText.length - 1] !== '* * *') {
              parasText.push('* * *');
            }
            return;
          }

          // Otherwise it's a paragraph or content block
          const rawP = htmlNodeToMarkdown(el).trim();
          if (!rawP) return;

          // Split by newlines to handle older ChapterCraft templates where multiple paragraphs
          // were placed inside a single <p class="drop-cap-p"> tag
          const lines = rawP.split(/\r?\n/);
          lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Check if line is an isolated bullet scene break (e.g. • or * * *)
            if (trimmedLine === '•' || trimmedLine === '* * *' || trimmedLine === '***') {
              if (parasText.length > 0 && parasText[parasText.length - 1] !== '* * *') {
                parasText.push('* * *');
              }
              return;
            }

            // Skip isolated decorative ornaments
            if (trimmedLine === '✦ ✦ ✦' || trimmedLine === '✦ ❖ ✦' || trimmedLine === '§' || trimmedLine === '❖') {
              return;
            }

            // Strip trailing decorative ornaments from end of paragraph (e.g. "end of chapter text.   ✦ ✦ ✦")
            const cleanLine = trimmedLine
              .replace(/\s*✦\s*[✦❖]\s*✦\s*$/, '')
              .replace(/\s*§\s*$/, '')
              .trim();

            if (cleanLine && cleanLine !== '§' && cleanLine !== '✦ ❖ ✦' && cleanLine !== '✦ ✦ ✦') {
              parasText.push(cleanLine);
            }
          });
        });

        // Clean up leading and trailing scene breaks inside the chapter
        while (parasText.length > 0 && parasText[parasText.length - 1] === '* * *') {
          parasText.pop();
        }
        while (parasText.length > 0 && parasText[0] === '* * *') {
          parasText.shift();
        }

        if (parasText.length > 0) {
          chapterTexts.push(`## ${titleText}\n\n${parasText.join('\n\n')}`);
        }
      });
    } else {
      // Fallback: search for sections or general headings inside book container
      const container = doc.querySelector('.book-container') || doc.body;
      const clone = container.cloneNode(true) as HTMLElement;

      // Remove non-manuscript sections
      const toRemove = clone.querySelectorAll(
        '.cover-page, .title-colophon-page, .toc-section, script, style, noscript, .no-print'
      );
      toRemove.forEach((el) => el.remove());

      // Find any headings
      const headings = clone.querySelectorAll('h1, h2, h3');
      if (headings.length > 0) {
        headings.forEach((h, hIdx) => {
          const hText = h.textContent?.trim() || `Section ${hIdx + 1}`;
          let pNext = h.nextElementSibling;
          const sectionParas: string[] = [];
          while (pNext && !['H1', 'H2', 'H3'].includes(pNext.tagName)) {
            if (pNext.tagName === 'P' || pNext.classList.contains('scene-break')) {
              const text = htmlNodeToMarkdown(pNext).trim();
              if (text) sectionParas.push(text);
            }
            pNext = pNext.nextElementSibling;
          }
          if (sectionParas.length > 0) {
            chapterTexts.push(`## ${hText}\n\n${sectionParas.join('\n\n')}`);
          }
        });
      }
    }

    if (chapterTexts.length > 0) {
      // Join clean chapters with quadruple newline (NEVER scene break asterisks between chapters)
      return {
        isChapterCraft: true,
        metadata,
        cleanedText: chapterTexts.join('\n\n\n\n'),
      };
    }

    return null;
  } catch (err) {
    console.warn('extractFromChapterCraftHtml error:', err);
    return null;
  }
}

/**
 * Cleans raw text or HTML that was copied/exported from ChapterCraft:
 * Strips the cover banner, colophon card, and Table of Contents block,
 * and extracts the metadata fields into BookMetadata.
 */
export function cleanChapterCraftExportedText(rawText: string): ChapterCraftImportResult {
  if (!rawText) {
    return { isChapterCraft: false, metadata: {}, cleanedText: rawText };
  }

  // 1. If text is HTML (starts with <!DOCTYPE or <html or has chapter-article/book-container/book-jacket),
  // parse it directly with extractFromChapterCraftHtml for 100% fidelity.
  const trimmed = rawText.trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<?xml') ||
    trimmed.includes('<article') ||
    trimmed.includes('<section') ||
    trimmed.includes('class="chapter-article"') ||
    trimmed.includes('class="chapter-body"') ||
    trimmed.includes('class="book-container"') ||
    trimmed.includes('class="book-jacket"') ||
    trimmed.includes('class="title-colophon-page"') ||
    trimmed.includes('class="colophon-card"') ||
    trimmed.includes('id="ch-chap-') ||
    trimmed.includes('id="ch-')
  ) {
    const htmlResult = extractFromChapterCraftHtml(rawText);
    if (htmlResult && htmlResult.cleanedText) {
      return htmlResult;
    }
  }

  const isExport = isChapterCraftContent(rawText);
  if (!isExport) {
    return { isChapterCraft: false, metadata: {}, cleanedText: rawText };
  }

  const metadata: Partial<BookMetadata> = {};

  // Extract metadata from header before the chapters
  // 1. Publisher
  const pubMatch = rawText.match(/Publisher:\s*([^\n\r<]+?)(?=\s*Publication Year:|\s*Genre:|\s*ISBN:|\s*“|\n|<|$)/i);
  if (pubMatch && pubMatch[1].trim()) {
    metadata.publisher = pubMatch[1].trim();
  }

  // 2. Publication Year
  const yearMatch =
    rawText.match(/Publication Year:\s*([0-9,\s]+?)(?=\s*Genre:|\s*ISBN:|\s*“|\n|<|$)/i) ||
    rawText.match(/Publication Year:\s*(\d{4})/i) ||
    rawText.match(/EST\.\s*([0-9,\s]+?)(?=\s*❦|\n|<|$)/i);
  if (yearMatch && yearMatch[1]) {
    metadata.year = yearMatch[1].trim();
  }

  // 3. Genre
  const genreMatch = rawText.match(/Genre:\s*([^\n\r<“]+?)(?=\s*ISBN:|\s*“|\n|<|$)/i);
  if (genreMatch && genreMatch[1].trim()) {
    metadata.genre = genreMatch[1].trim();
  } else {
    // Try top jacket banner (e.g. "EPIC FANTASY, ACTION, ADVENTURE... ✦ ❖ ✦")
    const topBannerMatch = rawText.match(/^([A-Z\s,]+)\s+✦\s+❖\s+✦/);
    if (topBannerMatch && topBannerMatch[1].trim().length > 3) {
      metadata.genre = topBannerMatch[1].trim();
    }
  }

  // 4. Synopsis
  const synopsisMatch = rawText.match(/[“"']([^”"'\n\r]{20,})[”"']/);
  if (synopsisMatch && synopsisMatch[1].trim()) {
    metadata.synopsis = synopsisMatch[1].trim();
  }

  // 5. Author
  const authorMatch = rawText.match(/(?:By|WRITTEN BY)\s*\n*([A-Za-z0-9\s,\.]+?)(?=\s*EST\.|\s*Publisher:|\s*Publication Year:|\s*❦|\n\s*\n|<|$)/i);
  if (authorMatch && authorMatch[1].trim()) {
    let auth = authorMatch[1].trim();
    auth = auth.replace(/\s*❦\s*WRITTEN BY\s*/i, '');
    metadata.author = auth;
  }

  // 6. Title & Subtitle from Jacket or Title Page
  const jacketPattern = rawText.match(/✦\s*❖\s*✦\s*\n+([^\n\r]+)(?:\s*\n+([^\n\r❦]+?))?\s*\n+\s*❦/);
  if (jacketPattern) {
    if (jacketPattern[1]) metadata.title = jacketPattern[1].trim();
    if (jacketPattern[2]) metadata.subtitle = jacketPattern[2].trim();
  } else {
    const titleMatches = [...rawText.matchAll(/#\s+([^\n\r]+)/g)];
    if (titleMatches.length > 0) {
      const firstHeading = titleMatches[0][1].trim();
      if (firstHeading.toLowerCase() !== 'table of contents') {
        metadata.title = firstHeading;
      }
      const titleRegex = new RegExp(`#\\s+${escapeRegex(metadata.title || '')}\\s*\\n+([^\\n\\r❦#]+)`);
      const subMatch = rawText.match(titleRegex);
      if (subMatch && subMatch[1]) {
        const subCandidate = subMatch[1].replace(/❦|WRITTEN BY.*/i, '').trim();
        if (subCandidate && subCandidate.length < 120 && !subCandidate.toLowerCase().startsWith('by')) {
          metadata.subtitle = subCandidate;
        }
      }
    }
  }

  // 7. Strip cover, colophon, and Table of Contents junk
  let cleanedText = rawText;

  // If text contains HTML tags (e.g. fallback when DOMParser was unavailable), clean tags
  if (cleanedText.includes('<article') || cleanedText.includes('<div') || cleanedText.includes('<p>')) {
    cleanedText = cleanedText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<section\s+class="[^"]*cover[^"]*"[\s\S]*?<\/section>/gi, '')
      .replace(/<section\s+class="[^"]*title-colophon[^"]*"[\s\S]*?<\/section>/gi, '')
      .replace(/<section\s+class="[^"]*toc[^"]*"[\s\S]*?<\/section>/gi, '')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n## $1\n\n')
      .replace(/<div\s+class="[^"]*scene-break[^"]*"[^>]*>.*?<\/div>/gi, '\n\n* * *\n\n')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  // Pattern A: ChapterCraft ornament "§" before chapter 1
  const ornamentMatch = rawText.match(/\n\s*§\s*\n+([\s\S]+)/);
  if (ornamentMatch && ornamentMatch[1].trim()) {
    cleanedText = ornamentMatch[1].trim();
    return { isChapterCraft: true, metadata, cleanedText };
  }

  // Pattern B: Look for Table of Contents marker and find the first chapter heading after it
  const tocMatch = rawText.match(/##?\s*Table of Contents/i);
  if (tocMatch && tocMatch.index !== undefined) {
    const afterToc = rawText.slice(tocMatch.index);
    const firstChapterMatch = afterToc.match(/\n\s*(##?\s*(?:Episode|Chapter|Act|Scene|Volume|Part|Prologue|Book|Day|Epsoide|Ep\.)[^\n]*)/i);
    if (firstChapterMatch && firstChapterMatch.index !== undefined) {
      cleanedText = afterToc.slice(firstChapterMatch.index).trim();
      return { isChapterCraft: true, metadata, cleanedText };
    }
  }

  // Pattern C: If there was a colophon with Synopsis in quotes, chapter usually starts after synopsis
  if (metadata.synopsis) {
    const synopsisIndex = rawText.indexOf(metadata.synopsis);
    if (synopsisIndex !== -1) {
      const afterSynopsis = rawText.slice(synopsisIndex + metadata.synopsis.length);
      const chapterMatch = afterSynopsis.match(/\n\s*(##?\s*(?:Episode|Chapter|Act|Scene|Volume|Part|Prologue|Book|Day|Epsoide|Ep\.)[^\n]*)/i);
      if (chapterMatch && chapterMatch.index !== undefined) {
        cleanedText = afterSynopsis.slice(chapterMatch.index).trim();
        return { isChapterCraft: true, metadata, cleanedText };
      }
    }
  }

  return { isChapterCraft: true, metadata, cleanedText };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
