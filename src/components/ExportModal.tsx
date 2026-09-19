import { useState } from 'react';
import { BookMetadata, ChapterItem, FormatOptions } from '../types';
import { formatDocumentText } from '../utils/parser';
import { generateEpubBlob } from '../utils/epubGenerator';
import { generateStandaloneHtmlBook } from '../utils/htmlGenerator';
import {
  Download,
  FileCode,
  FileText,
  Printer,
  Copy,
  Check,
  X,
  BookOpen,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: BookMetadata;
  chapters: ChapterItem[];
  options: FormatOptions;
  rawText: string;
}

export function ExportModal({
  isOpen,
  onClose,
  metadata,
  chapters,
  options,
  rawText,
}: ExportModalProps) {
  const [isGeneratingEpub, setIsGeneratingEpub] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [epubSuccess, setEpubSuccess] = useState(false);
  const [htmlSuccess, setHtmlSuccess] = useState(false);

  if (!isOpen) return null;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
  };

  // Generate EPUB with Cover, Publisher, Year, and Chapters
  const handleExportEpub = async () => {
    setIsGeneratingEpub(true);
    setEpubSuccess(false);
    try {
      const blob = await generateEpubBlob(metadata, chapters, options);
      const safeName = (metadata.title || 'book')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      downloadBlob(blob, `${safeName || 'book'}.epub`);
      setEpubSuccess(true);
      setTimeout(() => setEpubSuccess(false), 3000);
    } catch (err) {
      console.error('EPUB Generation error:', err);
      alert('Failed to generate EPUB. Please ensure chapter content is valid.');
    } finally {
      setIsGeneratingEpub(false);
    }
  };

  // Generate HTML Book with Cover, Publisher, Year, and Chapters
  const handleExportHtml = () => {
    setHtmlSuccess(false);
    const htmlContent = generateStandaloneHtmlBook(metadata, chapters, options);
    const safeName = (metadata.title || 'book')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    downloadFile(htmlContent, `${safeName || 'book'}.html`, 'text/html;charset=utf-8');
    setHtmlSuccess(true);
    setTimeout(() => setHtmlSuccess(false), 3000);
  };

  // Fix PDF in iframe: Opens clean standalone window for printing or Save as PDF
  const handleOpenPrintWindow = () => {
    const htmlContent = generateStandaloneHtmlBook(metadata, chapters, options);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // If popup blocker intervened, fallback to direct download of the print HTML
      downloadBlob(blob, `${(metadata.title || 'book').toLowerCase().replace(/\s+/g, '-')}-printable.html`);
      alert('Popup was blocked by your browser. The print-ready HTML book has been downloaded. Open it and select Print -> Save as PDF.');
    }
  };

  // Generate Markdown with Frontmatter & TOC
  const generateMarkdownExport = (): string => {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`title: "${metadata.title || 'Untitled'}"`);
    if (metadata.subtitle) lines.push(`subtitle: "${metadata.subtitle}"`);
    lines.push(`author: "${metadata.author || 'Anonymous'}"`);
    if (metadata.publisher) lines.push(`publisher: "${metadata.publisher}"`);
    if (metadata.year) lines.push(`year: "${metadata.year}"`);
    if (metadata.genre) lines.push(`genre: "${metadata.genre}"`);
    if (metadata.isbn) lines.push(`isbn: "${metadata.isbn}"`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${metadata.title || 'Untitled'}`);
    if (metadata.subtitle) lines.push(`*${metadata.subtitle}*`);
    lines.push('');
    lines.push(`**By ${metadata.author || 'Author'}**`);
    if (metadata.publisher || metadata.year) {
      lines.push(`*Published by ${metadata.publisher || 'Independent'}, ${metadata.year || new Date().getFullYear()}*`);
    }
    lines.push('');

    // Table of contents
    lines.push('## Table of Contents');
    lines.push('');
    chapters.forEach((ch) => {
      const indent = ch.level === 1 ? '' : ch.level === 2 ? '  ' : '    ';
      const anchor = ch.cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lines.push(`${indent}- [${ch.cleanTitle}](#${anchor})`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');

    // Chapters
    chapters.forEach((ch) => {
      const hashes = '#'.repeat(ch.level === 1 ? 2 : ch.level === 2 ? 3 : 4);
      lines.push(`${hashes} ${ch.cleanTitle}`);
      lines.push('');
      const formattedBody = formatDocumentText(ch.content, {
        curlyQuotes: options.curlyQuotes,
        emDashes: options.emDashes,
        ellipses: options.ellipses,
        cleanDoubleSpacing: options.cleanDoubleSpacing,
        sceneBreakOrnament: options.sceneBreakOrnament,
      });
      lines.push(formattedBody);
      lines.push('');
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownExport();
    navigator.clipboard.writeText(md);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-100">
                Export Formatted Book
              </h2>
              <p className="text-xs text-stone-400">
                Includes cover, publisher ({metadata.publisher || 'Set in Cover'}), and year ({metadata.year || '2026'}).
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

        <div className="p-6 space-y-4">
          {/* Metadata preview banner */}
          <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-2 h-10 bg-amber-500 rounded-full" />
              <div>
                <p className="font-semibold text-stone-200">{metadata.title || 'Untitled Manuscript'}</p>
                <p className="text-stone-400">
                  By {metadata.author || 'Author'} • {metadata.publisher || 'Independent'} ({metadata.year || '2026'})
                </p>
              </div>
            </div>
            <div className="text-right text-stone-400 font-mono">
              <span>{chapters.length} chapters</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* 1. EPUB Digital E-Book (Requested) */}
            <button
              onClick={handleExportEpub}
              disabled={isGeneratingEpub}
              className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-stone-950 hover:border-amber-400 hover:from-amber-500/15 transition-all text-left group flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold bg-amber-500 text-stone-950 px-2 py-0.5 rounded shadow-xs">
                  EPUB 3
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                  <span>Download EPUB E-Book</span>
                  {epubSuccess && <Check className="w-4 h-4 text-green-400" />}
                </p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Valid digital e-book with embedded cover, publisher & year colophon, TOC, and chapters for Apple Books, Kindle, and Kobo.
                </p>
              </div>
              {isGeneratingEpub && (
                <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Building EPUB container...
                </div>
              )}
            </button>

            {/* 2. Standalone HTML Book (Requested) */}
            <button
              onClick={handleExportHtml}
              className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-stone-950 hover:border-amber-400 hover:from-amber-500/15 transition-all text-left group flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileCode className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold bg-amber-500 text-stone-950 px-2 py-0.5 rounded shadow-xs">
                  .HTML
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                  <span>Download HTML Book</span>
                  {htmlSuccess && <Check className="w-4 h-4 text-green-400" />}
                </p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Complete single-file web manuscript with embedded cover, publisher, year, Google Fonts, and table of contents.
                </p>
              </div>
            </button>

            {/* 3. Print / Save as PDF (Fix for iframe) */}
            <button
              onClick={handleOpenPrintWindow}
              className="p-4 rounded-xl border border-stone-800 bg-stone-950/80 hover:border-stone-600 hover:bg-stone-950 transition-all text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                  PDF / Print
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                  <span>Open Printable Window (Save PDF)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                </p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Opens clean printable manuscript in a dedicated window so you can select <span className="text-stone-300">"Save as PDF"</span> without iframe restrictions.
                </p>
              </div>
            </button>

            {/* 4. Formatted Markdown */}
            <button
              onClick={() => {
                const md = generateMarkdownExport();
                const filename = `${(metadata.title || 'manuscript').toLowerCase().replace(/\s+/g, '-')}.md`;
                downloadFile(md, filename, 'text/markdown');
              }}
              className="p-4 rounded-xl border border-stone-800 bg-stone-950/80 hover:border-stone-600 hover:bg-stone-950 transition-all text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                  .MD
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100">Formatted Markdown</p>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  YAML frontmatter with publisher & year, markdown TOC links, and chapter headings.
                </p>
              </div>
            </button>
          </div>

          {/* Copy markdown utility bar */}
          <div className="mt-2 pt-3 border-t border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              Need raw text for your clipboard?
            </span>
            <button
              onClick={handleCopyMarkdown}
              className="text-xs text-stone-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors font-medium"
            >
              {copiedType === 'markdown' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied to clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown with Frontmatter</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/50 flex items-center justify-between">
          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>EPUB & HTML include cover jacket, publisher, and year metadata.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
