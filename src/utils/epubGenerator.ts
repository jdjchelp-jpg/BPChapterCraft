import JSZip from 'jszip';
import { BookMetadata, ChapterItem, FormatOptions } from '../types';
import { formatDocumentText } from './parser';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an SVG book cover image when no custom cover image is uploaded
 */
function generateCoverSvg(metadata: BookMetadata): string {
  const title = escapeXml(metadata.title || 'Untitled Book');
  const subtitle = escapeXml(metadata.subtitle || '');
  const author = escapeXml(metadata.author || 'Unknown Author');
  const publisher = escapeXml(metadata.publisher || 'Silverwood Publishing');
  const year = escapeXml(metadata.year || new Date().getFullYear().toString());

  // Palette colors based on theme
  const themes = {
    'classic-navy': { bg: '#0e1e38', accent: '#d4af37', text: '#ffffff', sub: '#b0c4de' },
    'dark-editorial': { bg: '#141416', accent: '#e2b356', text: '#fafafa', sub: '#a1a1aa' },
    'warm-amber': { bg: '#2b1b12', accent: '#e09849', text: '#fff8f0', sub: '#d4b8a5' },
    'forest-sage': { bg: '#162b20', accent: '#a3c9a8', text: '#f3f7f4', sub: '#88a891' },
    'crimson-leather': { bg: '#360c14', accent: '#e5b869', text: '#fff5f5', sub: '#c99a9a' },
  };

  const currentTheme = themes[metadata.coverTheme] || themes['classic-navy'];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800">
    <defs>
      <linearGradient id="coverBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${currentTheme.bg}" />
        <stop offset="100%" stop-color="#05080f" />
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="1200" height="1800" fill="url(#coverBg)"/>
    
    <!-- Ornate Outer Border -->
    <rect x="50" y="50" width="1100" height="1700" fill="none" stroke="${currentTheme.accent}" stroke-width="6" opacity="0.8"/>
    <rect x="70" y="70" width="1060" height="1660" fill="none" stroke="${currentTheme.accent}" stroke-width="2" opacity="0.4"/>
    
    <!-- Corner Ornaments -->
    <g fill="${currentTheme.accent}" opacity="0.9">
      <circle cx="50" cy="50" r="10" />
      <circle cx="1150" cy="50" r="10" />
      <circle cx="50" cy="1750" r="10" />
      <circle cx="1150" cy="1750" r="10" />
    </g>

    <!-- Header / Genre -->
    <text x="600" y="240" font-family="Georgia, serif" font-size="28" fill="${currentTheme.sub}" text-anchor="middle" letter-spacing="12" text-transform="uppercase">
      ${escapeXml(metadata.genre ? metadata.genre.toUpperCase() : 'LITERARY EDITION')}
    </text>

    <!-- Decorative Top Divider -->
    <path d="M 450 280 L 580 280 M 600 274 L 606 280 L 600 286 L 594 280 Z M 620 280 L 750 280" stroke="${currentTheme.accent}" stroke-width="3" fill="${currentTheme.accent}"/>

    <!-- Book Title -->
    <text x="600" y="580" font-family="'Cinzel', Georgia, serif" font-size="76" font-weight="bold" fill="${currentTheme.text}" text-anchor="middle">
      ${title}
    </text>

    ${
      subtitle
        ? `<text x="600" y="680" font-family="Georgia, serif" font-size="34" font-style="italic" fill="${currentTheme.sub}" text-anchor="middle">
      ${subtitle}
    </text>`
        : ''
    }

    <!-- Center Fleur / Ornament -->
    <g transform="translate(600, 950) scale(1.6)" fill="${currentTheme.accent}" opacity="0.85">
      <path d="M 0 -40 Q 20 -20 0 0 Q -20 -20 0 -40 Z" />
      <path d="M 0 40 Q 20 20 0 0 Q -20 20 0 40 Z" />
      <path d="M -40 0 Q -20 20 0 0 Q -20 -20 -40 0 Z" />
      <path d="M 40 0 Q 20 20 0 0 Q 20 -20 40 0 Z" />
      <circle cx="0" cy="0" r="6" />
    </g>

    <!-- Author Section -->
    <text x="600" y="1320" font-family="Georgia, serif" font-size="26" fill="${currentTheme.sub}" text-anchor="middle" letter-spacing="8" text-transform="uppercase">
      WRITTEN BY
    </text>
    <text x="600" y="1390" font-family="'Cinzel', Georgia, serif" font-size="52" font-weight="600" fill="${currentTheme.accent}" text-anchor="middle" letter-spacing="4">
      ${author}
    </text>

    <!-- Bottom Publisher & Publication Year -->
    <line x1="400" y1="1540" x2="800" y2="1540" stroke="${currentTheme.accent}" stroke-width="2" opacity="0.5"/>
    <text x="600" y="1600" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="${currentTheme.text}" text-anchor="middle" letter-spacing="4">
      ${publisher}
    </text>
    <text x="600" y="1650" font-family="Georgia, serif" font-size="24" fill="${currentTheme.sub}" text-anchor="middle" letter-spacing="3">
      EST. ${year}
    </text>
  </svg>`;
}

/**
 * Builds a complete, valid EPUB archive using JSZip
 */
export async function generateEpubBlob(
  metadata: BookMetadata,
  chapters: ChapterItem[],
  options: FormatOptions
): Promise<Blob> {
  const zip = new JSZip();

  const title = metadata.title || 'Untitled Book';
  const author = metadata.author || 'Anonymous';
  const publisher = metadata.publisher || 'Independent Publisher';
  const year = metadata.year || new Date().getFullYear().toString();
  const bookId = `urn:uuid:${(metadata.title + '-' + metadata.author).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;

  // 1. mimetype file MUST be first and stored uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. Cover handling
  let hasCoverImage = false;
  let coverItemXml = '';
  let coverImageRef = 'cover.svg';

  if (metadata.coverImageUrl && metadata.coverImageUrl.startsWith('data:image/')) {
    try {
      const match = metadata.coverImageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64Data = match[2];
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpeg';
        coverImageRef = `cover-image.${ext}`;
        zip.file(`OEBPS/${coverImageRef}`, base64Data, { base64: true });
        coverItemXml = `<item id="cover-image" href="${coverImageRef}" media-type="${mime}" properties="cover-image"/>`;
        hasCoverImage = true;
      }
    } catch (e) {
      console.warn('Cover data URL error:', e);
    }
  }

  // If no custom image or failed, use generated SVG cover
  if (!hasCoverImage) {
    const coverSvg = generateCoverSvg(metadata);
    zip.file('OEBPS/cover.svg', coverSvg);
    coverItemXml = `<item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>`;
  }

  // 4. Stylesheet
  const css = `
body {
  margin: 5%;
  text-align: justify;
  font-family: serif;
  line-height: 1.6;
  color: #1a1a1a;
}
h1, h2, h3 {
  text-align: center;
  font-family: serif;
  font-weight: normal;
  margin-top: 2em;
  margin-bottom: 1em;
}
h1 { font-size: 2em; letter-spacing: 0.05em; }
h2 { font-size: 1.5em; letter-spacing: 0.05em; }
p {
  margin-top: 0;
  margin-bottom: 0.8em;
  text-indent: 1.5em;
}
p.no-indent {
  text-indent: 0;
}
.cover-wrap {
  text-align: center;
  padding: 0;
  margin: 0;
}
.cover-img {
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.title-page {
  text-align: center;
  margin-top: 15%;
}
.title-page h1 {
  font-size: 2.2em;
  margin-bottom: 0.2em;
}
.title-page .subtitle {
  font-style: italic;
  font-size: 1.2em;
  color: #555;
  margin-bottom: 2em;
}
.title-page .author {
  font-size: 1.3em;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-top: 2em;
}
.title-page .colophon {
  margin-top: 4em;
  font-size: 0.9em;
  color: #666;
}
.toc-list {
  list-style-type: none;
  padding: 0;
}
.toc-list li {
  margin-bottom: 0.8em;
}
.toc-list a {
  text-decoration: none;
  color: #222;
}
.drop-cap {
  float: left;
  font-size: 3.2em;
  line-height: 0.8;
  padding-right: 0.15em;
  font-family: serif;
  color: #8b5a2b;
}
.scene-break {
  text-align: center;
  margin: 2em 0;
  letter-spacing: 0.4em;
  color: #8b5a2b;
}
`;
  zip.file('OEBPS/styles.css', css);

  // 5. OEBPS/cover.xhtml
  const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Cover: ${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; }
    .cover-wrap { width: 100%; height: 100%; text-align: center; }
    img, svg { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <div class="cover-wrap">
    <img src="${coverImageRef}" alt="Cover of ${escapeXml(title)}" class="cover-img"/>
  </div>
</body>
</html>`;
  zip.file('OEBPS/cover.xhtml', coverHtml);

  // 6. OEBPS/titlepage.xhtml (Cover & Publisher & Year included)
  const titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)} - Title Page</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(title)}</h1>
    ${metadata.subtitle ? `<div class="subtitle">${escapeXml(metadata.subtitle)}</div>` : ''}
    <div class="author">By ${escapeXml(author)}</div>
    
    <div class="colophon">
      <p class="no-indent">Published by <strong>${escapeXml(publisher)}</strong></p>
      <p class="no-indent">Publication Year: <strong>${escapeXml(year)}</strong></p>
      ${metadata.genre ? `<p class="no-indent">Genre: ${escapeXml(metadata.genre)}</p>` : ''}
      ${metadata.isbn ? `<p class="no-indent">ISBN: ${escapeXml(metadata.isbn)}</p>` : ''}
      ${metadata.synopsis ? `<p class="no-indent" style="font-style:italic; margin-top:2em; padding: 0 10%;">“${escapeXml(metadata.synopsis)}”</p>` : ''}
    </div>
  </div>
</body>
</html>`;
  zip.file('OEBPS/titlepage.xhtml', titlePageHtml);

  // 7. OEBPS/toc.xhtml (Table of contents)
  const tocItemsHtml = chapters
    .map(
      (ch, idx) =>
        `<li style="margin-left: ${(ch.level - 1) * 1.5}em;"><a href="chapter_${idx + 1}.xhtml">${escapeXml(
          ch.cleanTitle
        )}</a></li>`
    )
    .join('\n      ');

  const tocHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2>Table of Contents</h2>
  <ul class="toc-list">
    <li><a href="titlepage.xhtml">Title &amp; Publication Details</a></li>
    ${tocItemsHtml}
  </ul>
</body>
</html>`;
  zip.file('OEBPS/toc.xhtml', tocHtml);

  // 8. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)} Navigation</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="cover.xhtml">Cover</a></li>
      <li><a href="titlepage.xhtml">Title &amp; Publication Info</a></li>
      ${chapters
        .map(
          (ch, idx) =>
            `<li><a href="chapter_${idx + 1}.xhtml">${escapeXml(ch.cleanTitle)}</a></li>`
        )
        .join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navHtml);

  // 9. Chapter files
  chapters.forEach((ch, idx) => {
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
          const first = escapeXml(p.charAt(0));
          const rest = escapeXml(p.slice(1));
          return `<p class="no-indent"><span class="drop-cap">${first}</span>${rest}</p>`;
        }
        return `<p>${escapeXml(p)}</p>`;
      })
      .join('\n  ');

    const chHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(ch.cleanTitle)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="chapter">
    <h2>${escapeXml(ch.cleanTitle)}</h2>
    ${parasHtml}
  </section>
</body>
</html>`;
    zip.file(`OEBPS/chapter_${idx + 1}.xhtml`, chHtml);
  });

  // 10. OEBPS/toc.ncx (EPUB 2 / Kindle backward compatibility)
  const navPoints = [
    `    <navPoint id="np-cover" playOrder="1">
      <navLabel><text>Cover</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`,
    `    <navPoint id="np-title" playOrder="2">
      <navLabel><text>Title &amp; Publication Info</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>`,
    `    <navPoint id="np-toc" playOrder="3">
      <navLabel><text>Table of Contents</text></navLabel>
      <content src="toc.xhtml"/>
    </navPoint>`,
    ...chapters.map(
      (ch, idx) => `    <navPoint id="np-ch-${idx + 1}" playOrder="${idx + 4}">
      <navLabel><text>${escapeXml(ch.cleanTitle)}</text></navLabel>
      <content src="chapter_${idx + 1}.xhtml"/>
    </navPoint>`
    ),
  ].join('\n');

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookId)}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <docAuthor><text>${escapeXml(author)}</text></docAuthor>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', ncx);

  // 11. OEBPS/content.opf
  const manifestItems = [
    coverItemXml,
    `<item id="styles" href="styles.css" media-type="text/css"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>`,
    ...chapters.map(
      (_, idx) =>
        `<item id="chapter_${idx + 1}" href="chapter_${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`
    ),
  ]
    .filter(Boolean)
    .join('\n    ');

  const spineItems = [
    `<itemref idref="cover"/>`,
    `<itemref idref="titlepage"/>`,
    `<itemref idref="toc"/>`,
    ...chapters.map((_, idx) => `<itemref idref="chapter_${idx + 1}"/>`),
  ].join('\n    ');

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(bookId)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <dc:date>${escapeXml(year)}</dc:date>
    <dc:language>en</dc:language>
    ${metadata.genre ? `<dc:subject>${escapeXml(metadata.genre)}</dc:subject>` : ''}
    ${metadata.synopsis ? `<dc:description>${escapeXml(metadata.synopsis)}</dc:description>` : ''}
    <meta name="cover" content="cover-image"/>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z/, 'Z')}</meta>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
  <guide>
    <reference type="cover" title="Cover" href="cover.xhtml"/>
    <reference type="title-page" title="Title Page" href="titlepage.xhtml"/>
    <reference type="toc" title="Table of Contents" href="toc.xhtml"/>
  </guide>
</package>`;
  zip.file('OEBPS/content.opf', opf);

  // Generate EPUB blob
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
