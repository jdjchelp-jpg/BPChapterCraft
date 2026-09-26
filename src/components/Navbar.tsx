import { BookOpen, FileText, Download, Settings, RefreshCw, UploadCloud, Sparkles, Library } from 'lucide-react';

interface NavbarProps {
  activeTab: 'preview' | 'editor' | 'toc' | 'cover';
  setActiveTab: (tab: 'preview' | 'editor' | 'toc' | 'cover') => void;
  chapterCount: number;
  wordCount: number;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onLoadSample: () => void;
  onOpenSettings: () => void;
  onOpenOmnibus: () => void;
  omnibusBookCount?: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  chapterCount,
  wordCount,
  onOpenUpload,
  onOpenExport,
  onLoadSample,
  onOpenSettings,
  onOpenOmnibus,
  omnibusBookCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-stone-950 font-bold shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg tracking-tight text-stone-100">
                ChapterCraft
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 font-medium border border-stone-700">
                Book & Doc Formatter
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Auto-detects chapters, generates TOC, and formats manuscripts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-stone-800/80 p-1 rounded-lg border border-stone-700">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Book View</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manuscript</span>
          </button>

          <button
            onClick={() => setActiveTab('toc')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'toc'
                ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <span>TOC</span>
            <span className="px-1.5 py-0.2 bg-stone-900/60 rounded text-xs font-mono">
              {chapterCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cover')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'cover'
                ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <span>Cover & Meta</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLoadSample}
            title="Load sample document with bold chapters (** Chapter 2 Bess**)"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Doc</span>
          </button>

          <button
            onClick={onOpenOmnibus}
            title="Multi-Book Omnibus Binder: Combine multiple books / HTML files into 1 file and reorder them"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-300 border border-amber-500/40 rounded-lg transition-all shadow-xs"
          >
            <Library className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Omnibus Binder</span>
            {omnibusBookCount && omnibusBookCount > 1 ? (
              <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 rounded-full text-[10px] font-bold">
                {omnibusBookCount} bks
              </span>
            ) : null}
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 rounded-lg transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-stone-300" />
            <span className="hidden sm:inline">Upload / Paste</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Delimiter and Parser Settings"
            className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
}
