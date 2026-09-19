import { useState, useRef, DragEvent } from 'react';
import {
  UploadCloud,
  FileText,
  Clipboard,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { readUploadedDocument, extractInitialMetadata } from '../utils/fileReader';
import { DocumentUploadResult, BookMetadata } from '../types';
import {
  ALL_SUPPORTED_DOCUMENT_FORMATS,
  getAllAcceptExtensions,
  findFormatByExtension,
} from '../data/supportedFormats';

interface DocumentUploadZoneProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentLoaded: (result: DocumentUploadResult, autoMeta?: Partial<BookMetadata>) => void;
  onLoadSample: () => void;
}

export function DocumentUploadZone({
  isOpen,
  onClose,
  onDocumentLoaded,
  onLoadSample,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'upload' | 'paste'>('upload');
  const [showFormatsList, setShowFormatsList] = useState(false);
  const [formatSearch, setFormatSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await readUploadedDocument(file);
      const meta = extractInitialMetadata(result.rawText, file.name);
      onDocumentLoaded(result, meta);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to process document');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste some text before submitting.');
      return;
    }
    const meta = extractInitialMetadata(pasteText, 'Pasted Document');
    onDocumentLoaded(
      {
        fileName: 'Pasted Document',
        fileSize: new Blob([pasteText]).size,
        fileType: 'Pasted Text',
        rawText: pasteText,
      },
      meta
    );
    onClose();
  };

  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPasteText(text);
          setActiveMode('paste');
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  // Filter formats by search query
  const filteredFormats = ALL_SUPPORTED_DOCUMENT_FORMATS.filter(
    (f) =>
      f.name.toLowerCase().includes(formatSearch.toLowerCase()) ||
      f.ext.toLowerCase().includes(formatSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(formatSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-100">
              Import Document or Manuscript
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Supports 80+ formatted text and plain text document formats (Word, EPUB, TXT, HTML, TeX, ODT & more)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-stone-800 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveMode('upload')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeMode === 'upload'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Drag & Drop File</span>
          </button>
          <button
            onClick={() => setActiveMode('paste')}
            className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeMode === 'paste'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Manuscript Text</span>
          </button>
        </div>

        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeMode === 'upload' ? (
            <div className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-stone-700 bg-stone-950/50 hover:border-stone-500 hover:bg-stone-950/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAllAcceptExtensions()}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <p className="text-base font-medium text-stone-100">
                  {isLoading ? 'Parsing and extracting chapters...' : 'Drop your document here, or click to browse'}
                </p>
                <p className="text-xs text-stone-400 mt-1 max-w-md">
                  Works with all major and historical text formats: Word, EPUB, Markdown, Plain Text, HTML, TeX, ODT, AbiWord, WordPerfect, and more.
                </p>

                {/* Badges of common formats */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-lg">
                  {['.docx', '.epub', '.txt', '.md', '.html', '.odt', '.rtf', '.tex', '.doc'].map((ext) => (
                    <span
                      key={ext}
                      className="text-[11px] font-mono px-2 py-0.5 bg-stone-800/80 text-stone-300 rounded border border-stone-700"
                    >
                      {ext}
                    </span>
                  ))}
                  <span className="text-[11px] text-amber-400 px-2 py-0.5 font-medium">
                    + 75 more formats
                  </span>
                </div>
              </div>

              {/* Supported Formats Drawer Toggle */}
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowFormatsList(!showFormatsList)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>View all 80+ supported document types ({ALL_SUPPORTED_DOCUMENT_FORMATS.length} formats registered)</span>
                  </div>
                  {showFormatsList ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </button>

                {showFormatsList && (
                  <div className="p-4 border-t border-stone-800 space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search format by extension or name (e.g., abw, dita, 1st, epub, troff)..."
                        value={formatSearch}
                        onChange={(e) => setFormatSearch(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-stone-800/40">
                      {filteredFormats.map((fmt) => (
                        <div key={fmt.ext} className="pt-1.5 flex items-start justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-mono text-amber-400 font-semibold mr-1.5 uppercase">
                              .{fmt.ext}
                            </span>
                            <span className="text-stone-200 font-medium">{fmt.name}</span>
                            <p className="text-[11px] text-stone-400 line-clamp-1">{fmt.description}</p>
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0 bg-stone-800 px-1.5 py-0.5 rounded">
                            {fmt.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick actions bar */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste text from clipboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLoadSample();
                    onClose();
                  }}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Sample Doc with ** Chapter 2 Bess**</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Direct Text Input
                  </label>
                  <button
                    type="button"
                    onClick={handleReadClipboard}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Paste System Clipboard</span>
                  </button>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your manuscript or book text here... Chapter titles like '** Chapter 2 Bess**', 'Chapter 1: The Departure', or '# Chapter 1' will be automatically parsed!"
                  rows={10}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-serif leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-stone-400 font-mono">
                    {pasteText ? `${pasteText.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteText('')}
                      className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Parse & Format Text</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
