import { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentUploadZone } from './components/DocumentUploadZone';
import { CoverManager } from './components/CoverManager';
import { TableOfContentsView } from './components/TableOfContentsView';
import { ParsingConfigPanel } from './components/ParsingConfigPanel';
import { BookPreview } from './components/BookPreview';
import { ManuscriptEditor } from './components/ManuscriptEditor';
import { ExportModal } from './components/ExportModal';

import { BookMetadata, ParsingConfig, DEFAULT_PARSING_CONFIG, FormatOptions, DocumentUploadResult } from './types';
import { parseDocumentStructure } from './utils/parser';
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
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);

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
    if (autoMeta) {
      setMetadata((prev) => ({
        ...prev,
        title: autoMeta.title || prev.title,
        author: autoMeta.author || prev.author,
      }));
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
        setActiveTab={setActiveTab}
        chapterCount={chapters.length}
        wordCount={totalWordCount}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onLoadSample={handleLoadSample}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          />
        )}

        {activeTab === 'editor' && (
          <ManuscriptEditor
            rawText={rawText}
            onChangeText={setRawText}
            options={formatOptions}
            chapters={chapters}
            onSelectChapter={handleSelectChapter}
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
          />
        )}
      </main>

      {/* Upload & Drag-and-drop Modal */}
      <DocumentUploadZone
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentLoaded={handleDocumentLoaded}
        onLoadSample={handleLoadSample}
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
    </div>
  );
}
