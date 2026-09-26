export interface BookMetadata {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  year: string;
  genre: string;
  synopsis: string;
  isbn: string;
  coverImageUrl: string;
  coverTheme: 'classic-navy' | 'dark-editorial' | 'warm-amber' | 'forest-sage' | 'crimson-leather';
}

export type HeadingLevel = 1 | 2 | 3;

export interface ChapterItem {
  id: string;
  level: HeadingLevel; // 1 = Chapter / Major Part, 2 = Subsection, 3 = Minor Section
  rawTitle: string;
  cleanTitle: string;
  prefix?: string; // e.g. "Chapter 2"
  subtitle?: string; // e.g. "Bess"
  startIndex: number;
  endIndex: number;
  content: string;
  wordCount: number;
  pageEstimate: number;
}

export interface OmnibusBookItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  title: string;
  author: string;
  volumePrefix: string; // e.g. "Book 1", "Book 2", "Volume I", "Part 1"
  rawText: string;
  metadata?: Partial<BookMetadata>;
  chapterCount: number;
  wordCount: number;
}

export interface OmnibusAssemblyOptions {
  masterTitle: string;
  masterAuthor: string;
  masterPublisher: string;
  masterYear: string;
  masterGenre: string;
  divisionStyle: 'book' | 'volume' | 'part' | 'preserve';
  includeBookTitlePages: boolean;
  renumberChaptersAcrossBooks: boolean;
}

export interface ParsingConfig {
  detectBoldMarkdown: boolean; // ** Chapter 2 Bess ** or **Episode 1**
  detectStandardChapters: boolean; // Chapter 1, Chapter II, Part One, etc.
  detectEpisodesAndSerials: boolean; // Episode 1, Epsoide 1, Ep. 1, Installment, Arc, Saga
  detectPlaysAndScenes: boolean; // Act 1, Scene 2, Canto, etc.
  detectVolumesAndBooks: boolean; // Volume 1, Vol. 1, Book One, Tome 1
  detectJournalsAndLogs: boolean; // Day 1, Night 1, Entry 1, Log 1, Letter 1
  detectNumberedTitles: boolean; // 1. The Beginning, I. Prologue, Chapter 01
  detectHeadings: boolean; // # Heading, <h1>, etc.
  detectAllCapLines: boolean; // CHAPTER I, EPISODE 1, PROLOGUE, etc.
  detectCustomRegex: boolean;
  customRegexPattern: string;
  stripLeadingNumbers: boolean;
}

export const DEFAULT_PARSING_CONFIG: ParsingConfig = {
  detectBoldMarkdown: true,
  detectStandardChapters: true,
  detectEpisodesAndSerials: true,
  detectPlaysAndScenes: true,
  detectVolumesAndBooks: true,
  detectJournalsAndLogs: true,
  detectNumberedTitles: true,
  detectHeadings: true,
  detectAllCapLines: true,
  detectCustomRegex: false,
  customRegexPattern: '^(Act|Scene|Volume|Episode|Arc)\\s+[0-9]+',
  stripLeadingNumbers: false,
};

export type BookFontFamily =
  | 'cormorant'
  | 'alegreya'
  | 'sourceserif'
  | 'crimson'
  | 'serif'
  | 'sans'
  | 'mono';

export interface FontOptionDetail {
  id: BookFontFamily;
  name: string;
  cssFamily: string;
  category: string;
  description: string;
  isDefault?: boolean;
}

export const BOOK_FONT_DETAILS: FontOptionDetail[] = [
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    cssFamily: "'Cormorant Garamond', Georgia, serif",
    category: 'Romance & Poetry',
    description: 'Ideal for romance and poetry due to its graceful, airy aesthetic.',
  },
  {
    id: 'alegreya',
    name: 'Alegreya',
    cssFamily: "'Alegreya', Georgia, serif",
    category: 'Fantasy & Immersive',
    description: 'A dynamic serif that suits fantasy and immersive narratives.',
  },
  {
    id: 'sourceserif',
    name: 'Source Serif Pro',
    cssFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
    category: 'Sci-Fi & Non-Fiction',
    description: 'A modern, clean choice for science fiction and non-fiction.',
  },
  {
    id: 'crimson',
    name: 'Crimson Text',
    cssFamily: "'Crimson Text', Georgia, serif",
    category: 'Contemporary Fiction',
    description: 'A free, open-source alternative that works well for contemporary fiction.',
  },
  {
    id: 'serif',
    name: 'Lora Serif',
    cssFamily: "'Lora', Georgia, serif",
    category: 'Classic Literary',
    description: 'A balanced, highly legible literary serif for all prose.',
    isDefault: true,
  },
  {
    id: 'sans',
    name: 'Modern Sans',
    cssFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    category: 'Modern Editorial',
    description: 'Clean modern humanist sans for essays, memoirs, and digital reading.',
  },
];

