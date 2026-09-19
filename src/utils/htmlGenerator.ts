import { BookMetadata, ChapterItem, FormatOptions } from '../types';
import { formatDocumentText } from './parser';

function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds standalone HTML with embedded fonts, cover, publisher, year, TOC, and chapters
 */
export function generateStandaloneHtmlBook(
  metadata: BookMetadata,
  chapters: ChapterItem[],
  options: FormatOptions
): string {
  const safeTitle = escapeHtml(metadata.title || 'Untitled Book');
  const safeSubtitle = escapeHtml(metadata.subtitle || '');
  const safeAuthor = escapeHtml(metadata.author || 'Author');
  const safePublisher = escapeHtml(metadata.publisher || 'Silverwood Publishing');
  const safeYear = escapeHtml(metadata.year || new Date().getFullYear().toString());
  const safeGenre = escapeHtml(metadata.genre || '');
  const safeSynopsis = escapeHtml(metadata.synopsis || '');

  // Font family resolution
  const fontFamilyMap = {
    cormorant: "'Cormorant Garamond', Georgia, serif",
    alegreya: "'Alegreya', Georgia, serif",
    sourceserif: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
    crimson: "'Crimson Text', Georgia, serif",
    serif: "'Lora', Georgia, serif",
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "monospace",
  };

  const selectedCssFont = fontFamilyMap[options.fontFamily] || fontFamilyMap.serif;

  // Cover Jacket SVG or image markup
  let coverSectionHtml = '';
  if (options.includeCoverInBook) {
    if (metadata.coverImageUrl) {
      coverSectionHtml = `
      <section class="cover-page">
        <div class="cover-image-container">
          <img src="${metadata.coverImageUrl}" alt="${safeTitle} Cover" class="book-cover-img" />
        </div>
      </section>`;
    } else {
      // Styled Book Jacket
      coverSectionHtml = `
      <section class="cover-page">
        <div class="book-jacket theme-${metadata.coverTheme}">
          <div class="jacket-border">
            <div class="jacket-genre">${safeGenre ? safeGenre.toUpperCase() : 'LITERARY EDITION'}</div>
            <div class="jacket-ornament-top">✦ ❖ ✦</div>
            <h1 class="jacket-title">${safeTitle}</h1>
            ${safeSubtitle ? `<div class="jacket-subtitle">${safeSubtitle}</div>` : ''}
            <div class="jacket-center-fleur">❦</div>
            <div class="jacket-author-label">WRITTEN BY</div>
            <div class="jacket-author">${safeAuthor}</div>
            <div class="jacket-footer">
              <div class="jacket-publisher">${safePublisher}</div>
              <div class="jacket-year">EST. ${safeYear}</div>
            </div>
          </div>
        </div>
      </section>`;
    }
  }

  // Chapters rendering
  const chaptersHtml = chapters
    .map((ch, idx) => {
      const formatted = formatDocumentText(ch.content, {
        curlyQuotes: options.curlyQuotes,
        emDashes: options.emDashes,
        ellipses: options.ellipses,
        cleanDoubleSpacing: options.cleanDoubleSpacing,
        sceneBreakOrnament: options.sceneBreakOrnament,
      });

      const paras = formatted.split('\n\n').filter(Boolean);
      const parasHtml = paras
        .map((p, pIdx) => {
          if (p.includes('scene-break') || /^\s*(\*|\✦|\❦|—)/.test(p)) {
            return `<div class="scene-break">✦ ✦ ✦</div>`;
          }
          if (pIdx === 0 && options.dropCaps && p.length > 20) {
            const first = escapeHtml(p.charAt(0));
            const rest = escapeHtml(p.slice(1));
            return `<p class="drop-cap-p"><span class="drop-cap">${first}</span>${rest}</p>`;
          }
          return `<p>${escapeHtml(p)}</p>`;
        })
        .join('\n      ');

      return `
    <article id="ch-${ch.id}" class="chapter-article">
      <div class="chapter-header">
        <div class="chapter-ornament">§</div>
        <h2>${escapeHtml(ch.cleanTitle)}</h2>
      </div>
      <div class="chapter-body">
        ${parasHtml}
      </div>
    </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — ${safeAuthor}</title>
  <meta name="author" content="${safeAuthor}">
  <meta name="publisher" content="${safePublisher}">
  <meta name="date" content="${safeYear}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400;1,600&family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --book-font: ${selectedCssFont};
      --bg-canvas: #faf8f5;
      --text-main: #24201c;
      --accent-color: #8b5a2b;
      --border-soft: #e2ddd3;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg-canvas);
      color: var(--text-main);
      font-family: var(--book-font);
      font-size: ${options.fontSize}px;
      line-height: ${options.lineHeight};
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    .book-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 60px 32px;
      background: #ffffff;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
      min-height: 100vh;
    }

    /* Cover Styling */
    .cover-page {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 80px;
      page-break-after: always;
      break-after: page;
    }
    .cover-image-container {
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.18);
      border-radius: 8px;
      overflow: hidden;
    }
    .book-cover-img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Designed Book Jacket */
    .book-jacket {
      width: 100%;
      max-width: 520px;
      aspect-ratio: 1 / 1.5;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      text-align: center;
    }
    .theme-classic-navy { background: linear-gradient(135deg, #0e1e38 0%, #060b14 100%); color: #ffffff; }
    .theme-dark-editorial { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); color: #ffffff; }
    .theme-warm-amber { background: linear-gradient(135deg, #2b1b12 0%, #150a05 100%); color: #ffffff; }
    .theme-forest-sage { background: linear-gradient(135deg, #162b20 0%, #08120c 100%); color: #ffffff; }
    .theme-crimson-leather { background: linear-gradient(135deg, #360c14 0%, #170407 100%); color: #ffffff; }

    .jacket-border {
      border: 2px solid rgba(212, 175, 55, 0.7);
      height: 100%;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      outline: 1px dashed rgba(212, 175, 55, 0.4);
      outline-offset: -8px;
    }
    .jacket-genre {
      font-size: 11px;
      letter-spacing: 0.3em;
      color: #d4af37;
      text-transform: uppercase;
    }
    .jacket-ornament-top {
      color: #d4af37;
      letter-spacing: 0.3em;
      font-size: 14px;
      margin: 10px 0;
    }
    .jacket-title {
      font-family: 'Cinzel', serif;
      font-size: 2.2rem;
      margin: 10px 0;
      color: #ffffff;
      line-height: 1.2;
    }
    .jacket-subtitle {
      font-style: italic;
      font-size: 1rem;
      color: #e2e8f0;
      margin-bottom: 20px;
    }
    .jacket-center-fleur {
      font-size: 2rem;
      color: #d4af37;
      margin: 20px 0;
    }
    .jacket-author-label {
      font-size: 10px;
      letter-spacing: 0.25em;
      color: #cbd5e1;
    }
    .jacket-author {
      font-family: 'Cinzel', serif;
      font-size: 1.4rem;
      color: #d4af37;
      margin-top: 4px;
    }
    .jacket-footer {
      border-top: 1px solid rgba(212, 175, 55, 0.4);
      padding-top: 14px;
      margin-top: 20px;
    }
    .jacket-publisher {
      font-weight: bold;
      font-size: 13px;
      letter-spacing: 0.15em;
    }
    .jacket-year {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 4px;
    }

    /* Title & Colophon Page */
    .title-colophon-page {
      text-align: center;
      padding: 80px 0 60px;
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 60px;
      page-break-after: always;
      break-after: page;
    }
    .book-h1 {
      font-family: 'Cinzel', serif;
      font-size: 2.8rem;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }
    .book-subtitle {
      font-style: italic;
      color: #665f55;
      font-size: 1.2rem;
      margin-bottom: 30px;
    }
    .book-author {
      font-size: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin: 30px 0;
    }
    .colophon-card {
      margin-top: 50px;
      padding: 24px;
      background: #faf8f5;
      border: 1px solid var(--border-soft);
      border-radius: 8px;
      display: inline-block;
      text-align: left;
      font-size: 0.9rem;
      color: #57534e;
      line-height: 1.6;
    }
    .colophon-card strong { color: #1c1917; }

    /* Table of Contents */
    .toc-section {
      padding: 40px 0 60px;
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 60px;
      page-break-after: always;
      break-after: page;
    }
    .toc-title {
      font-family: 'Cinzel', serif;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-size: 1.6rem;
      margin-bottom: 30px;
    }
    .toc-list {
      list-style: none;
      padding: 0;
      max-width: 600px;
      margin: 0 auto;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 1rem;
    }
    .toc-link {
      color: var(--text-main);
      text-decoration: none;
      transition: color 0.2s;
    }
    .toc-link:hover {
      color: var(--accent-color);
      text-decoration: underline;
    }

    /* Chapter Articles */
    .chapter-article {
      margin-bottom: 80px;
      page-break-after: always;
      break-after: page;
    }
    .chapter-header {
      text-align: center;
      margin-top: 50px;
      margin-bottom: 40px;
    }
    .chapter-ornament {
      color: var(--accent-color);
      font-size: 1.4rem;
      margin-bottom: 8px;
    }
    .chapter-header h2 {
      font-family: 'Cinzel', serif;
      font-size: 2.2rem;
      margin: 0;
      letter-spacing: 0.05em;
    }
    .chapter-body p {
      margin-bottom: 1.2em;
      text-align: justify;
      ${options.paragraphIndent ? 'text-indent: 1.8em;' : ''}
    }
    .drop-cap-p {
      text-indent: 0 !important;
    }
    .drop-cap {
      float: left;
      font-size: 3.6rem;
      line-height: 0.8;
      padding-right: 10px;
      padding-top: 4px;
      font-family: 'Cinzel', Georgia, serif;
      color: var(--accent-color);
    }
    .scene-break {
      text-align: center;
      margin: 40px 0;
      letter-spacing: 0.4em;
      color: var(--accent-color);
    }

    /* Print & PDF Specific Styles */
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; color: #000000 !important; }
      .book-container {
        max-width: 100% !important;
        padding: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
      }
      .cover-page, .title-colophon-page, .toc-section, .chapter-article {
        page-break-after: always !important;
        break-after: page !important;
      }
      @page {
        margin: 20mm;
        size: auto;
      }
    }
  </style>
</head>
<body>
  <div class="book-container">
    <!-- 1. Book Cover Page -->
    ${coverSectionHtml}

    <!-- 2. Title & Colophon / Publisher Page -->
    <section class="title-colophon-page">
      <h1 class="book-h1">${safeTitle}</h1>
      ${safeSubtitle ? `<div class="book-subtitle">${safeSubtitle}</div>` : ''}
      <div class="book-author">By ${safeAuthor}</div>

      <div class="colophon-card">
        <div><strong>Publisher:</strong> ${safePublisher}</div>
        <div><strong>Publication Year:</strong> ${safeYear}</div>
        ${safeGenre ? `<div><strong>Genre:</strong> ${safeGenre}</div>` : ''}
        ${metadata.isbn ? `<div><strong>ISBN:</strong> ${escapeHtml(metadata.isbn)}</div>` : ''}
        ${safeSynopsis ? `<div style="margin-top:12px; font-style:italic;">“${safeSynopsis}”</div>` : ''}
      </div>
    </section>

    <!-- 3. Table of Contents -->
    <section class="toc-section">
      <h2 class="toc-title">Table of Contents</h2>
      <ul class="toc-list">
        ${chapters
          .map(
            (ch, idx) => `
        <li class="toc-item" style="padding-left: ${(ch.level - 1) * 20}px;">
          <a class="toc-link" href="#ch-${ch.id}">${escapeHtml(ch.cleanTitle)}</a>
          <span style="color:#888;">Chapter ${idx + 1}</span>
        </li>`
          )
          .join('')}
      </ul>
    </section>

    <!-- 4. Chapters -->
    ${chaptersHtml}
  </div>
</body>
</html>`;
}
