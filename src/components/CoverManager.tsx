import { useState, useRef, useEffect, DragEvent } from 'react';
import { BookMetadata } from '../types';
import { Image, Upload, Clipboard, Trash2, Palette, Sparkles, Check, User, BookOpen, Flame } from 'lucide-react';
import { optimizeCoverImage, formatBytes } from '../utils/imageOptimizer';

interface CoverManagerProps {
  metadata: BookMetadata;
  onChangeMetadata: (updated: BookMetadata) => void;
  isSecretUnlocked?: boolean;
  onUnlockSecretThemes?: () => void;
}

export function CoverManager({
  metadata,
  onChangeMetadata,
  isSecretUnlocked = false,
  onUnlockSecretThemes,
}: CoverManagerProps) {
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Global paste handler when in this tab to allow effortless Ctrl+V / Cmd+V of images!
  useEffect(() => {
    const handleGlobalPaste = (e: any) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            readImageFile(file, 'Pasted image from system clipboard');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [metadata]);

  const readImageFile = async (file: File, feedbackText = 'Cover image loaded') => {
    setIsOptimizing(true);
    try {
      // Automatically optimize and downscale camera/phone images (reduces 40-60 MB down to < 250 KB)
      const result = await optimizeCoverImage(file, 1200, 1800, 0.88);
      onChangeMetadata({
        ...metadata,
        coverImageUrl: result.dataUrl,
      });

      if (result.originalSizeBytes > 800 * 1024) {
        setPasteFeedback(
          `Cover optimized! Compressed ${formatBytes(result.originalSizeBytes)} ➔ ${formatBytes(result.optimizedSizeBytes)} (${Math.round(result.compressionRatio * 100)}% lighter for instant loading)`
        );
      } else {
        setPasteFeedback(feedbackText);
      }
      setTimeout(() => setPasteFeedback(null), 4500);
    } catch (err) {
      console.warn('Cover optimization failed, falling back to direct reader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onChangeMetadata({
            ...metadata,
            coverImageUrl: event.target.result,
          });
          setPasteFeedback(feedbackText);
          setTimeout(() => setPasteFeedback(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePasteFromClipboardClick = async () => {
    try {
      if (!navigator.clipboard?.read) {
        // Fallback prompt
        setPasteFeedback('Press Ctrl+V (or Cmd+V) to paste an image directly from your clipboard.');
        setTimeout(() => setPasteFeedback(null), 4000);
        return;
      }

      const items = await navigator.clipboard.read();
      let foundImage = false;

      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-cover.png', { type });
            readImageFile(file, 'Cover pasted successfully from clipboard!');
            foundImage = true;
            break;
          }
        }
        if (foundImage) break;
      }

      if (!foundImage) {
        setPasteFeedback('No image found on clipboard. Try copying an image first, then paste.');
        setTimeout(() => setPasteFeedback(null), 3500);
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      setPasteFeedback('Press Ctrl+V / Cmd+V anywhere on this screen to paste your image.');
      setTimeout(() => setPasteFeedback(null), 4000);
    }
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        readImageFile(file, 'Dropped image applied as cover');
      } else {
        setPasteFeedback('Please drop an image file (PNG, JPG, WebP)');
        setTimeout(() => setPasteFeedback(null), 3000);
      }
    }
  };

  const themes = [
    { id: 'classic-navy', name: 'Royal Navy & Gold', bg: 'bg-[#121c2e] text-[#f4ecd8] border-[#c4a265]', accent: 'text-[#e5c378]' },
    { id: 'dark-editorial', name: 'Editorial Obsidian', bg: 'bg-[#18181b] text-stone-100 border-stone-600', accent: 'text-amber-400' },
    { id: 'warm-amber', name: 'Warm Parchment', bg: 'bg-[#f7f2e7] text-[#2c221e] border-[#cbbca3]', accent: 'text-[#8b5a2b]' },
    { id: 'forest-sage', name: 'Forest Sage', bg: 'bg-[#1b2b24] text-[#e8f1eb] border-[#557e6c]', accent: 'text-[#88c9a1]' },
    { id: 'crimson-leather', name: 'Crimson Cloth', bg: 'bg-[#2d1217] text-[#faeae6] border-[#8e3845]', accent: 'text-[#e68d9b]' },
  ] as const;

  const currentTheme = themes.find((t) => t.id === metadata.coverTheme) || themes[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cover Preview Column */}
        <div className="lg:w-5/12 flex flex-col items-center">
          <div className="sticky top-24 w-full max-w-sm flex flex-col items-center">
            {/* Visual Book Jacket */}
            <div
              ref={dropZoneRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={handleImageDrop}
              className={`w-full aspect-[1/1.55] rounded-xl shadow-2xl relative overflow-hidden transition-all duration-300 border-2 flex flex-col ${
                isDraggingImage ? 'border-amber-400 scale-[1.02] ring-4 ring-amber-400/20' : 'border-stone-800'
              }`}
            >
              {metadata.coverImageUrl ? (
                <div className="relative w-full h-full group">
                  <img
                    src={metadata.coverImageUrl}
                    alt={metadata.title || 'Book Cover'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <p className="text-white text-xs font-medium">Custom Cover Active</p>
                    <button
                      onClick={() => onChangeMetadata({ ...metadata, coverImageUrl: '' })}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg flex items-center gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Image</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Typographic Generated Book Cover */
                <div className={`w-full h-full p-8 flex flex-col justify-between items-center text-center relative ${currentTheme.bg}`}>
                  {/* Subtle Book Spine shadow on the left */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                  
                  {/* Outer ornamental border */}
                  <div className="absolute inset-3 border border-current opacity-30 rounded-lg pointer-events-none" />
                  <div className="absolute inset-4 border border-current opacity-15 rounded-md pointer-events-none" />

                  {/* Top metadata */}
                  <div className="z-10 pt-4">
                    <span className="text-[11px] uppercase tracking-[0.25em] font-sans opacity-75 block">
                      {metadata.genre || 'A Novel'}
                    </span>
                  </div>

                  {/* Center Title and Subtitle */}
                  <div className="z-10 px-2 my-auto">
                    <div className="w-8 h-0.5 mx-auto mb-4 bg-current opacity-40" />
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-tight line-clamp-3">
                      {metadata.title || 'Untitled Document'}
                    </h1>
                    {metadata.subtitle && (
                      <p className="text-xs sm:text-sm font-serif italic mt-2 opacity-80 line-clamp-2">
                        {metadata.subtitle}
                      </p>
                    )}
                    <div className="w-8 h-0.5 mx-auto mt-4 bg-current opacity-40" />
                  </div>

                  {/* Bottom Author and Publisher */}
                  <div className="z-10 pb-4">
                    <p className={`text-xs uppercase tracking-[0.2em] font-medium ${currentTheme.accent}`}>
                      {metadata.author || 'Author Name'}
                    </p>
                    {metadata.publisher && (
                      <p className="text-[10px] opacity-60 tracking-wider font-sans mt-1">
                        {metadata.publisher} {metadata.year ? `• ${metadata.year}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Drag overlay indicator */}
              {isDraggingImage && (
                <div className="absolute inset-0 bg-amber-500/80 backdrop-blur-xs flex flex-col items-center justify-center text-stone-950 font-bold p-4 text-center z-20">
                  <Image className="w-10 h-10 mb-2 animate-bounce" />
                  <span>Release to set as cover</span>
                </div>
              )}
            </div>

            {/* Paste Feedback alert */}
            {pasteFeedback && (
              <div className="mt-3 px-3 py-1.5 bg-amber-950 border border-amber-800 text-amber-200 text-xs rounded-lg flex items-center gap-1.5 shadow-sm">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>{pasteFeedback}</span>
              </div>
            )}

            {/* Cover Action Buttons */}
            <div className="w-full mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboardClick}
                className="flex-1 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clipboard className="w-4 h-4 text-amber-400" />
                <span>Paste from System</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-stone-400" />
                <span>Upload Image</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    readImageFile(e.target.files[0], 'Cover image loaded from file');
                  }
                }}
                className="hidden"
              />
            </div>

            <p className="text-[11px] text-stone-400 text-center mt-2">
              Tip: You can press <kbd className="px-1 py-0.5 bg-stone-800 rounded text-stone-300 font-mono">Ctrl+V</kbd> or <kbd className="px-1 py-0.5 bg-stone-800 rounded text-stone-300 font-mono">Cmd+V</kbd> anywhere on screen to paste an image from your clipboard.
            </p>
          </div>
        </div>

        {/* Metadata Details Column */}
        <div className="lg:w-7/12 space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>Document & Book Details</span>
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-stone-400">
                      Book / Document Title
                    </label>
                    {isSecretUnlocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Ancient Bloodline Unlocked</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      onChangeMetadata({ ...metadata, title: newTitle });
                      if (newTitle.trim().toLowerCase() === 'ancient bloodline') {
                        onUnlockSecretThemes?.();
                      }
                    }}
                    placeholder="e.g. Ancient Bloodline or The Chronicle of Bess"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {!isSecretUnlocked && (
                    <p className="text-[11px] text-stone-500 mt-1 italic">
                      Tip: Enter title "Ancient Bloodline" to unlock exclusive hidden themes.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={metadata.subtitle}
                    onChange={(e) => onChangeMetadata({ ...metadata, subtitle: e.target.value })}
                    placeholder="e.g. A Tale of High Mountain Passes"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Author
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={metadata.author}
                      onChange={(e) => onChangeMetadata({ ...metadata, author: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <User className="w-4 h-4 text-stone-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Genre / Category
                  </label>
                  <input
                    type="text"
                    value={metadata.genre}
                    onChange={(e) => onChangeMetadata({ ...metadata, genre: e.target.value })}
                    placeholder="e.g. Historical Fiction / Memoir"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Publisher / Imprint
                  </label>
                  <input
                    type="text"
                    value={metadata.publisher}
                    onChange={(e) => onChangeMetadata({ ...metadata, publisher: e.target.value })}
                    placeholder="e.g. Silverwood Press"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Year / Edition
                  </label>
                  <input
                    type="text"
                    value={metadata.year}
                    onChange={(e) => onChangeMetadata({ ...metadata, year: e.target.value })}
                    placeholder="e.g. 2026"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Synopsis / Summary
                  </label>
                  <textarea
                    rows={3}
                    value={metadata.synopsis}
                    onChange={(e) => onChangeMetadata({ ...metadata, synopsis: e.target.value })}
                    placeholder="Brief description of the book or document..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preset Cover Theme Selection (for generated covers) */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-500" />
                  <span>Cover Palette Presets</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Applied when custom image is not loaded
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map((theme) => {
                const isSelected = metadata.coverTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onChangeMetadata({ ...metadata, coverTheme: theme.id })}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-stone-800'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-5 h-5 rounded-full border ${theme.bg}`} />
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <span className="text-xs font-medium text-stone-200">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
