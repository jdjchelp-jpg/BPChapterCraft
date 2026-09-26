import React, { useState, useRef, DragEvent } from 'react';
import {
  Layers,
  X,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileCode,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Settings2,
  MoveVertical,
  Plus,
  RefreshCw,
  Library,
} from 'lucide-react';
import { OmnibusBookItem, OmnibusAssemblyOptions, BookMetadata } from '../types';
import { readUploadedDocument, extractInitialMetadata } from '../utils/fileReader';
import { parseDocumentStructure } from '../utils/parser';
import { DEFAULT_PARSING_CONFIG } from '../types';
import { assembleOmnibusManuscript, getSampleTrilogy } from '../utils/omnibusAssembler';

interface MultiBookOmnibusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssembleOmnibus: (
    mergedText: string,
    metadata: Partial<BookMetadata>,
    books: OmnibusBookItem[]
  ) => void;
  initialBooks?: OmnibusBookItem[];
}

export function MultiBookOmnibusModal({
  isOpen,
  onClose,
  onAssembleOmnibus,
  initialBooks = [],
}: MultiBookOmnibusModalProps) {
  const [books, setBooks] = useState<OmnibusBookItem[]>(() => {
    if (initialBooks.length > 0) return initialBooks;
    return getSampleTrilogy();
  });

  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assemblyOptions, setAssemblyOptions] = useState<OmnibusAssemblyOptions>({
    masterTitle: 'The Complete Northern Chronicles: Trilogy Omnibus',
    masterAuthor: 'Eleanor Vance',
    masterPublisher: 'Silverwood Publishing',
    masterYear: new Date().getFullYear().toString(),
    masterGenre: 'Epic Fantasy Omnibus',
    divisionStyle: 'book',
    includeBookTitlePages: true,
    renumberChaptersAcrossBooks: false,
  });

  if (!isOpen) return null;

  // Move book up in sequence
  const moveBookUp = (index: number) => {
    if (index <= 0) return;
    setBooks((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Move book down in sequence
  const moveBookDown = (index: number) => {
    if (index >= books.length - 1) return;
    setBooks((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Move book to explicit numerical position (1-indexed)
  const moveBookToPosition = (fromIndex: number, targetPos: number) => {
    const toIndex = Math.max(0, Math.min(books.length - 1, targetPos - 1));
    if (fromIndex === toIndex) return;

    setBooks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  // Remove a book from omnibus
  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  // Update book metadata inline
  const updateBook = (id: string, updates: Partial<OmnibusBookItem>) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Process multiple imported files
  const processFiles = async (fileList: FileList | File[]) => {
    setIsProcessingFiles(true);
    setErrorMessage(null);

    const newBooks: OmnibusBookItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const uploadResult = await readUploadedDocument(file);
        const autoMeta = extractInitialMetadata(uploadResult.rawText, file.name);
        const combinedMeta = { ...autoMeta, ...uploadResult.metadata };

        const parsedChapters = parseDocumentStructure(
          uploadResult.rawText,
          DEFAULT_PARSING_CONFIG
        );
        const wordCount = uploadResult.rawText.trim().split(/\s+/).filter(Boolean).length;

        const currentCount = books.length + newBooks.length;
        const bookItem: OmnibusBookItem = {
          id: `book-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: uploadResult.fileType,
          title: combinedMeta.title || file.name.replace(/\.[^/.]+$/, ''),
          author: combinedMeta.author || assemblyOptions.masterAuthor || 'Author',
          volumePrefix: `Book ${currentCount + 1}`,
          rawText: uploadResult.rawText,
          metadata: combinedMeta,
          chapterCount: parsedChapters.length,
          wordCount,
        };

        newBooks.push(bookItem);
      } catch (err) {
        console.warn(`Failed to process ${file.name}:`, err);
      }
    }

    if (newBooks.length > 0) {
      setBooks((prev) => [...prev, ...newBooks]);

      // If user had no custom title yet, generate one from the files
      if (
        books.length === 0 &&
        assemblyOptions.masterTitle.includes('Complete Northern Chronicles')
      ) {
        const primary = newBooks[0];
        setAssemblyOptions((prev) => ({
          ...prev,
          masterTitle: `${primary.title} — Omnibus Edition`,
          masterAuthor: primary.author || prev.masterAuthor,
        }));
      }
    } else {
      setErrorMessage('Could not parse text from the uploaded files. Please check file format.');
    }

    setIsProcessingFiles(false);
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Trigger assembly
  const handleAssemble = () => {
    if (books.length === 0) {
      setErrorMessage('Please add at least 1 book to assemble the omnibus.');
      return;
    }

    const { mergedText } = assembleOmnibusManuscript(books, assemblyOptions);

    const omnibusMetadata: Partial<BookMetadata> = {
      title: assemblyOptions.masterTitle || 'Omnibus Collection',
      subtitle: `${books.length}-Book Series Collection`,
      author: assemblyOptions.masterAuthor || books[0]?.author || 'Various Authors',
      publisher: assemblyOptions.masterPublisher || 'Omnibus Publishing',
      year: assemblyOptions.masterYear || new Date().getFullYear().toString(),
      genre: assemblyOptions.masterGenre || books[0]?.metadata?.genre || 'Omnibus Series',
      synopsis: `Complete collection containing: ${books.map((b, i) => `${i + 1}. ${b.title}`).join(', ')}.`,
    };

    onAssembleOmnibus(mergedText, omnibusMetadata, books);
    onClose();
  };

  // Statistics
  const totalChapters = books.reduce((acc, b) => acc + b.chapterCount, 0);
  const totalWords = books.reduce((acc, b) => acc + b.wordCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold shadow-md">
              <Library className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-stone-100">
                  Multi-Book Omnibus & Series Binder
                </h2>
                <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Multi-Input
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Input 2, 3, or more HTML / E-Book files into one unified document. Drag & reorder where you want each.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Actions: Multi-File Drop / Upload Button */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center transition-all ${
              isDraggingOver
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : 'border-stone-700/80 hover:border-stone-600 bg-stone-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".html,.htm,.xhtml,.epub,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFiles(e.target.files);
                }
              }}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-200">
                    Add HTML or E-Book Files to Omnibus
                  </p>
                  <p className="text-xs text-stone-400">
                    Drop multiple HTML, EPUB, or DOCX files here at once
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFiles}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Choose HTML / Book Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBooks(getSampleTrilogy())}
                  title="Load sample 3-book fantasy trilogy"
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sample Trilogy</span>
                </button>
              </div>
            </div>

            {isProcessingFiles && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing book structures and chapter hierarchies...</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Book Sequence & Ordering ("Change where you want each") */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MoveVertical className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Book Order & Sequence ({books.length} Books in Collection)
                </h3>
              </div>
              <span className="text-xs text-stone-400">
                Use ▲ ▼ arrows or position dropdown to reorder where each book appears
              </span>
            </div>

            {books.length === 0 ? (
              <div className="p-8 bg-stone-950/40 border border-stone-800 rounded-xl text-center text-stone-400 text-xs">
                No books added yet. Click &ldquo;Choose HTML / Book Files&rdquo; or &ldquo;Sample Trilogy&rdquo; above to get started.
              </div>
            ) : (
              <div className="space-y-2.5">
                {books.map((book, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === books.length - 1;

                  return (
                    <div
                      key={book.id}
                      className="p-3.5 bg-stone-950/80 border border-stone-800 hover:border-stone-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                    >
                      {/* Left: Position Indicator & Reordering Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveBookUp(idx)}
                            disabled={isFirst}
                            title="Move Book Up"
                            className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBookDown(idx)}
                            disabled={isLast}
                            title="Move Book Down"
                            className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Position Badge & Selector */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                            Pos
                          </span>
                          <select
                            value={idx + 1}
                            onChange={(e) =>
                              moveBookToPosition(idx, parseInt(e.target.value, 10))
                            }
                            className="bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono font-bold outline-none cursor-pointer"
                          >
                            {books.map((_, pIdx) => (
                              <option key={pIdx} value={pIdx + 1}>
                                #{pIdx + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Book Metadata & Title Editing */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={book.volumePrefix}
                              onChange={(e) =>
                                updateBook(book.id, { volumePrefix: e.target.value })
                              }
                              placeholder="Book 1"
                              className="w-20 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-xs text-amber-300 font-semibold focus:border-amber-500 outline-none"
                            />
                            <input
                              type="text"
                              value={book.title}
                              onChange={(e) =>
                                updateBook(book.id, { title: e.target.value })
                              }
                              placeholder="Book Title"
                              className="w-48 sm:w-64 bg-stone-900 border border-stone-700 rounded px-2.5 py-0.5 text-xs sm:text-sm font-semibold text-stone-100 focus:border-amber-500 outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                            <span>by {book.author || 'Author'}</span>
                            <span>•</span>
                            <span className="text-amber-400/90">{book.chapterCount} chapters</span>
                            <span>•</span>
                            <span>{book.wordCount.toLocaleString()} words</span>
                            <span>•</span>
                            <span className="text-stone-500 truncate max-w-[120px]">{book.fileName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => removeBook(book.id)}
                          title="Remove from omnibus"
                          className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sequence Pipeline Visualizer */}
          {books.length > 0 && (
            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl">
              <div className="flex items-center justify-between text-xs mb-2 text-stone-400">
                <span className="font-semibold text-stone-300">Omnibus Flow Preview:</span>
                <span className="font-mono text-amber-400">
                  {books.length} Books • {totalChapters} Chapters • {totalWords.toLocaleString()} Words
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {books.map((b, i) => (
                  <React.Fragment key={b.id}>
                    <div className="shrink-0 bg-stone-900 border border-stone-700/80 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-stone-200 truncate max-w-[160px]">
                        {b.title}
                      </span>
                    </div>
                    {i < books.length - 1 && (
                      <span className="text-stone-500 shrink-0 font-bold">➔</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Master Omnibus Configuration */}
          <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Omnibus Master Metadata & Division Settings
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Master Omnibus Title
                </label>
                <input
                  type="text"
                  value={assemblyOptions.masterTitle}
                  onChange={(e) =>
                    setAssemblyOptions({ ...assemblyOptions, masterTitle: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Author / Series Creator
                </label>
                <input
                  type="text"
                  value={assemblyOptions.masterAuthor}
                  onChange={(e) =>
                    setAssemblyOptions({ ...assemblyOptions, masterAuthor: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Volume Division Style in Manuscript
                </label>
                <select
                  value={assemblyOptions.divisionStyle}
                  onChange={(e) =>
                    setAssemblyOptions({
                      ...assemblyOptions,
                      divisionStyle: e.target.value as any,
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 focus:border-amber-500 outline-none"
                >
                  <option value="book">Book 1, Book 2, Book 3... (# Book 1: Title)</option>
                  <option value="volume">Volume I, Volume II, Volume III... (# Volume I: Title)</option>
                  <option value="part">Part 1, Part 2, Part 3... (# Part 1: Title)</option>
                  <option value="preserve">Preserve Custom Prefixes (# Custom Prefix: Title)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Publisher / Imprint
                </label>
                <input
                  type="text"
                  value={assemblyOptions.masterPublisher}
                  onChange={(e) =>
                    setAssemblyOptions({ ...assemblyOptions, masterPublisher: e.target.value })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assemblyOptions.includeBookTitlePages}
                  onChange={(e) =>
                    setAssemblyOptions({
                      ...assemblyOptions,
                      includeBookTitlePages: e.target.checked,
                    })
                  }
                  className="rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500"
                />
                <span>Include author byline & synopsis block at the start of each volume</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-400">
            <span>Result: <strong>1 single unified file</strong> containing all {books.length} books with nested TOC.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAssemble}
              disabled={books.length === 0}
              className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Assemble Omnibus ({books.length} Books into 1 File)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