export type BookColorTheme =
  | 'light'
  | 'parchment'
  | 'dark'
  | 'obsidian-dark'
  | 'parchment-white'
  | 'parchment-cream';

export interface ColorThemeOption {
  id: BookColorTheme;
  name: string;
  bgHex: string;
  cardHex: string;
  textHex: string;
  accentHex: string;
  description: string;
  isUnlockedFeature?: boolean;
}

export const BOOK_COLOR_THEMES: ColorThemeOption[] = [
  {
    id: 'parchment',
    name: 'Parchment Antique',
    bgHex: '#faf6ee',
    cardHex: '#f4ede0',
    textHex: '#2b211a',
    accentHex: '#8b5a2b',
    description: 'Classic warm sepia book page, easy on eyes for long reading sessions.',
  },
  {
    id: 'light',
    name: 'Classic Day',
    bgHex: '#ffffff',
    cardHex: '#f8f8f8',
    textHex: '#1c1917',
    accentHex: '#d97706',
    description: 'Crisp, high-contrast modern daytime reading layout.',
  },
  {
    id: 'dark',
    name: 'Cozy Night',
    bgHex: '#1c1917',
    cardHex: '#292524',
    textHex: '#f5f5f4',
    accentHex: '#f59e0b',
    description: 'Muted slate dark background for night reading with minimal eye strain.',
  },
  // Unlocked Features (Ancient Bloodline Easter Egg)
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark',
    bgHex: '#09090b',
    cardHex: '#141416',
    textHex: '#f4f4f5',
    accentHex: '#eab308',
    description: 'Deep obsidian black with gold accents and high contrast text.',
    isUnlockedFeature: true,
  },
  {
    id: 'parchment-white',
    name: 'Paper White',
    bgHex: '#fdfbf7',
    cardHex: '#f7f4ec',
    textHex: '#18181b',
    accentHex: '#9a3412',
    description: 'Archival paper white, pure literary clarity with rich typographic contrast.',
    isUnlockedFeature: true,
  },
  {
    id: 'parchment-cream',
    name: 'Parchment Cream',
    bgHex: '#fbf4e6',
    cardHex: '#f5ebd6',
    textHex: '#33271c',
    accentHex: '#b45309',
    description: 'Warm cream book stock with golden sepia undertones.',
    isUnlockedFeature: true,
  },
];

export interface FormatOptions {
  curlyQuotes: boolean;
  emDashes: boolean;
  ellipses: boolean;
  dropCaps: boolean;
  paragraphIndent: boolean;
  cleanDoubleSpacing: boolean;
  sceneBreakOrnament: 'asterisks' | 'diamond' | 'fleuron' | 'divider';
  headingStyle: 'classic-serif' | 'modern-sans' | 'cinzel-ornate' | 'minimal-editorial';
  fontFamily: BookFontFamily;
  fontSize: number;
  lineHeight: number;
  colorTheme: BookColorTheme;
  tocStyle: 'classic-dots' | 'modern-clean' | 'academic-numbered';
  includeCoverInBook: boolean;
  includeTocInBook: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  curlyQuotes: true,
  emDashes: true,
  ellipses: true,
  dropCaps: true,
  paragraphIndent: true,
  cleanDoubleSpacing: true,
  sceneBreakOrnament: 'diamond',
  headingStyle: 'classic-serif',
  fontFamily: 'serif',
  fontSize: 16,
  lineHeight: 1.75,
  colorTheme: 'parchment',
  tocStyle: 'classic-dots',
  includeCoverInBook: true,
  includeTocInBook: true,
};

export interface DocumentUploadResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  rawText: string;
  metadata?: Partial<BookMetadata>;
  isChapterCraft?: boolean;
}
