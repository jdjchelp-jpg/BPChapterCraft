import { ChapterItem, HeadingLevel, ParsingConfig } from '../types';

export function parseDocumentStructure(
  text: string,
  config: ParsingConfig
): ChapterItem[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  interface MatchCandidate {
    lineIndex: number;
    charIndex: number;
    rawText: string;
    cleanText: string;
    level: HeadingLevel;
    prefix?: string;
    subtitle?: string;
  }

  const candidates: MatchCandidate[] = [];
  let charCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const currentPos = charCounter;
    charCounter += line.length + 1; // +1 for \n

    if (!trimmed) continue;

    let matched = false;

    // 1. Custom Regex Check if enabled
    if (config.detectCustomRegex && config.customRegexPattern) {
      try {
        const regex = new RegExp(config.customRegexPattern, 'i');
        const match = trimmed.match(regex);
        if (match) {
          const clean = trimmed.replace(/^[\*#\s\-_>]+|[\*#\s\-_<]+$/g, '').trim();
          candidates.push({
            lineIndex: i,
            charIndex: currentPos,
            rawText: line,
            cleanText: clean || trimmed,
            level: 1,
            prefix: match[1] || 'Section',
            subtitle: match[2] || clean,
          });
          matched = true;
          continue;
        }
      } catch (e) {
        console.warn('Invalid custom regex:', e);
      }
    }

    // 2. Bold Delimiters Check (e.g. ** Chapter 2 Bess**, **Episode 1: Pilot**, **Epsoide 1 Bess**)
    if (config.detectBoldMarkdown && !matched) {
      // Matches **...** or <b>...</b> or <strong>...</strong> that occupies the majority of the line
      const boldMdMatch = trimmed.match(/^\*{2,3}\s*(.+?)\s*\*{2,3}$/);
      const boldHtmlMatch = trimmed.match(/^<(?:b|strong)>\s*(.+?)\s*<\/(?:b|strong)>$/i);
      
      const boldContent = (boldMdMatch && boldMdMatch[1]) || (boldHtmlMatch && boldHtmlMatch[1]);
      if (boldContent) {
        const innerClean = boldContent.trim();
        const parsed = dissectChapterTitle(innerClean, config.stripLeadingNumbers);
        const isChapterLike = isRecognizedUnitOrStructural(innerClean);
        const isShortTitle = innerClean.length < 90 && !/[.!?]$/.test(innerClean);

        if (isChapterLike || isShortTitle) {
          candidates.push({
            lineIndex: i,
            charIndex: currentPos,
            rawText: line,
            cleanText: parsed.fullTitle,
            level: parsed.level,
            prefix: parsed.prefix,
            subtitle: parsed.subtitle,
          });
          matched = true;
          continue;
        }
      }
    }

    // 3. Markdown / HTML Headings (# Chapter 1, ## Episode 2, <h2>Section 2</h2>, etc.)
    if (config.detectHeadings && !matched) {
      const mdHeadingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      const htmlHeadingMatch = trimmed.match(/^<h([1-4])(?:\s+[^>]*)?>\s*(.+?)\s*<\/h\1>$/i);

      if (mdHeadingMatch) {
        const depth = mdHeadingMatch[1].length;
        const headingText = mdHeadingMatch[2].replace(/\*{1,3}/g, '').trim();
        const parsed = dissectChapterTitle(headingText, config.stripLeadingNumbers);
        const level: HeadingLevel = depth === 1 ? parsed.level : depth === 2 ? 2 : 3;

        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      } else if (htmlHeadingMatch) {
        const depth = parseInt(htmlHeadingMatch[1], 10);
        const headingText = htmlHeadingMatch[2].replace(/<[^>]+>/g, '').trim();
        const parsed = dissectChapterTitle(headingText, config.stripLeadingNumbers);
        const level: HeadingLevel = depth <= 1 ? parsed.level : depth === 2 ? 2 : 3;

        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 4. Episodes & Serials (e.g. "Episode 1", "Episode 1: Pilot", "Epsoide 1 Bess", "Ep. 1 - The Start", "Arc 1", "Installment 2")
    if (config.detectEpisodesAndSerials && !matched) {
      const episodeRegex = /^(episode|epsoide|ep\.?|installment|issue|serial|arc|saga)\s+([0-9ivxlcdm\.]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|final)(?:[\s:\-–—\.]+(.*))?$/i;
      const match = trimmed.match(episodeRegex);
      if (match) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: 1,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 5. Standard Chapters & Subsections (e.g. "Chapter 2 Bess", "Chapter 2: Bess", "Chapter II - The Return", "Part 1: Origins", "Section 1.1")
    if (config.detectStandardChapters && !matched) {
      const stdChapterRegex = /^(chapter|chap\.?|ch\.?|part|section|sec\.?|subsection|sub-chapter)\s+([0-9ivxlcdm\.]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|final)(?:[\s:\-–—\.]+(.*))?$/i;
      const match = trimmed.match(stdChapterRegex);
      if (match) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: parsed.level,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 6. Plays, Acts & Scenes (e.g. "Act 1", "Act I, Scene 2: The Hall", "Scene 3 - The Forest", "Canto IV")
    if (config.detectPlaysAndScenes && !matched) {
      const playRegex = /^(act\s+[0-9ivxlcdm]+(?:\s*,\s*scene\s+[0-9ivxlcdm]+)?|scene\s+[0-9ivxlcdm]+|canto\s+[0-9ivxlcdm]+|stanza\s+[0-9ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$/i;
      const match = trimmed.match(playRegex);
      if (match) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: parsed.level,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 7. Volumes, Books & Sagas (e.g. "Volume 1: The Empire", "Vol. 2", "Book One", "Tome 1")
    if (config.detectVolumesAndBooks && !matched) {
      const volRegex = /^(volume|vol\.?|book|tome)\s+([0-9ivxlcdm\.]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|final)(?:[\s:\-–—\.]+(.*))?$/i;
      const match = trimmed.match(volRegex);
      if (match) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: 1,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 8. Journals, Days & Logs (e.g. "Day 1: Arrival", "Night 3", "Entry 4", "Log 12", "Letter 1", "Stardate 41153.7")
    if (config.detectJournalsAndLogs && !matched) {
      const journalRegex = /^(day|night|entry|log|diary\s+entry|letter|dispatch|stardate)\s+([0-9ivxlcdm\.]+|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|final)(?:[\s:\-–—\.]+(.*))?$/i;
      const match = trimmed.match(journalRegex);
      if (match) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: 1,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }

    // 9. Numbered Titles & Roman Numerals (e.g. "1. The Beginning", "01 - Introduction", "I. Awakening", or standalone "I", "II")
    if (config.detectNumberedTitles && !matched) {
      // "1. The Beginning" or "01 - Introduction"
      const numTitleMatch = trimmed.match(/^([0-9]{1,3})\s*[\.\-–—:]\s*([A-Za-z0-9\s'’"“”,\-]+)$/);
      // "I. The Beginning" or "IV - Return"
      const romanTitleMatch = trimmed.match(/^([IVXLCDM]{1,8})\s*[\.\-–—:]\s*([A-Za-z0-9\s'’"“”,\-]+)$/);
      // Standalone Roman Numeral "I", "II", "III"
      const standaloneRoman = trimmed.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/);

      if (numTitleMatch) {
        const num = parseInt(numTitleMatch[1], 10);
        const sub = numTitleMatch[2].trim();
        const prefix = `Chapter ${num}`;
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: `${prefix}: ${sub}`,
          level: 1,
          prefix,
          subtitle: sub,
        });
        matched = true;
        continue;
      } else if (romanTitleMatch) {
        const roman = romanTitleMatch[1].toUpperCase();
        const sub = romanTitleMatch[2].trim();
        const prefix = `Part ${roman}`;
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: `${prefix}: ${sub}`,
          level: 1,
          prefix,
          subtitle: sub,
        });
        matched = true;
        continue;
      } else if (standaloneRoman) {
        const roman = standaloneRoman[1].toUpperCase();
        const prefix = `Part ${roman}`;
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: prefix,
          level: 1,
          prefix,
        });
        matched = true;
        continue;
      }
    }

    // 10. All-Caps / Classical Structural Delimiters (e.g. "CHAPTER 1", "EPISODE 1", "PROLOGUE", "EPILOGUE", "PREFACE", "BOOK TWO")
    if (config.detectAllCapLines && !matched) {
      const classicalPattern = /^(PROLOGUE|EPILOGUE|PREFACE|INTRODUCTION|FOREWORD|AFTERWORD|CONCLUSION|INTERLUDE|CODA|OVERTURE|APPENDIX|(?:CHAPTER|EPISODE|EPSOIDE|BOOK|VOLUME|PART|ACT)\s+[0-9IVXLCDM]+(?:[\s:\-–—]+[A-Z0-9\s,']*)?)$/;
      if (classicalPattern.test(trimmed) && trimmed.length < 85) {
        const parsed = dissectChapterTitle(trimmed, config.stripLeadingNumbers);
        candidates.push({
          lineIndex: i,
          charIndex: currentPos,
          rawText: line,
          cleanText: parsed.fullTitle,
          level: 1,
          prefix: parsed.prefix,
          subtitle: parsed.subtitle,
        });
        matched = true;
        continue;
      }
    }
  }

  // If no chapters were detected at all, treat the entire document as a single default chapter
  if (candidates.length === 0) {
    const wordCount = normalized.trim().split(/\s+/).filter(Boolean).length;
    return [
      {
        id: 'chap-1',
        level: 1,
        rawTitle: 'Document Content',
        cleanTitle: 'Document Content',
        startIndex: 0,
        endIndex: normalized.length,
        content: normalized,
        wordCount,
        pageEstimate: Math.max(1, Math.ceil(wordCount / 280)),
      },
    ];
  }

  // Handle preamble (content before the first chapter, if substantial)
  const chapters: ChapterItem[] = [];
  const firstCandidate = candidates[0];

  if (firstCandidate.charIndex > 50) {
    const preambleText = normalized.substring(0, firstCandidate.charIndex).trim();
    const preambleWords = preambleText.split(/\s+/).filter(Boolean).length;
    if (preambleWords > 15) {
      chapters.push({
        id: 'chap-preamble',
        level: 1,
        rawTitle: 'Front Matter / Introduction',
        cleanTitle: 'Front Matter / Introduction',
        prefix: 'Front Matter',
        startIndex: 0,
        endIndex: firstCandidate.charIndex,
        content: preambleText,
        wordCount: preambleWords,
        pageEstimate: Math.max(1, Math.ceil(preambleWords / 280)),
      });
    }
  }

  // Slice content between candidates
  for (let c = 0; c < candidates.length; c++) {
    const current = candidates[c];
    const next = candidates[c + 1];
    const startIndex = current.charIndex;
    const endIndex = next ? next.charIndex : normalized.length;
    const rawSection = normalized.substring(startIndex, endIndex);

    // Remove the heading line itself from the start of the section content for clean reading
    let bodyContent = rawSection;
    const firstNewline = rawSection.indexOf('\n');
    if (firstNewline !== -1) {
      bodyContent = rawSection.substring(firstNewline + 1).trim();
    } else {
      bodyContent = '';
    }

    const words = bodyContent.split(/\s+/).filter(Boolean).length;

    chapters.push({
      id: `chap-${c + 1}`,
      level: current.level,
      rawTitle: current.rawText,
      cleanTitle: current.cleanText,
      prefix: current.prefix,
      subtitle: current.subtitle,
      startIndex,
      endIndex,
      content: bodyContent,
      wordCount: words,
      pageEstimate: Math.max(1, Math.ceil(words / 280)),
    });
  }

  return chapters;
}

/**
 * Canonical mapping for manuscript structural units:
 * Standardizes units and automatically fixes common typos (like "epsoide 1" -> "Episode 1").
 */
const UNIT_CANONICAL_MAP: Record<string, { label: string; level: HeadingLevel; category: string }> = {
  chapter: { label: 'Chapter', level: 1, category: 'chapter' },
  chap: { label: 'Chapter', level: 1, category: 'chapter' },
  ch: { label: 'Chapter', level: 1, category: 'chapter' },
  episode: { label: 'Episode', level: 1, category: 'episode' },
  epsoide: { label: 'Episode', level: 1, category: 'episode' }, // Fixes common typo: "epsoide 1"
  ep: { label: 'Episode', level: 1, category: 'episode' },
  installment: { label: 'Installment', level: 1, category: 'episode' },
  issue: { label: 'Issue', level: 1, category: 'episode' },
  serial: { label: 'Serial', level: 1, category: 'episode' },
  arc: { label: 'Arc', level: 1, category: 'episode' },
  saga: { label: 'Saga', level: 1, category: 'episode' },
  volume: { label: 'Volume', level: 1, category: 'volume' },
  vol: { label: 'Volume', level: 1, category: 'volume' },
  book: { label: 'Book', level: 1, category: 'volume' },
  tome: { label: 'Tome', level: 1, category: 'volume' },
  act: { label: 'Act', level: 1, category: 'play' },
  scene: { label: 'Scene', level: 2, category: 'play' },
  canto: { label: 'Canto', level: 2, category: 'play' },
  stanza: { label: 'Stanza', level: 2, category: 'play' },
  section: { label: 'Section', level: 2, category: 'section' },
  sec: { label: 'Section', level: 2, category: 'section' },
  subsection: { label: 'Subsection', level: 2, category: 'section' },
  'sub-chapter': { label: 'Sub-chapter', level: 2, category: 'section' },
  part: { label: 'Part', level: 1, category: 'chapter' },
  day: { label: 'Day', level: 1, category: 'journal' },
  night: { label: 'Night', level: 1, category: 'journal' },
  entry: { label: 'Entry', level: 1, category: 'journal' },
  log: { label: 'Log', level: 1, category: 'journal' },
  letter: { label: 'Letter', level: 1, category: 'journal' },
  dispatch: { label: 'Dispatch', level: 1, category: 'journal' },
  stardate: { label: 'Stardate', level: 1, category: 'journal' },
  prologue: { label: 'Prologue', level: 1, category: 'classical' },
  epilogue: { label: 'Epilogue', level: 1, category: 'classical' },
  preface: { label: 'Preface', level: 1, category: 'classical' },
  introduction: { label: 'Introduction', level: 1, category: 'classical' },
  foreword: { label: 'Foreword', level: 1, category: 'classical' },
  afterword: { label: 'Afterword', level: 1, category: 'classical' },
  conclusion: { label: 'Conclusion', level: 1, category: 'classical' },
  interlude: { label: 'Interlude', level: 1, category: 'classical' },
  coda: { label: 'Coda', level: 1, category: 'classical' },
  overture: { label: 'Overture', level: 1, category: 'classical' },
  appendix: { label: 'Appendix', level: 1, category: 'classical' },
  postscript: { label: 'Postscript', level: 1, category: 'classical' },
};

export function isRecognizedUnitOrStructural(text: string): boolean {
  const clean = text.replace(/^[\*#\s\-_>]+|[\*#\s\-_<]+$/g, '').trim().toLowerCase();
  return /^(chapter|chap|ch|episode|epsoide|ep|installment|issue|serial|arc|saga|volume|vol|book|tome|act|scene|canto|stanza|section|sec|subsection|sub-chapter|part|day|night|entry|log|letter|dispatch|stardate|prologue|epilogue|preface|introduction|foreword|afterword|conclusion|interlude|coda|overture|appendix|postscript)\b/i.test(clean);
}

/**
 * Dissects titles like:
 * "** Chapter 2 Bess**" -> prefix: "Chapter 2", subtitle: "Bess", fullTitle: "Chapter 2: Bess"
 * "Episode 1: The Pilot" -> prefix: "Episode 1", subtitle: "The Pilot", fullTitle: "Episode 1: The Pilot"
 * "Epsoide 1 Bess" -> prefix: "Episode 1", subtitle: "Bess", fullTitle: "Episode 1: Bess"
 * "Act 1, Scene 2: The Hall" -> prefix: "Act 1, Scene 2", subtitle: "The Hall", level: 2
 * "Prologue: A New Dawn" -> prefix: "Prologue", subtitle: "A New Dawn"
 */
export function dissectChapterTitle(
  raw: string,
  stripLeadingNumbers = false
): { prefix?: string; subtitle?: string; fullTitle: string; level: HeadingLevel; unitType: string } {
  // Strip Markdown markers like **, ##, quotes, and HTML tags
  let clean = raw.replace(/^[\*#\s\-_>]+|[\*#\s\-_<]+$/g, '').trim();
  clean = clean.replace(/<[^>]+>/g, '').trim();

  // 1. Composite phrases: "Act 1, Scene 2: Subtitle"
  const actSceneMatch = clean.match(/^act\s+([0-9ivxlcdm]+)\s*,\s*scene\s+([0-9ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$/i);
  if (actSceneMatch) {
    const actNum = actSceneMatch[1].toUpperCase();
    const sceneNum = actSceneMatch[2].toUpperCase();
    const prefix = `Act ${actNum}, Scene ${sceneNum}`;
    let subtitle = actSceneMatch[3]?.trim();
    if (stripLeadingNumbers && subtitle) {
      subtitle = subtitle.replace(/^[0-9]+[\.\-–—\s]+/, '').trim();
    }
    return {
      prefix,
      subtitle: subtitle || undefined,
      fullTitle: subtitle ? `${prefix}: ${subtitle}` : prefix,
      level: 2,
      unitType: 'play',
    };
  }

  // 2. Structural single words with optional subtitle: Prologue, Epilogue, etc.
  const standaloneStructural = clean.match(/^(prologue|epilogue|preface|introduction|foreword|afterword|conclusion|interlude|coda|overture|appendix|postscript)(?:[\s:\-–—\.]+(.*))?$/i);
  if (standaloneStructural) {
    const rawKey = standaloneStructural[1].toLowerCase();
    const info = UNIT_CANONICAL_MAP[rawKey] || { label: rawKey.charAt(0).toUpperCase() + rawKey.slice(1), level: 1 as HeadingLevel, category: 'classical' };
    let subtitle = standaloneStructural[2]?.trim();
    if (stripLeadingNumbers && subtitle) {
      subtitle = subtitle.replace(/^[0-9]+[\.\-–—\s]+/, '').trim();
    }
    const prefix = info.label;
    return {
      prefix,
      subtitle: subtitle || undefined,
      fullTitle: subtitle ? `${prefix}: ${subtitle}` : prefix,
      level: info.level,
      unitType: info.category,
    };
  }

  // 3. General Unit with identifier and optional subtitle:
  // e.g. "Episode 1 Bess", "Epsoide 1: Bess", "Ep. 1 - The Pilot", "Chapter 2 Bess", "Day 1: Arrival", "Volume 2"
  const generalRegex = /^(chapter|chap\.?|ch\.?|episode|epsoide|ep\.?|installment|issue|serial|arc|saga|volume|vol\.?|book|tome|act|scene|canto|stanza|section|sec\.?|subsection|sub-chapter|part|day|night|entry|log|letter|dispatch|stardate)(?:\s+([0-9ivxlcdm\.]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|final))?(?:[\s:\-–—\.]+(.*))?$/i;
  const genMatch = clean.match(generalRegex);

  if (genMatch) {
    const rawUnit = genMatch[1].toLowerCase().replace(/\.$/, '');
    const rawNum = genMatch[2] ? genMatch[2].trim() : '';
    let subtitle = genMatch[3] ? genMatch[3].trim() : '';

    const unitInfo = UNIT_CANONICAL_MAP[rawUnit] || {
      label: rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1),
      level: 1 as HeadingLevel,
      category: 'general',
    };

    let formattedNum = rawNum;
    if (rawNum && /^[ivxlcdm]+$/i.test(rawNum)) {
      formattedNum = rawNum.toUpperCase();
    } else if (rawNum && /^[a-z]+$/i.test(rawNum)) {
      formattedNum = rawNum.charAt(0).toUpperCase() + rawNum.slice(1).toLowerCase();
    }

    const prefix = formattedNum ? `${unitInfo.label} ${formattedNum}` : unitInfo.label;

    if (stripLeadingNumbers && subtitle) {
      subtitle = subtitle.replace(/^[0-9]+[\.\-–—\s]+/, '').trim();
    }

    return {
      prefix,
      subtitle: subtitle || undefined,
      fullTitle: subtitle ? `${prefix}: ${subtitle}` : prefix,
      level: unitInfo.level,
      unitType: unitInfo.category,
    };
  }

  // 4. Numbered title: "1. The Beginning" or "I. The Journey"
  const numTitleMatch = clean.match(/^([0-9]{1,3})\s*[\.\-–—:]\s*([A-Za-z0-9\s'’"“”,\-]+)$/);
  if (numTitleMatch) {
    const num = parseInt(numTitleMatch[1], 10);
    const sub = numTitleMatch[2].trim();
    const prefix = `Chapter ${num}`;
    return {
      prefix,
      subtitle: sub,
      fullTitle: `${prefix}: ${sub}`,
      level: 1,
      unitType: 'chapter',
    };
  }

  const romanTitleMatch = clean.match(/^([IVXLCDM]{1,8})\s*[\.\-–—:]\s*([A-Za-z0-9\s'’"“”,\-]+)$/);
  if (romanTitleMatch) {
    const roman = romanTitleMatch[1].toUpperCase();
    const sub = romanTitleMatch[2].trim();
    const prefix = `Part ${roman}`;
    return {
      prefix,
      subtitle: sub,
      fullTitle: `${prefix}: ${sub}`,
      level: 1,
      unitType: 'chapter',
    };
  }

  // Fallback
  return {
    fullTitle: clean,
    level: 1,
    unitType: 'general',
  };
}

/**
 * Applies professional typographic formatting:
 * - Curly quotes
 * - Em dashes & en dashes
 * - Ellipses
 * - Scene break normalization
 */
export function formatDocumentText(
  text: string,
  options: {
    curlyQuotes: boolean;
    emDashes: boolean;
    ellipses: boolean;
    cleanDoubleSpacing: boolean;
    sceneBreakOrnament: string;
  }
): string {
  let result = text;

  if (options.curlyQuotes) {
    // Double quotes: opening quotes after whitespace or start of line
    result = result.replace(/(^|[\s(\[{])"/g, '$1“');
    // Closing double quotes
    result = result.replace(/"/g, '”');

    // Single quotes & apostrophes: opening quotes after whitespace or start
    result = result.replace(/(^|[\s(\[{])'/g, '$1‘');
    // Apostrophes in words (e.g., don't, it's, 'em) and closing single quotes
    result = result.replace(/'/g, '’');
  }

  if (options.emDashes) {
    // Replace three dashes or two dashes with an em-dash
    result = result.replace(/---/g, '—').replace(/--/g, '—');
    // Add thin spacing if attached to letters, or preserve style
    result = result.replace(/([a-zA-Z0-9])—([a-zA-Z0-9])/g, '$1 — $2');
  }

  if (options.ellipses) {
    result = result.replace(/\.\.\./g, '…');
  }

  if (options.cleanDoubleSpacing) {
    // Remove more than 2 consecutive blank lines
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  // Scene break normalization: e.g. * * * or *** or --- to chosen ornament
  if (options.sceneBreakOrnament) {
    const ornamentMap: Record<string, string> = {
      asterisks: '* * *',
      diamond: '✦ ✦ ✦',
      fleuron: '❦',
      divider: '—————',
    };
    const symbol = ornamentMap[options.sceneBreakOrnament] || '* * *';
    result = result.replace(/\n\s*(\*[\s\*]{2,}\*|---|–\s*–\s*–|###)\s*\n/g, `\n\n<div class="scene-break">${symbol}</div>\n\n`);
  }

  return result;
}
