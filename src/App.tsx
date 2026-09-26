import { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, Sparkles, Library } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DocumentUploadZone } from './components/DocumentUploadZone';
import { CoverManager } from './components/CoverManager';
import { TableOfContentsView } from './components/TableOfContentsView';
import { ParsingConfigPanel } from './components/ParsingConfigPanel';
import { BookPreview } from './components/BookPreview';
import { ManuscriptEditor } from './components/ManuscriptEditor';
import { ExportModal } from './components/ExportModal';
import { MultiBookOmnibusModal } from './components/MultiBookOmnibusModal';

import {
  BookMetadata,
  ParsingConfig,
  DEFAULT_PARSING_CONFIG,
  FormatOptions,
  DocumentUploadResult,
  OmnibusBookItem,
} from './types';
import { parseDocumentStructure } from './utils/parser';
import { readUploadedDocument, extractInitialMetadata } from './utils/fileReader';
import { SAMPLE_MANUSCRIPT } from './data/sampleDocument';

export default function App() {
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'toc' | 'cover'>('preview');

  // Document Content State
  const [rawText, setRawText] = useState<string>(SAMPLE_MANUSCRIPT);

  // Metadata State
  const [metadata, setMetadata] = useState<BookMetadata>({
    title: 'The Chronicle of Bess',
    subtitle: 'A Tale of High Mountain Passes',
    author: 'Eleanor Vance',
    publisher: 'Silverwood Publishing',
    year: '2026',
    genre: 'Historical Fiction',
    synopsis: 'Margaret and Bess journey north across the treacherous mountain pass, guarding a mysterious signet ring and a sealed letter.',
    isbn: '',
    coverImageUrl: '',
    coverTheme: 'classic-navy',
  });

  // Parser Configuration State
  const [parsingConfig, setParsingConfig] = useState<ParsingConfig>(DEFAULT_PARSING_CONFIG);

  // Formatter & Reader Options State
  const [formatOptions, setFormatOptions] = useState<FormatOptions>({
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
  });

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOmnibusOpen, setIsOmnibusOpen] = useState(false);
  const [omnibusBooks, setOmnibusBooks] = useState<OmnibusBookItem[]>([]);
  const [omnibusNotification, setOmnibusNotification] = useState<{
    count: number;
    title: string;
  } | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [chapterCraftNotification, setChapterCraftNotification] = useState<{
    title: string;
    author?: string;
  } | null>(null);

  // Hidden Easter Egg: Ancient Bloodline Secret Feature Unlock
  const [isSecretUnlocked, setIsSecretUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chaptercraft_ancient_bloodline_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [showUnlockToast, setShowUnlockToast] = useState<boolean>(false);

  // Check title for "Ancient Bloodline" unlock trigger
  useEffect(() => {
    const cleanTitle = (metadata.title || '').trim().toLowerCase();
    if (cleanTitle === 'ancient bloodline') {
      setIsSecretUnlocked(true);
      try {
        localStorage.setItem('chaptercraft_ancient_bloodline_unlocked', 'true');
      } catch {}
      setShowUnlockToast(true);
    }
  }, [metadata.title]);

  const handleUnlockSecret = () => {
    setIsSecretUnlocked(true);
    try {
      localStorage.setItem('chaptercraft_ancient_bloodline_unlocked', 'true');
    } catch {}
    setShowUnlockToast(true);
  };

  // Safe tab switcher that immediately stops speech when leaving the preview/reader tab
  const handleTabSwitch = (tab: 'preview' | 'editor' | 'toc' | 'cover') => {
    if (tab !== 'preview') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    setActiveTab(tab);
  };

  // Automatic Structure Parsing Engine
  const chapters = useMemo(() => {
    return parseDocumentStructure(rawText, parsingConfig);
  }, [rawText, parsingConfig]);

  // Overall word count
  const totalWordCount = useMemo(() => {
    return rawText.trim().split(/\s+/).filter(Boolean).length;
  }, [rawText]);

  // Handle uploaded document
  const handleDocumentLoaded = (result: DocumentUploadResult, autoMeta?: Partial<BookMetadata>) => {
    setRawText(result.rawText);
    const combinedMeta = { ...autoMeta, ...result.metadata };
    if (Object.keys(combinedMeta).length > 0) {
      setMetadata((prev) => ({
        ...prev,
        title: combinedMeta.title || prev.title,
        subtitle: combinedMeta.subtitle !== undefined ? combinedMeta.subtitle : prev.subtitle,
        author: combinedMeta.author || prev.author,
        publisher: combinedMeta.publisher || prev.publisher,
        year: combinedMeta.year || prev.year,
        genre: combinedMeta.genre || prev.genre,
        synopsis: combinedMeta.synopsis || prev.synopsis,
        isbn: combinedMeta.isbn || prev.isbn,
        coverTheme: combinedMeta.coverTheme || prev.coverTheme,
        coverImageUrl: combinedMeta.coverImageUrl || prev.coverImageUrl,
      }));
    }

    if (result.isChapterCraft) {
      setChapterCraftNotification({
        title: combinedMeta.title || 'Manuscript',
        author: combinedMeta.author,
      });
      setTimeout(() => setChapterCraftNotification(null), 6000);
    }

    setActiveTab('preview');
  };

  // Load sample manuscript
  const handleLoadSample = () => {
    setRawText(SAMPLE_MANUSCRIPT);
    setMetadata({
      title: 'The Chronicle of Bess',
      subtitle: 'A Tale of High Mountain Passes',
      author: 'Eleanor Vance',
      publisher: 'Silverwood Publishing',
      year: '2026',
      genre: 'Historical Fiction',
      synopsis: 'Margaret and Bess journey north across the treacherous mountain pass, guarding a mysterious signet ring and a sealed letter.',
      isbn: '',
      coverImageUrl: '',
      coverTheme: 'classic-navy',
    });
    setActiveTab('preview');
  };

  // Open Multi-Book Omnibus Binder (Optionally with dropped/selected files)
  const handleOpenOmnibusWithFiles = async (files?: File[]) => {
    if (files && files.length > 0) {
      const newBooks: OmnibusBookItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const uploadResult = await readUploadedDocument(file);
          const autoMeta = extractInitialMetadata(uploadResult.rawText, file.name);
          const combined = { ...autoMeta, ...uploadResult.metadata };
          const parsed = parseDocumentStructure(uploadResult.rawText, parsingConfig);
          newBooks.push({
            id: `book-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            fileName: file.name,
            fileSize: file.size,
            fileType: uploadResult.fileType,
            title: combined.title || file.name.replace(/\.[^/.]+$/, ''),
            author: combined.author || metadata.author || 'Author',
            volumePrefix: `Book ${i + 1}`,
            rawText: uploadResult.rawText,
            metadata: combined,
            chapterCount: parsed.length,
            wordCount: uploadResult.rawText.trim().split(/\s+/).filter(Boolean).length,
          });
        } catch (e) {
          console.warn('Error reading file for omnibus:', e);
        }
      }
      if (newBooks.length > 0) {
        setOmnibusBooks(newBooks);
      }
    }
    setIsOmnibusOpen(true);
  };

  // Assemble omnibus manuscript from user-ordered books
  const handleAssembleOmnibus = (
    mergedText: string,
    omnibusMeta: Partial<BookMetadata>,
    books: OmnibusBookItem[]
  ) => {
    setRawText(mergedText);
    setOmnibusBooks(books);
    setMetadata((prev) => ({
      ...prev,
      ...omnibusMeta,
    }));
    setOmnibusNotification({
      count: books.length,
      title: omnibusMeta.title || 'Omnibus Collection',
    });
    setTimeout(() => setOmnibusNotification(null), 6000);
    setActiveTab('preview');
  };

  // Update a chapter title from the TOC view
  const handleUpdateChapterTitle = (chapterId: string, newTitle: string) => {
    const targetChapter = chapters.find((c) => c.id === chapterId);
    if (!targetChapter) return;

    // Replace the raw title occurrence in rawText
    const oldLine = targetChapter.rawTitle;
    if (oldLine && rawText.includes(oldLine)) {
      // Preserve bold delimiters if it was bold
      let formattedNew = newTitle;
      if (oldLine.trim().startsWith('**') && oldLine.trim().endsWith('**')) {
        formattedNew = `** ${newTitle} **`;
      } else if (oldLine.trim().startsWith('#')) {
        const hashes = oldLine.match(/^#+/)?.[0] || '##';
        formattedNew = `${hashes} ${newTitle}`;
      }
      setRawText(rawText.replace(oldLine, formattedNew));
    }
  };

  // Insert generated TOC at the beginning of the manuscript
  const handleInsertTocIntoDocument = () => {
    const tocLines = [
      '\n\n## Table of Contents\n',
      ...chapters.map((ch) => {
        const indent = ch.level === 1 ? '' : ch.level === 2 ? '   ' : '      ';
        return `${indent}- ${ch.cleanTitle}`;
      }),
      '\n* * *\n\n',
    ].join('\n');

    // Insert after title or first lines if present
    const firstChapterIdx = rawText.search(/(\*\*\s*Chapter|Chapter\s+[0-9ivx]|#\s+Chapter|PROLOGUE)/i);
    if (firstChapterIdx !== -1) {
      const before = rawText.slice(0, firstChapterIdx);
      const after = rawText.slice(firstChapterIdx);
      setRawText(before + tocLines + after);
    } else {
      setRawText(tocLines + rawText);
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setActiveTab('preview');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Application Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        chapterCount={chapters.length}
        wordCount={totalWordCount}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onLoadSample={handleLoadSample}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenOmnibus={() => setIsOmnibusOpen(true)}
        omnibusBookCount={omnibusBooks.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16">
        {activeTab === 'preview' && (
          <BookPreview
            metadata={metadata}
            chapters={chapters}
            options={formatOptions}
            onChangeOptions={setFormatOptions}
            selectedChapterId={selectedChapterId}
            onOpenExport={() => setIsExportOpen(true)}
            isSecretUnlocked={isSecretUnlocked}
          />
        )}

        {activeTab === 'editor' && (
          <ManuscriptEditor
            rawText={rawText}
            onChangeText={setRawText}
            options={formatOptions}
            chapters={chapters}
            onSelectChapter={handleSelectChapter}
            onRestoreMetadata={(meta) => setMetadata((prev) => ({ ...prev, ...meta }))}
          />
        )}

        {activeTab === 'toc' && (
          <TableOfContentsView
            chapters={chapters}
            options={formatOptions}
            onChangeOptions={setFormatOptions}
            onSelectChapter={handleSelectChapter}
            onUpdateChapterTitle={handleUpdateChapterTitle}
            onInsertTocIntoDocument={handleInsertTocIntoDocument}
          />
        )}

        {activeTab === 'cover' && (
          <CoverManager
            metadata={metadata}
            onChangeMetadata={setMetadata}
            isSecretUnlocked={isSecretUnlocked}
            onUnlockSecretThemes={handleUnlockSecret}
          />
        )}
      </main>

      {/* Upload & Drag-and-drop Modal */}
      <DocumentUploadZone
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentLoaded={handleDocumentLoaded}
        onLoadSample={handleLoadSample}
        onOpenOmnibus={handleOpenOmnibusWithFiles}
      />

      {/* Multi-Book Omnibus & Series Binder Modal */}
      <MultiBookOmnibusModal
        isOpen={isOmnibusOpen}
        onClose={() => setIsOmnibusOpen(false)}
        onAssembleOmnibus={handleAssembleOmnibus}
        initialBooks={omnibusBooks}
      />

      {/* Delimiter & Parsing Rules Panel */}
      <ParsingConfigPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={parsingConfig}
        onChangeConfig={setParsingConfig}
        chapterCount={chapters.length}
        sampleMatches={chapters}
      />

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        metadata={metadata}
        chapters={chapters}
        options={formatOptions}
        rawText={rawText}
      />

      {/* Ancient Bloodline Secret Features Unlock Bottom Pop-up */}
      {showUnlockToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-950/95 text-stone-100 border-2 border-amber-500/80 shadow-[0_10px_40px_rgba(245,158,11,0.3)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 backdrop-blur-xl max-w-xl w-[92%] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="text-sm sm:text-base font-bold text-amber-300 flex items-center justify-center sm:justify-start gap-1.5 font-serif">
              <span>You've unlocked our new hidden features!</span>
            </div>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              <strong>Ancient Bloodline</strong> secret discovered: <strong>Obsidian Dark</strong>, <strong>Paper White (Parchment White)</strong>, and <strong>Parchment Cream</strong> luxury reading themes are now unlocked!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setFormatOptions((prev) => ({ ...prev, colorTheme: 'obsidian-dark' }));
                setActiveTab('preview');
                setShowUnlockToast(false);
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all whitespace-nowrap"
            >
              Try Obsidian Dark
            </button>
            <button
              onClick={() => setShowUnlockToast(false)}
              className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
              title="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ChapterCraft Re-import Toast Notification */}
      {chapterCraftNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900/95 text-stone-100 border border-emerald-500/50 shadow-2xl rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-md max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">ChapterCraft Document Restored</div>
            <div className="text-sm font-medium text-stone-100 truncate">
              {chapterCraftNotification.title}
              {chapterCraftNotification.author ? ` — ${chapterCraftNotification.author}` : ''}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">Stripped export wrappers, restored clean chapter stream & metadata.</div>
          </div>
          <button
            onClick={() => setChapterCraftNotification(null)}
            className="text-stone-400 hover:text-stone-200 p-1 text-sm leading-none"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Multi-Book Omnibus Assembly Toast Notification */}
      {omnibusNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-950/95 text-stone-100 border border-amber-500/60 shadow-2xl rounded-xl p-4 flex items-center gap-3.5 backdrop-blur-md max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
            <Library className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Omnibus Assembled into 1 File!
            </div>
            <div className="text-sm font-bold text-stone-100 truncate">
              {omnibusNotification.title}
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              Merged {omnibusNotification.count} books with volume hierarchies & unified TOC.
            </div>
          </div>
          <button
            onClick={() => setOmnibusNotification(null)}
            className="text-stone-400 hover:text-stone-200 p-1 text-sm leading-none"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
