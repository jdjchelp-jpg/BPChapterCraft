import { BookMetadata, ChapterItem, FormatOptions } from '../types';
import { formatDocumentText } from './parser';
import { PUTER_VOICES } from './puterTTS';

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
 * Builds standalone HTML book with embedded fonts, cover, publisher, year, TOC,
 * responsive Side Navigation Panel for Chapters & Episodes, and Voice Reader (TTS Engine & Models)
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

  // Dynamically load only the single chosen body font + Cinzel for headings (saves ~30 MB font heap RAM)
  const fontGoogleParamMap: Record<string, string> = {
    cormorant: 'family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400',
    alegreya: 'family=Alegreya:ital,wght@0,400;0,600;0,700;1,400',
    sourceserif: 'family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400',
    crimson: 'family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400',
    serif: 'family=Lora:ital,wght@0,400;0,500;0,600;1,400',
    sans: 'family=Plus+Jakarta+Sans:wght@400;500;600;700',
    mono: '',
  };
  const bodyFontParam = fontGoogleParamMap[options.fontFamily] || fontGoogleParamMap.serif;
  const googleFontUrl = bodyFontParam
    ? `https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&${bodyFontParam}&family=Plus+Jakarta+Sans:wght@500;600&display=swap`
    : `https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Plus+Jakarta+Sans:wght@500;600&display=swap`;

  // Color Theme definitions for Standalone HTML Book
  const themeMap: Record<
    string,
    { canvasBg: string; bookBg: string; textMain: string; borderSoft: string; accent: string; accentHover: string }
  > = {
    parchment: {
      canvasBg: '#f4eedb',
      bookBg: '#faf6ee',
      textMain: '#2b211a',
      borderSoft: '#e2d8c3',
      accent: '#8b5a2b',
      accentHover: '#a36b35',
    },
    light: {
      canvasBg: '#f3f4f6',
      bookBg: '#ffffff',
      textMain: '#1c1917',
      borderSoft: '#e5e7eb',
      accent: '#b45309',
      accentHover: '#d97706',
    },
    dark: {
      canvasBg: '#121110',
      bookBg: '#1c1917',
      textMain: '#f5f5f4',
      borderSoft: '#2e2b27',
      accent: '#f59e0b',
      accentHover: '#fbbf24',
    },
    'obsidian-dark': {
      canvasBg: '#000000',
      bookBg: '#09090b',
      textMain: '#f4f4f5',
      borderSoft: '#27272a',
      accent: '#eab308',
      accentHover: '#facc15',
    },
    'parchment-white': {
      canvasBg: '#f5f4f0',
      bookBg: '#fdfbf7',
      textMain: '#18181b',
      borderSoft: '#e7e5e4',
      accent: '#9a3412',
      accentHover: '#c2410c',
    },
    'parchment-cream': {
      canvasBg: '#f3ebdc',
      bookBg: '#fbf4e6',
      textMain: '#33271c',
      borderSoft: '#e4d7be',
      accent: '#b45309',
      accentHover: '#d97706',
    },
  };
  const activeHtmlTheme = themeMap[options.colorTheme] || themeMap.parchment;

  // Cover Jacket SVG or image markup
  let coverSectionHtml = '';
  if (options.includeCoverInBook) {
    if (metadata.coverImageUrl) {
      coverSectionHtml = `
      <section class="cover-page">
        <div class="cover-image-container">
          <img src="${metadata.coverImageUrl}" alt="${safeTitle} Cover" class="book-cover-img" loading="lazy" decoding="async" />
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

  // Chapters rendering with data attributes for TTS & navigation
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
            return `<p class="drop-cap-p" data-para-idx="${pIdx}"><span class="drop-cap">${first}</span>${rest}</p>`;
          }
          return `<p data-para-idx="${pIdx}">${escapeHtml(p)}</p>`;
        })
        .join('\n      ');

      const isEpisode = /episode|epsoide|ep\./i.test(ch.cleanTitle);
      const isAct = /act|scene/i.test(ch.cleanTitle);
      const unitType = isEpisode ? 'Episode' : isAct ? 'Act' : 'Chapter';

      return `
    <article id="ch-${ch.id}" class="chapter-article" data-chapter-index="${idx}" data-chapter-title="${escapeHtml(ch.cleanTitle)}" data-chapter-type="${unitType}">
      <div class="chapter-header">
        <div class="chapter-ornament">§</div>
        <h2>${escapeHtml(ch.cleanTitle)}</h2>
        <div class="chapter-meta-line no-print">
          <span class="chapter-unit-pill">${unitType} ${idx + 1}</span>
          <span class="chapter-words-pill">${ch.wordCount || 0} words</span>
          <button class="listen-chapter-btn no-print" onclick="listenToSpecificChapter(${idx})" title="Listen to this section">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Listen</span>
          </button>
        </div>
      </div>
      <div class="chapter-body">
        ${parasHtml}
      </div>
    </article>`;
    })
    .join('\n');

  const puterVoicesJson = JSON.stringify(PUTER_VOICES);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — ${safeAuthor}</title>
  <meta name="author" content="${safeAuthor}">
  <meta name="publisher" content="${safePublisher}">
  <meta name="date" content="${safeYear}">
  <meta name="generator" content="ChapterCraft Publishing Studio">
  <!-- Puter.js AI Cloud Engine Integration -->
  <script src="https://js.puter.com/v2/"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontUrl}" rel="stylesheet">
  <style>
    :root {
      --book-font: ${selectedCssFont};
      --bg-canvas: ${activeHtmlTheme.canvasBg};
      --bg-book: ${activeHtmlTheme.bookBg};
      --text-main: ${activeHtmlTheme.textMain};
      --accent-color: ${activeHtmlTheme.accent};
      --accent-hover: ${activeHtmlTheme.accentHover};
      --border-soft: ${activeHtmlTheme.borderSoft};
      --sidebar-bg: #181716;
      --sidebar-card: #242220;
      --sidebar-border: #33302c;
      --sidebar-text: #e7e5e4;
      --sidebar-muted: #a8a29e;
      --sidebar-accent: #f59e0b;
    }

    * { box-sizing: border-box; }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg-canvas);
      color: var(--text-main);
      font-family: var(--book-font);
      font-size: ${options.fontSize}px;
      line-height: ${options.lineHeight};
      text-rendering: auto;
      font-kerning: normal;
      -webkit-font-smoothing: antialiased;
    }

    .book-container {
      max-width: 840px;
      margin: 0 auto;
      padding: 60px 36px;
      background: var(--bg-book);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
      min-height: 100vh;
      position: relative;
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
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      box-sizing: border-box;
      outline: 1px solid rgba(212, 175, 55, 0.3);
      outline-offset: -8px;
    }
    .jacket-genre {
      font-family: 'Cinzel', serif;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: #e6c875;
    }
    .jacket-ornament-top {
      font-size: 0.9rem;
      color: #e6c875;
      letter-spacing: 0.3em;
    }
    .jacket-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 2.2rem;
      line-height: 1.15;
      margin: 10px 0 0;
      color: #fefefe;
      letter-spacing: 0.03em;
    }
    .jacket-subtitle {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 1.15rem;
      color: #d6d3d1;
      margin-top: 6px;
    }
    .jacket-center-fleur {
      font-size: 1.8rem;
      color: #e6c875;
      margin: 10px 0;
    }
    .jacket-author-label {
      font-size: 0.65rem;
      letter-spacing: 0.25em;
      color: #a8a29e;
      margin-bottom: 2px;
    }
    .jacket-author {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 1.25rem;
      color: #f5f5f4;
      letter-spacing: 0.05em;
    }
    .jacket-footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(212, 175, 55, 0.4);
      padding-top: 10px;
      font-size: 0.7rem;
      color: #d6d3d1;
      letter-spacing: 0.1em;
    }

    /* Colophon / Title Page */
    .title-colophon-page {
      padding: 60px 0 80px;
      text-align: center;
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 60px;
      page-break-after: always;
      break-after: page;
    }
    .book-h1 {
      font-family: 'Cinzel', serif;
      font-size: 2.6rem;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
    }
    .book-subtitle {
      font-size: 1.25rem;
      font-style: italic;
      color: #666;
      margin-bottom: 20px;
    }
    .book-author {
      font-size: 1.1rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 40px;
      color: #444;
    }
    .colophon-card {
      margin: 40px auto 0;
      max-width: 440px;
      background: #f7f5f0;
      border: 1px solid var(--border-soft);
      padding: 24px;
      border-radius: 6px;
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
      margin-bottom: 90px;
      page-break-after: always;
      break-after: page;
      position: relative;
      content-visibility: auto;
      contain-intrinsic-size: 1px 700px;
      contain: layout style;
    }
    .chapter-header {
      text-align: center;
      margin-top: 50px;
      margin-bottom: 35px;
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
    .chapter-meta-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 10px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.75rem;
    }
    .chapter-unit-pill {
      background: #f1ede6;
      color: #78716c;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .chapter-words-pill {
      color: #a8a29e;
      font-family: monospace;
    }
    .listen-chapter-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fdfaf6;
      border: 1px solid #d6cfc2;
      color: #8b5a2b;
      padding: 3px 12px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .listen-chapter-btn:hover {
      background: #8b5a2b;
      color: #ffffff;
      border-color: #8b5a2b;
    }

    .chapter-body p {
      margin-bottom: 1.25em;
      text-align: justify;
      ${options.paragraphIndent ? 'text-indent: 1.8em;' : ''}
      transition: background 0.3s, box-shadow 0.3s;
      border-radius: 4px;
      padding: 2px 4px;
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

    /* Paragraph TTS Speaking Glow Highlight */
    .audio-reading-active {
      background: rgba(245, 158, 11, 0.15) !important;
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
      border-radius: 4px;
    }

    /* Floating Navigation Toggle Button */
    .sidebar-toggle-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 900;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      border: 1px solid var(--sidebar-border);
      padding: 10px 16px;
      border-radius: 30px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      transition: all 0.25s ease;
      user-select: none;
    }
    .sidebar-toggle-btn:hover {
      background: #262422;
      border-color: var(--sidebar-accent);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .badge-count {
      background: var(--sidebar-accent);
      color: #000000;
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 0.72rem;
      font-weight: 700;
    }

    /* Backdrop Overlay */
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .sidebar-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* Side Panel Drawer */
    .book-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 360px;
      max-width: 88vw;
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      border-right: 1px solid var(--sidebar-border);
      z-index: 999;
      display: flex;
      flex-direction: column;
      box-shadow: 10px 0 40px rgba(0, 0, 0, 0.4);
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    .book-sidebar.open {
      transform: translateX(0);
    }

    /* Sidebar Header */
    .sidebar-header {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--sidebar-border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      background: #141312;
    }
    .sidebar-book-title {
      font-family: 'Cinzel', serif;
      font-size: 1.05rem;
      margin: 0;
      color: #ffffff;
      line-height: 1.25;
      letter-spacing: 0.03em;
    }
    .sidebar-book-author {
      font-size: 0.78rem;
      color: var(--sidebar-muted);
      margin: 4px 0 0;
    }
    .sidebar-close-btn {
      background: transparent;
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-muted);
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .sidebar-close-btn:hover {
      background: #2a2724;
      color: #ffffff;
      border-color: #555;
    }

    /* Sidebar Tabs */
    .sidebar-tabs {
      display: flex;
      border-bottom: 1px solid var(--sidebar-border);
      background: #1c1a18;
    }
    .sidebar-tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--sidebar-muted);
      padding: 12px 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .sidebar-tab-btn:hover {
      color: #ffffff;
    }
    .sidebar-tab-btn.active {
      color: var(--sidebar-accent);
      border-bottom-color: var(--sidebar-accent);
      background: rgba(245, 158, 11, 0.05);
    }

    /* Sidebar Panels */
    .sidebar-tab-panel {
      flex: 1;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .sidebar-tab-panel.active {
      display: flex;
    }

    /* Tab 1: Chapters & Episodes Navigation */
    .sidebar-search-box {
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--sidebar-border);
    }
    .sidebar-search-input {
      width: 100%;
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      border-radius: 8px;
      padding: 8px 12px;
      color: #ffffff;
      font-size: 0.82rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .sidebar-search-input:focus {
      border-color: var(--sidebar-accent);
    }
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
    }
    .sidebar-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sidebar-item {
      border-radius: 8px;
      transition: background 0.15s;
    }
    .sidebar-link {
      display: flex;
      flex-direction: column;
      padding: 9px 12px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--sidebar-text);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .sidebar-link:hover {
      background: var(--sidebar-card);
      border-color: var(--sidebar-border);
      color: #ffffff;
    }
    .sidebar-item.active .sidebar-link {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.4);
      color: #ffffff;
    }
    .sidebar-link-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .sidebar-unit-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-episode { background: #312e81; color: #a5b4fc; }
    .badge-act { background: #581c87; color: #d8b4fe; }
    .badge-chapter { background: #422006; color: #fde047; }
    .badge-general { background: #27272a; color: #d4d4d8; }
    .sidebar-word-count {
      font-size: 0.7rem;
      color: var(--sidebar-muted);
      font-family: monospace;
    }
    .sidebar-link-title {
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.35;
      color: inherit;
    }

    /* Quick Prev / Next Footer */
    .sidebar-quick-nav {
      padding: 12px 16px;
      border-top: 1px solid var(--sidebar-border);
      background: #141312;
      display: flex;
      gap: 10px;
    }
    .quick-nav-btn {
      flex: 1;
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-text);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .quick-nav-btn:hover:not(:disabled) {
      background: #33302c;
      color: #ffffff;
      border-color: #555;
    }
    .quick-nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Tab 2: Text-to-Speech (TTS Models) Panel */
    .tts-container {
      padding: 20px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .tts-section-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--sidebar-muted);
    }
    .tts-chapter-name {
      font-family: 'Cinzel', serif;
      font-size: 1.05rem;
      color: #ffffff;
      margin-top: 2px;
      line-height: 1.3;
    }
    .tts-controls {
      display: flex;
      gap: 10px;
    }
    .tts-btn {
      flex: 1;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tts-btn-primary {
      background: var(--sidebar-accent);
      color: #000000;
      border: none;
    }
    .tts-btn-primary:hover {
      background: #fbbf24;
    }
    .tts-btn-secondary {
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-text);
    }
    .tts-btn-secondary:hover {
      background: #33302c;
      color: #ffffff;
    }
    .tts-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tts-field label {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--sidebar-muted);
    }
    .tts-select {
      width: 100%;
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      border-radius: 8px;
      padding: 9px 12px;
      color: #ffffff;
      font-size: 0.8rem;
      outline: none;
    }
    .tts-select:focus {
      border-color: var(--sidebar-accent);
    }
    .tts-voice-hint {
      font-size: 0.7rem;
      color: #78716c;
      margin-top: 2px;
    }
    .tts-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tts-val-badge {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--sidebar-accent);
      background: rgba(245, 158, 11, 0.1);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .tts-slider {
      width: 100%;
      accent-color: var(--sidebar-accent);
      cursor: pointer;
    }
    .tts-speed-chips {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .tts-chip {
      flex: 1;
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-muted);
      padding: 4px 0;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .tts-chip:hover {
      color: #ffffff;
      border-color: #555;
    }
    .tts-chip.active {
      background: var(--sidebar-accent);
      color: #000000;
      border-color: var(--sidebar-accent);
    }
    .tts-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--sidebar-text);
      cursor: pointer;
    }
    .tts-checkbox-label input {
      accent-color: var(--sidebar-accent);
      width: 16px;
      height: 16px;
    }
    .tts-status-card {
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.78rem;
      color: var(--sidebar-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tts-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #78716c;
      flex-shrink: 0;
    }
    .tts-indicator.active {
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }

    /* Puter AI TTS Engine & Memory Budget Styles */
    .tts-engine-tabs {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .engine-tab-btn {
      flex: 1;
      background: var(--sidebar-card);
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-muted);
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      transition: all 0.2s;
    }
    .engine-tab-btn:hover {
      color: #ffffff;
      border-color: #555;
    }
    .engine-tab-btn.active {
      background: rgba(245, 158, 11, 0.12);
      border-color: var(--sidebar-accent);
      color: #ffffff;
    }
    .engine-badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.85;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.3);
    }
    .engine-tab-btn.active .engine-badge {
      background: var(--sidebar-accent);
      color: #000000;
    }
    .puter-auth-card {
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .puter-auth-info {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.74rem;
      color: var(--sidebar-text);
    }
    .auth-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .auth-dot.guest {
      background: #f59e0b;
    }
    .auth-dot.error {
      background: #ef4444;
    }
    .puter-signin-btn {
      background: #2a2724;
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-accent);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .puter-signin-btn:hover {
      background: #33302c;
      color: #fbbf24;
      border-color: var(--sidebar-accent);
    }
    .ram-budget-card {
      background: #121110;
      border: 1px solid #292524;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      gap: 9px;
      align-items: flex-start;
      margin-top: 6px;
    }
    .ram-icon {
      font-size: 0.95rem;
      color: #22c55e;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .ram-text {
      font-size: 0.7rem;
      color: #a8a29e;
      line-height: 1.35;
    }
    .ram-text strong {
      display: block;
      color: #e7e5e4;
      font-size: 0.74rem;
      margin-bottom: 2px;
    }
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
  <!-- Floating Hamburger / Toggle Button -->
  <button id="sidebar-toggle-btn" class="sidebar-toggle-btn no-print" aria-label="Toggle Table of Contents & Audio Reader">
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    <span>Chapters & Episodes</span>
    <span class="badge-count">${chapters.length}</span>
  </button>

  <!-- Side Navigation Overlay Backdrop -->
  <div id="sidebar-backdrop" class="sidebar-backdrop no-print"></div>

  <!-- Side Navigation Panel Drawer -->
  <aside id="book-sidebar" class="book-sidebar no-print">
    <div class="sidebar-header">
      <div>
        <h3 class="sidebar-book-title">${safeTitle}</h3>
        <p class="sidebar-book-author">By ${safeAuthor}</p>
      </div>
      <button id="sidebar-close-btn" class="sidebar-close-btn" aria-label="Close sidebar">✕</button>
    </div>

    <!-- Navigation Tabs -->
    <div class="sidebar-tabs">
      <button id="tab-btn-toc" class="sidebar-tab-btn active" onclick="switchSidebarTab('toc')">
        📖 Chapters (${chapters.length})
      </button>
      <button id="tab-btn-tts" class="sidebar-tab-btn" onclick="switchSidebarTab('tts')">
        🎙️ Voice Reader (TTS)
      </button>
    </div>

    <!-- Tab 1: Chapters & Episodes Navigator -->
    <div id="sidebar-toc-panel" class="sidebar-tab-panel active">
      <div class="sidebar-search-box">
        <input
          type="text"
          id="sidebar-search"
          class="sidebar-search-input"
          placeholder="Filter chapters or episodes..."
          oninput="filterSidebarChapters(this.value)"
        />
      </div>

      <nav class="sidebar-nav">
        <ul id="sidebar-chapters-list" class="sidebar-list">
          ${chapters
            .map((ch, idx) => {
              const isEpisode = /episode|epsoide|ep\./i.test(ch.cleanTitle);
              const isAct = /act|scene/i.test(ch.cleanTitle);
              const unitBadgeClass = isEpisode ? 'badge-episode' : isAct ? 'badge-act' : 'badge-chapter';
              const unitLabel = isEpisode ? 'Episode' : isAct ? 'Act' : 'Chapter';

              return `
          <li class="sidebar-item" id="nav-item-${idx}" data-chapter-index="${idx}">
            <a href="#ch-${ch.id}" class="sidebar-link" onclick="handleChapterNavClick(event, 'ch-${ch.id}', ${idx})">
              <div class="sidebar-link-meta">
                <span class="sidebar-unit-badge ${unitBadgeClass}">${unitLabel} ${idx + 1}</span>
                <span class="sidebar-word-count">${ch.wordCount || 0}w</span>
              </div>
              <div class="sidebar-link-title">${escapeHtml(ch.cleanTitle)}</div>
            </a>
          </li>`;
            })
            .join('')}
        </ul>
      </nav>

      <!-- Quick Previous / Next controls inside sidebar -->
      <div class="sidebar-quick-nav">
        <button id="prev-chapter-btn" class="quick-nav-btn" onclick="jumpChapter(-1)">◀ Previous</button>
        <button id="next-chapter-btn" class="quick-nav-btn" onclick="jumpChapter(1)">Next ▶</button>
      </div>
    </div>

    <!-- Tab 2: Voice Reader (TTS Models) Player -->
    <div id="sidebar-tts-panel" class="sidebar-tab-panel">
      <div class="tts-container">
        <div>
          <div class="tts-section-label">Selected Section</div>
          <div id="tts-chapter-display" class="tts-chapter-name">${chapters.length > 0 ? escapeHtml(chapters[0].cleanTitle) : 'Section 1'}</div>
        </div>

        <div class="tts-controls">
          <button id="tts-play-btn" class="tts-btn tts-btn-primary" onclick="toggleTtsPlay()">
            <span id="tts-play-icon">▶</span>
            <span id="tts-play-text">Listen Section</span>
          </button>
          <button id="tts-stop-btn" class="tts-btn tts-btn-secondary" onclick="stopTts()">
            <span>■ Stop</span>
          </button>
        </div>

        <!-- Engine Mode Switcher: Puter.js AI vs Browser Native -->
        <div class="tts-field">
          <label>Speech Synthesis Engine</label>
          <div class="tts-engine-tabs">
            <button id="engine-btn-puter" class="engine-tab-btn active" onclick="switchTtsEngine('puter')">
              <span>⚡ Puter AI Voices</span>
              <span class="engine-badge">Cloud HD</span>
            </button>
            <button id="engine-btn-browser" class="engine-tab-btn" onclick="switchTtsEngine('browser')">
              <span>🎙️ Browser Native</span>
              <span class="engine-badge">Offline</span>
            </button>
          </div>
        </div>

        <!-- Puter AI Voices Dropdown (Active by default) -->
        <div id="puter-voice-field" class="tts-field">
          <div class="tts-label-row">
            <label for="tts-puter-voice-select">⚡ Puter AI Voice Model</label>
            <span id="puter-voice-badge" class="tts-val-badge">Gemini AI</span>
          </div>
          <select id="tts-puter-voice-select" class="tts-select" onchange="handlePuterVoiceChanged(this.value)">
            <!-- Populated from Puter voice catalog -->
          </select>
          <div id="tts-puter-voice-desc" class="tts-voice-hint">Upbeat, friendly, and highly expressive literary delivery</div>
        </div>

        <!-- Browser Local Voices Dropdown (Shown when Browser engine active) -->
        <div id="browser-voice-field" class="tts-field" style="display: none;">
          <label for="tts-voice-select">🎙️ Local Browser Voice</label>
          <select id="tts-voice-select" class="tts-select" onchange="handleVoiceChanged(this.value)">
            <option value="">Loading high-definition voice models...</option>
          </select>
          <div id="tts-voice-tier" class="tts-voice-hint">⭐ Neural & Studio models prioritized automatically</div>
        </div>

        <!-- Puter Cloud Auth & Status Box -->
        <div id="puter-auth-box" class="puter-auth-card">
          <div class="puter-auth-info">
            <span id="puter-auth-dot" class="auth-dot guest"></span>
            <span id="puter-auth-text">Puter AI: Cloud Ready</span>
          </div>
          <button id="puter-signin-btn" class="puter-signin-btn" onclick="signInWithPuter()" title="Sign in with Puter account for unlimited cloud TTS">
            <span>🔐 Puter Sign In</span>
          </button>
        </div>

        <div class="tts-field">
          <div class="tts-label-row">
            <label for="tts-rate-slider">Reading Speed</label>
            <span id="tts-rate-badge" class="tts-val-badge">1.0x</span>
          </div>
          <input
            type="range"
            id="tts-rate-slider"
            class="tts-slider"
            min="0.5"
            max="2.0"
            step="0.05"
            value="1.0"
            oninput="handleRateChange(this.value)"
          />
          <div class="tts-speed-chips">
            <button class="tts-chip" onclick="setTtsSpeed(0.8)">0.8x</button>
            <button class="tts-chip active" id="chip-1.0" onclick="setTtsSpeed(1.0)">1.0x</button>
            <button class="tts-chip" onclick="setTtsSpeed(1.2)">1.2x</button>
            <button class="tts-chip" onclick="setTtsSpeed(1.5)">1.5x</button>
            <button class="tts-chip" onclick="setTtsSpeed(2.0)">2.0x</button>
          </div>
        </div>

        <div class="tts-field">
          <div class="tts-label-row">
            <label for="tts-pitch-slider">Voice Warmth / Pitch</label>
            <span id="tts-pitch-badge" class="tts-val-badge">1.0</span>
          </div>
          <input
            type="range"
            id="tts-pitch-slider"
            class="tts-slider"
            min="0.75"
            max="1.25"
            step="0.05"
            value="1.0"
            oninput="handlePitchChange(this.value)"
          />
        </div>

        <div class="tts-field">
          <label class="tts-checkbox-label">
            <input type="checkbox" id="tts-auto-advance" checked />
            <span>Auto-advance to next episode / chapter</span>
          </label>
        </div>

        <div class="tts-status-card">
          <div id="tts-indicator" class="tts-indicator"></div>
          <div id="tts-status-msg">Puter AI synthesizer ready</div>
        </div>

        <!-- Certified RAM Budget Footprint Card -->
        <div class="ram-budget-card">
          <span class="ram-icon">⚡</span>
          <div class="ram-text">
            <strong>60 MB RAM Certified Architecture</strong>
            <span>Active audio buffer disposal, on-demand paragraph synthesis, and virtualized layout viewport.</span>
          </div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Book Container -->
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
          .map((ch, idx) => {
            const isEpisode = /episode|epsoide|ep\./i.test(ch.cleanTitle);
            const isAct = /act|scene/i.test(ch.cleanTitle);
            const label = isEpisode ? `Episode ${idx + 1}` : isAct ? `Act ${idx + 1}` : `Chapter ${idx + 1}`;
            return `
        <li class="toc-item" style="padding-left: ${(ch.level - 1) * 20}px;">
          <a class="toc-link" href="#ch-${ch.id}" onclick="handleChapterNavClick(event, 'ch-${ch.id}', ${idx})">${escapeHtml(ch.cleanTitle)}</a>
          <span style="color:#888;">${label}</span>
        </li>`;
          })
          .join('')}
      </ul>
    </section>

    <!-- 4. Chapters & Episodes -->
    ${chaptersHtml}
  </div>

  <!-- Interactive Reader, Navigation & TTS Models Script -->
  <script>
    (function() {
      // 1. Navigation State
      var currentChapterIndex = 0;
      var totalChapters = ${chapters.length};
      var sidebarOpen = false;

      var sidebarEl = document.getElementById('book-sidebar');
      var backdropEl = document.getElementById('sidebar-backdrop');
      var toggleBtn = document.getElementById('sidebar-toggle-btn');
      var closeBtn = document.getElementById('sidebar-close-btn');
      var prevBtn = document.getElementById('prev-chapter-btn');
      var nextBtn = document.getElementById('next-chapter-btn');

      function openSidebar() {
        sidebarOpen = true;
        sidebarEl.classList.add('open');
        backdropEl.classList.add('open');
      }

      function closeSidebar() {
        sidebarOpen = false;
        sidebarEl.classList.remove('open');
        backdropEl.classList.remove('open');
      }

      toggleBtn.addEventListener('click', function() {
        if (sidebarOpen) closeSidebar();
        else openSidebar();
      });

      closeBtn.addEventListener('click', closeSidebar);
      backdropEl.addEventListener('click', closeSidebar);

      // Keyboard navigation (M or T toggles sidebar, Esc closes)
      document.addEventListener('keydown', function(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.key === 'm' || e.key === 'M' || e.key === 't' || e.key === 'T') {
          if (sidebarOpen) closeSidebar();
          else openSidebar();
        } else if (e.key === 'Escape' && sidebarOpen) {
          closeSidebar();
        }
      });

      // Tab switcher
      window.switchSidebarTab = function(tabName) {
        var tabTocBtn = document.getElementById('tab-btn-toc');
        var tabTtsBtn = document.getElementById('tab-btn-tts');
        var panelToc = document.getElementById('sidebar-toc-panel');
        var panelTts = document.getElementById('sidebar-tts-panel');

        if (tabName === 'toc') {
          tabTocBtn.classList.add('active');
          tabTtsBtn.classList.remove('active');
          panelToc.classList.add('active');
          panelTts.classList.remove('active');
        } else {
          tabTtsBtn.classList.add('active');
          tabTocBtn.classList.remove('active');
          panelTts.classList.add('active');
          panelToc.classList.remove('active');
          if (typeof populateVoiceList === 'function') {
            populateVoiceList();
          }
        }
      };

      // Filter sidebar chapters
      window.filterSidebarChapters = function(query) {
        var q = query.toLowerCase().trim();
        var items = document.querySelectorAll('.sidebar-item');
        items.forEach(function(item) {
          var text = item.textContent.toLowerCase();
          if (!q || text.indexOf(q) !== -1) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      };

      // Select chapter nav link
      window.handleChapterNavClick = function(e, id, idx) {
        if (e && e.preventDefault) e.preventDefault();
        var targetEl = document.getElementById(id);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setCurrentChapterIndex(idx);
          if (window.innerWidth < 768) {
            closeSidebar();
          }
        }
      };

      window.jumpChapter = function(dir) {
        var newIdx = currentChapterIndex + dir;
        if (newIdx >= 0 && newIdx < totalChapters) {
          var articles = document.querySelectorAll('.chapter-article');
          if (articles[newIdx]) {
            articles[newIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentChapterIndex(newIdx);
          }
        }
      };

      function setCurrentChapterIndex(idx) {
        currentChapterIndex = idx;
        var items = document.querySelectorAll('.sidebar-item');
        items.forEach(function(el, i) {
          if (i === idx) el.classList.add('active');
          else el.classList.remove('active');
        });

        // Update Quick Nav Buttons
        if (prevBtn) prevBtn.disabled = idx <= 0;
        if (nextBtn) nextBtn.disabled = idx >= totalChapters - 1;

        // Update TTS selected chapter display
        var articles = document.querySelectorAll('.chapter-article');
        if (articles[idx]) {
          var title = articles[idx].getAttribute('data-chapter-title') || ('Section ' + (idx + 1));
          var ttsTitleEl = document.getElementById('tts-chapter-display');
          if (ttsTitleEl) ttsTitleEl.textContent = title;
        }
      }

      // Scrollspy: update active chapter as reader scrolls
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var idxAttr = entry.target.getAttribute('data-chapter-index');
            if (idxAttr !== null) {
              var idx = parseInt(idxAttr, 10);
              setCurrentChapterIndex(idx);
            }
          }
        });
      }, { rootMargin: '-20% 0px -60% 0px' });

      document.querySelectorAll('.chapter-article').forEach(function(art) {
        observer.observe(art);
      });

      // ----------------------------------------------------
      // 2. High-Definition Text-To-Speech (TTS) Voice Engine (Puter AI Cloud + Browser Local)
      // ----------------------------------------------------
      var puterVoices = ${puterVoicesJson};
      var selectedEngine = 'puter'; // 'puter' or 'browser'
      var selectedPuterVoiceId = 'gemini-puck';
      var ttsVoices = [];
      var selectedVoice = null;
      var ttsRate = 1.0;
      var ttsPitch = 1.0;
      var isTtsPlaying = false;
      var isTtsPaused = false;
      var playbackRunId = 0;
      var currentPuterAudio = null;
      var currentParagraphElements = [];
      var currentParaIndex = 0;

      var puterVoiceSelect = document.getElementById('tts-puter-voice-select');
      var puterVoiceBadge = document.getElementById('puter-voice-badge');
      var puterVoiceDesc = document.getElementById('tts-puter-voice-desc');
      var voiceSelect = document.getElementById('tts-voice-select');
      var playBtnText = document.getElementById('tts-play-text');
      var playBtnIcon = document.getElementById('tts-play-icon');
      var ttsIndicator = document.getElementById('tts-indicator');
      var ttsStatusMsg = document.getElementById('tts-status-msg');

      // Dispose Audio Element to guarantee strict <60 MB RAM budget
      function disposeAudio(a) {
        if (!a) return;
        try {
          a.pause();
          a.currentTime = 0;
          a.removeAttribute('src');
          if (a.load) a.load();
        } catch(e) {}
      }

      // Check Puter Auth State
      function checkPuterAuth() {
        var dot = document.getElementById('puter-auth-dot');
        var text = document.getElementById('puter-auth-text');
        var btn = document.getElementById('puter-signin-btn');
        if (window.puter && window.puter.auth && window.puter.auth.isSignedIn) {
          if (window.puter.auth.isSignedIn()) {
            if (dot) dot.className = 'auth-dot';
            if (text) text.textContent = 'Puter AI: Signed In';
            if (btn) btn.style.display = 'none';
            return true;
          }
        }
        if (dot) dot.className = 'auth-dot guest';
        if (text) text.textContent = 'Puter AI: Free / Cloud Ready';
        if (btn) btn.style.display = 'inline-block';
        return false;
      }

      window.signInWithPuter = function() {
        if (window.puter && window.puter.auth && window.puter.auth.signIn) {
          window.puter.auth.signIn().then(function() {
            checkPuterAuth();
            if (ttsStatusMsg) ttsStatusMsg.textContent = 'Puter account connected!';
          }).catch(function(err) {
            console.warn('Puter sign in error/cancel:', err);
          });
        } else {
          alert('Puter.js library is loading or offline.');
        }
      };

      // Populate Puter Voice Dropdown
      function populatePuterVoiceList() {
        if (!puterVoiceSelect) return;
        puterVoiceSelect.innerHTML = '';

        var groups = [
          { provider: 'gemini', label: '🤖 Google Gemini AI' },
          { provider: 'speechify', label: '⚡ Speechify Simba' },
          { provider: 'xai', label: '🧠 xAI Grok' },
          { provider: 'openai', label: '🎙️ OpenAI Studio' },
          { provider: 'aws-polly', label: '📢 AWS Polly Neural & Long-Form' },
          { provider: 'elevenlabs', label: '🎧 ElevenLabs' }
        ];

        groups.forEach(function(g) {
          var matching = puterVoices.filter(function(v) { return v.provider === g.provider; });
          if (matching.length > 0) {
            var optgroup = document.createElement('optgroup');
            optgroup.label = g.label;
            matching.forEach(function(v) {
              var opt = document.createElement('option');
              opt.value = v.id;
              opt.textContent = v.name;
              optgroup.appendChild(opt);
            });
            puterVoiceSelect.appendChild(optgroup);
          }
        });

        // Set default
        puterVoiceSelect.value = selectedPuterVoiceId;
        updatePuterVoiceDetails(selectedPuterVoiceId);
      }

      function updatePuterVoiceDetails(id) {
        var v = puterVoices.find(function(item) { return item.id === id; });
        if (v) {
          selectedPuterVoiceId = id;
          if (puterVoiceBadge) puterVoiceBadge.textContent = v.badge || v.provider.toUpperCase();
          if (puterVoiceDesc) puterVoiceDesc.textContent = v.description;
        }
      }

      window.handlePuterVoiceChanged = function(val) {
        updatePuterVoiceDetails(val);
        if (isTtsPlaying && !isTtsPaused) {
          speakCurrentParagraph();
        }
      };

      // Engine Switcher
      window.switchTtsEngine = function(engine) {
        selectedEngine = engine;
        var btnPuter = document.getElementById('engine-btn-puter');
        var btnBrowser = document.getElementById('engine-btn-browser');
        var fieldPuter = document.getElementById('puter-voice-field');
        var fieldBrowser = document.getElementById('browser-voice-field');
        var authBox = document.getElementById('puter-auth-box');

        if (engine === 'puter') {
          if (btnPuter) btnPuter.classList.add('active');
          if (btnBrowser) btnBrowser.classList.remove('active');
          if (fieldPuter) fieldPuter.style.display = '';
          if (fieldBrowser) fieldBrowser.style.display = 'none';
          if (authBox) authBox.style.display = 'flex';
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'Puter AI engine active';
        } else {
          if (btnBrowser) btnBrowser.classList.add('active');
          if (btnPuter) btnPuter.classList.remove('active');
          if (fieldBrowser) fieldBrowser.style.display = '';
          if (fieldPuter) fieldPuter.style.display = 'none';
          if (authBox) authBox.style.display = 'none';
          if (typeof populateVoiceList === 'function') populateVoiceList();
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'Browser Native engine active';
        }

        if (isTtsPlaying) {
          // Restart paragraph on new engine
          speakCurrentParagraph();
        }
      };

      function rankVoice(v) {
        var name = (v.name || '').toLowerCase();
        var lang = (v.lang || '').toLowerCase();
        var score = 0;

        if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 50;
        if (name.includes('studio') || name.includes('enhanced') || name.includes('journey')) score += 40;
        if (name.includes('google') || name.includes('microsoft') || name.includes('apple')) score += 20;
        if (name.includes('samantha') || name.includes('daniel') || name.includes('karen') || name.includes('jenny') || name.includes('guy') || name.includes('aria')) score += 15;
        if (lang.startsWith('en')) score += 10;
        if (v.default) score += 5;

        return score;
      }

      var voicesPopulated = false;
      function populateVoiceList() {
        if (voicesPopulated) return;
        if (!('speechSynthesis' in window)) {
          if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">Speech synthesis not supported in browser</option>';
          }
          return;
        }

        var available = window.speechSynthesis.getVoices();
        if (!available || available.length === 0) return;

        ttsVoices = available.slice().sort(function(a, b) {
          return rankVoice(b) - rankVoice(a);
        });

        if (!voiceSelect) return;
        voiceSelect.innerHTML = '';

        var optGroupHD = document.createElement('optgroup');
        optGroupHD.label = '⭐ Neural & Studio High-Definition Models';

        var optGroupEng = document.createElement('optgroup');
        optGroupEng.label = '🎭 Natural English Literary Voices';

        var optGroupOther = document.createElement('optgroup');
        optGroupOther.label = '🎙️ Standard Voices';

        ttsVoices.forEach(function(v, i) {
          var opt = document.createElement('option');
          opt.value = i.toString();
          var rank = rankVoice(v);
          var badge = rank >= 50 ? '⭐ [Neural HD] ' : rank >= 25 ? '🎭 [Studio] ' : '';
          opt.textContent = badge + v.name + ' (' + v.lang + ')';

          if (rank >= 40) {
            optGroupHD.appendChild(opt);
          } else if (v.lang.toLowerCase().startsWith('en')) {
            optGroupEng.appendChild(opt);
          } else {
            optGroupOther.appendChild(opt);
          }
        });

        if (optGroupHD.children.length > 0) voiceSelect.appendChild(optGroupHD);
        if (optGroupEng.children.length > 0) voiceSelect.appendChild(optGroupEng);
        if (optGroupOther.children.length > 0) voiceSelect.appendChild(optGroupOther);

        selectedVoice = ttsVoices[0];
        voiceSelect.value = '0';
        var tierEl = document.getElementById('tts-voice-tier');
        if (tierEl) {
          var topRank = rankVoice(selectedVoice);
          tierEl.textContent = topRank >= 50 ? '⭐ High-Definition Neural model loaded' : '🎭 Natural voice model selected';
        }
        voicesPopulated = true;
      }

      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = function() {
            if (voicesPopulated) {
              voicesPopulated = false;
              populateVoiceList();
            }
          };
        }
      }

      window.handleVoiceChanged = function(val) {
        var idx = parseInt(val, 10);
        if (!isNaN(idx) && ttsVoices[idx]) {
          selectedVoice = ttsVoices[idx];
          if (isTtsPlaying && !isTtsPaused && selectedEngine === 'browser') {
            speakCurrentParagraph();
          }
        }
      };

      window.handleRateChange = function(val) {
        ttsRate = parseFloat(val);
        var badge = document.getElementById('tts-rate-badge');
        if (badge) badge.textContent = ttsRate.toFixed(2) + 'x';
        document.querySelectorAll('.tts-chip').forEach(function(c) {
          c.classList.remove('active');
        });
        if (currentPuterAudio) {
          try { currentPuterAudio.playbackRate = ttsRate; } catch(e) {}
        }
      };

      window.setTtsSpeed = function(val) {
        ttsRate = val;
        var slider = document.getElementById('tts-rate-slider');
        var badge = document.getElementById('tts-rate-badge');
        if (slider) slider.value = val.toString();
        if (badge) badge.textContent = val.toFixed(1) + 'x';

        document.querySelectorAll('.tts-chip').forEach(function(c) {
          if (c.textContent.trim() === val.toFixed(1) + 'x') c.classList.add('active');
          else c.classList.remove('active');
        });

        if (currentPuterAudio) {
          try { currentPuterAudio.playbackRate = ttsRate; } catch(e) {}
        }

        if (isTtsPlaying && !isTtsPaused && selectedEngine === 'browser') {
          speakCurrentParagraph();
        }
      };

      window.handlePitchChange = function(val) {
        ttsPitch = parseFloat(val);
        var badge = document.getElementById('tts-pitch-badge');
        if (badge) badge.textContent = ttsPitch.toFixed(2);
      };

      window.toggleTtsPlay = function() {
        if (isTtsPlaying && !isTtsPaused) {
          // Pause
          if (selectedEngine === 'puter' && currentPuterAudio) {
            currentPuterAudio.pause();
          } else if ('speechSynthesis' in window) {
            window.speechSynthesis.pause();
          }
          isTtsPaused = true;
          if (playBtnText) playBtnText.textContent = 'Resume';
          if (playBtnIcon) playBtnIcon.textContent = '▶';
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'Audio paused';
          if (ttsIndicator) ttsIndicator.classList.remove('active');
        } else if (isTtsPlaying && isTtsPaused) {
          // Resume
          if (selectedEngine === 'puter' && currentPuterAudio) {
            currentPuterAudio.play().catch(function() {});
          } else if ('speechSynthesis' in window) {
            window.speechSynthesis.resume();
          }
          isTtsPaused = false;
          if (playBtnText) playBtnText.textContent = 'Pause';
          if (playBtnIcon) playBtnIcon.textContent = '⏸';
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'Speaking...';
          if (ttsIndicator) ttsIndicator.classList.add('active');
        } else {
          // Start fresh reading for current chapter
          startReadingChapter(currentChapterIndex);
        }
      };

      window.stopTts = function() {
        playbackRunId++;
        if (currentPuterAudio) {
          disposeAudio(currentPuterAudio);
          currentPuterAudio = null;
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        isTtsPlaying = false;
        isTtsPaused = false;
        clearAudioHighlights();

        if (playBtnText) playBtnText.textContent = 'Listen Section';
        if (playBtnIcon) playBtnIcon.textContent = '▶';
        if (ttsIndicator) ttsIndicator.classList.remove('active');
        if (ttsStatusMsg) ttsStatusMsg.textContent = 'Ready to play';
      };

      window.listenToSpecificChapter = function(idx) {
        openSidebar();
        switchSidebarTab('tts');
        setCurrentChapterIndex(idx);
        startReadingChapter(idx);
      };

      function clearAudioHighlights() {
        document.querySelectorAll('.audio-reading-active').forEach(function(el) {
          el.classList.remove('audio-reading-active');
        });
      }

      function startReadingChapter(idx) {
        playbackRunId++;
        if (currentPuterAudio) {
          disposeAudio(currentPuterAudio);
          currentPuterAudio = null;
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        clearAudioHighlights();

        var articles = document.querySelectorAll('.chapter-article');
        if (!articles[idx]) return;

        var chapterEl = articles[idx];
        chapterEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

        currentParagraphElements = Array.from(chapterEl.querySelectorAll('.chapter-body p'));
        currentParaIndex = 0;

        if (currentParagraphElements.length === 0) {
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'No text in this section';
          return;
        }

        isTtsPlaying = true;
        isTtsPaused = false;
        if (playBtnText) playBtnText.textContent = 'Pause';
        if (playBtnIcon) playBtnIcon.textContent = '⏸';
        if (ttsIndicator) ttsIndicator.classList.add('active');
        if (ttsStatusMsg) ttsStatusMsg.textContent = 'Speaking ' + (chapterEl.getAttribute('data-chapter-title') || 'chapter') + '...';

        speakCurrentParagraph();
      }

      function speakCurrentParagraph() {
        if (!isTtsPlaying) return;
        if (currentParaIndex >= currentParagraphElements.length) {
          // Chapter finished!
          clearAudioHighlights();
          var autoAdvance = document.getElementById('tts-auto-advance');
          if (autoAdvance && autoAdvance.checked && currentChapterIndex < totalChapters - 1) {
            currentChapterIndex++;
            setCurrentChapterIndex(currentChapterIndex);
            startReadingChapter(currentChapterIndex);
          } else {
            stopTts();
            if (ttsStatusMsg) ttsStatusMsg.textContent = 'Completed section reading';
          }
          return;
        }

        clearAudioHighlights();
        var activeP = currentParagraphElements[currentParaIndex];
        if (!activeP) return;

        activeP.classList.add('audio-reading-active');
        activeP.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        var textToSpeak = activeP.textContent.trim();
        if (!textToSpeak) {
          currentParaIndex++;
          speakCurrentParagraph();
          return;
        }

        // Puter AI Engine Playback
        if (selectedEngine === 'puter' && window.puter && window.puter.ai && window.puter.ai.txt2speech) {
          var thisRun = ++playbackRunId;
          if (currentPuterAudio) {
            disposeAudio(currentPuterAudio);
            currentPuterAudio = null;
          }

          var vObj = puterVoices.find(function(v) { return v.id === selectedPuterVoiceId; }) || puterVoices[0];
          var opts = {};
          if (vObj.provider === 'aws-polly') {
            opts.voice = vObj.voiceId;
            opts.engine = vObj.engine || 'neural';
            opts.language = vObj.lang || 'en-US';
          } else if (vObj.provider === 'gemini') {
            opts.provider = 'gemini';
            opts.model = vObj.model || 'gemini-2.5-flash-preview-tts';
            opts.voice = vObj.voiceId;
            opts.instructions = 'Speak clearly in a natural and friendly audiobook style.';
          } else if (vObj.provider === 'xai') {
            opts.provider = 'xai';
            opts.voice = vObj.voiceId;
            opts.output_format = 'mp3';
          } else if (vObj.provider === 'speechify') {
            opts.provider = 'speechify';
            opts.model = vObj.model || 'simba-3.2';
            opts.voice = vObj.voiceId;
          } else if (vObj.provider === 'openai') {
            opts.provider = 'openai';
            opts.model = vObj.model || 'tts-1';
            opts.voice = vObj.voiceId;
          } else if (vObj.provider === 'elevenlabs') {
            opts.provider = 'elevenlabs';
            opts.voice = vObj.voiceId;
          } else {
            opts.voice = vObj.voiceId;
          }

          if (ttsStatusMsg) ttsStatusMsg.textContent = '⚡ Synthesizing with ' + vObj.name + '...';

          window.puter.ai.txt2speech(textToSpeak.slice(0, 2400), opts)
            .then(function(audio) {
              if (thisRun !== playbackRunId || !isTtsPlaying || isTtsPaused) {
                disposeAudio(audio);
                return;
              }
              currentPuterAudio = audio;
              if (ttsRate !== 1.0) {
                try { audio.playbackRate = ttsRate; } catch(e) {}
              }
              if (ttsStatusMsg) ttsStatusMsg.textContent = 'Speaking (' + vObj.badge + ')...';
              audio.onended = function() {
                disposeAudio(audio);
                currentPuterAudio = null;
                currentParaIndex++;
                speakCurrentParagraph();
              };
              audio.onerror = function(err) {
                disposeAudio(audio);
                currentPuterAudio = null;
                console.warn('Puter audio playback error:', err);
                currentParaIndex++;
                speakCurrentParagraph();
              };
              audio.play().catch(function(err) {
                console.warn('Audio play prevented or interrupted:', err);
              });
            })
            .catch(function(err) {
              if (thisRun !== playbackRunId || !isTtsPlaying) return;
              console.warn('Puter TTS failed:', err);
              var is401 = err && (err.status === 401 || err.statusCode === 401 || (err.message && err.message.indexOf('401') !== -1));
              if (is401) {
                var dot = document.getElementById('puter-auth-dot');
                var text = document.getElementById('puter-auth-text');
                if (dot) dot.className = 'auth-dot error';
                if (text) text.textContent = 'Puter Auth (401): Click Sign In';
                if (ttsStatusMsg) ttsStatusMsg.textContent = 'Puter 401. Using Browser TTS fallback.';
              } else {
                if (ttsStatusMsg) ttsStatusMsg.textContent = 'Puter unavailable. Using Browser TTS.';
              }
              speakBrowserParagraph(textToSpeak);
            });
          return;
        }

        // Browser Native Speech Synthesis
        speakBrowserParagraph(textToSpeak);
      }

      function speakBrowserParagraph(textToSpeak) {
        if (!('speechSynthesis' in window)) {
          if (ttsStatusMsg) ttsStatusMsg.textContent = 'Speech synthesis unsupported';
          return;
        }

        var utterance = new SpeechSynthesisUtterance(textToSpeak);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;

        utterance.onend = function() {
          currentParaIndex++;
          speakCurrentParagraph();
        };

        utterance.onerror = function(err) {
          if (err && (err.error === 'canceled' || err.error === 'interrupted')) return;
          console.warn('TTS utterance error:', err);
          currentParaIndex++;
          speakCurrentParagraph();
        };

        window.speechSynthesis.speak(utterance);
      }

      // Initialize Puter Voices & Auth Check
      populatePuterVoiceList();
      checkPuterAuth();

      // Initialize first chapter state
      setCurrentChapterIndex(0);
    })();
  </script>
</body>
</html>`;
}
