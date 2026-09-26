import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookMetadata,
  ChapterItem,
  FormatOptions,
  BOOK_FONT_DETAILS,
  DEFAULT_FORMAT_OPTIONS,
  BookFontFamily,
} from '../types';
import { formatDocumentText } from '../utils/parser';
import { BookSidePanel } from './BookSidePanel';
import { PUTER_VOICES, speakWithPuter, isPuterAvailable } from '../utils/puterTTS';
import {
  Type,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Palette,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  Printer,
  Sparkles,
  RotateCcw,
  BookOpen,
  Volume2,
  Sliders,
  Play,
  Pause,
} from 'lucide-react';

interface BookPreviewProps {
  metadata: BookMetadata;
  chapters: ChapterItem[];
  options: FormatOptions;
  onChangeOptions: (updated: FormatOptions) => void;
  selectedChapterId?: string;
  onOpenExport: () => void;
  isSecretUnlocked?: boolean;
}

export function BookPreview({
  metadata,
  chapters,
  options,
  onChangeOptions,
  selectedChapterId,
  onOpenExport,
  isSecretUnlocked = false,
}: BookPreviewProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isContinuousScroll, setIsContinuousScroll] = useState(true);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Text-To-Speech (TTS) Engine State
  const [ttsEngineMode, setTtsEngineMode] = useState<'puter' | 'browser'>('puter');
  const [selectedPuterVoiceId, setSelectedPuterVoiceId] = useState<string>('gemini-puck');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeakingChapter, setActiveSpeakingChapter] = useState<number | null>(null);
  const [activeParaIndex, setActiveParaIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const playbackRunIdRef = useRef<number>(0);

  // Load and rank browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          const sorted = available.slice().sort((a, b) => {
            const getScore = (v: SpeechSynthesisVoice) => {
              const name = (v.name || '').toLowerCase();
              let s = 0;
              if (name.includes('natural') || name.includes('neural') || name.includes('online')) s += 50;
              if (name.includes('studio') || name.includes('enhanced') || name.includes('journey')) s += 40;
              if (name.includes('google') || name.includes('microsoft') || name.includes('apple')) s += 20;
              if (v.lang.startsWith('en')) s += 10;
              return s;
            };
            return getScore(b) - getScore(a);
          });
          setVoices(sorted);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      playbackRunIdRef.current++;
      isSpeakingRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Stop speech playback
  const handleStopSpeech = useCallback(() => {
    playbackRunIdRef.current++;
    isSpeakingRef.current = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveSpeakingChapter(null);
    setActiveParaIndex(null);
  }, []);

  // Speak a specific paragraph with auto-advance and highlight
  const speakParagraph = useCallback(
    async (chapterIdx: number, paraIdx: number) => {
      const runId = ++playbackRunIdRef.current;
      isSpeakingRef.current = true;

      // Cancel any ongoing browser synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Stop any existing Puter audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current = null;
      }

      if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;

      const ch = chapters[chapterIdx];
      if (!ch) {
        handleStopSpeech();
        return;
      }

      const formatted = formatDocumentText(ch.content, {
        curlyQuotes: options.curlyQuotes,
        emDashes: options.emDashes,
        ellipses: options.ellipses,
        cleanDoubleSpacing: options.cleanDoubleSpacing,
        sceneBreakOrnament: options.sceneBreakOrnament,
      });

      const paragraphs = formatted
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => Boolean(p) && !p.includes('scene-break') && !/^\s*(\*|✦|❦|—)/.test(p));

      if (paraIdx >= paragraphs.length) {
        // Current chapter finished!
        if (autoAdvance && chapterIdx < chapters.length - 1) {
          const nextIdx = chapterIdx + 1;
          setCurrentChapterIndex(nextIdx);
          const nextEl = document.getElementById(`preview-${chapters[nextIdx].id}`);
          nextEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (runId === playbackRunIdRef.current && isSpeakingRef.current) {
            speakParagraph(nextIdx, 0);
          }
        } else {
          handleStopSpeech();
        }
        return;
      }

      setActiveSpeakingChapter(chapterIdx);
      setActiveParaIndex(paraIdx);
      setIsSpeaking(true);
      setIsPaused(false);

      // Smooth scroll paragraph into view
      const pEl = document.getElementById(`preview-p-${chapterIdx}-${paraIdx}`);
      pEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const textToSpeak = paragraphs[paraIdx];

      // Fallback helper for browser speech synthesis
      const speakWithBrowser = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        if (voices[selectedVoiceIndex]) {
          utterance.voice = voices[selectedVoiceIndex];
        }
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;

        utterance.onend = () => {
          if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;
          speakParagraph(chapterIdx, paraIdx + 1);
        };

        utterance.onerror = (err) => {
          // If speech was cancelled or interrupted, do NOT speak the next paragraph!
          if (err.error === 'canceled' || err.error === 'interrupted') return;
          if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;
          console.warn('Browser TTS utterance error:', err);
          speakParagraph(chapterIdx, paraIdx + 1);
        };

        window.speechSynthesis.speak(utterance);
      };

      // Try Puter AI TTS first if mode is 'puter' and puter is available
      if (ttsEngineMode === 'puter' && isPuterAvailable()) {
        try {
          const puterVoice =
            PUTER_VOICES.find((v) => v.id === selectedPuterVoiceId) || PUTER_VOICES[0];
          const audio = await speakWithPuter(textToSpeak, puterVoice, ttsRate);

          if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) {
            audio.pause();
            return;
          }

          currentAudioRef.current = audio;

          audio.onended = () => {
            if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;
            currentAudioRef.current = null;
            speakParagraph(chapterIdx, paraIdx + 1);
          };

          audio.onerror = (err) => {
            if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;
            console.warn('Puter audio playback error, falling back to browser:', err);
            currentAudioRef.current = null;
            speakWithBrowser();
          };

          await audio.play();
          return;
        } catch (err: any) {
          if (runId !== playbackRunIdRef.current || !isSpeakingRef.current) return;
          console.warn('Puter TTS invocation failed, falling back to browser:', err?.message || err);
          speakWithBrowser();
          return;
        }
      }

      // Default browser synthesis
      speakWithBrowser();
    },
    [
      chapters,
      options,
      autoAdvance,
      voices,
      selectedVoiceIndex,
      ttsRate,
      ttsPitch,
      ttsEngineMode,
      selectedPuterVoiceId,
      handleStopSpeech,
    ]
  );

  const handlePlayChapter = useCallback(
    (index: number) => {
      setCurrentChapterIndex(index);
      const el = document.getElementById(`preview-${chapters[index]?.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      speakParagraph(index, 0);
    },
    [chapters, speakParagraph]
  );

  const handleTogglePause = useCallback(() => {
    if (currentAudioRef.current) {
      if (isPaused) {
        currentAudioRef.current.play().catch(console.warn);
        setIsPaused(false);
      } else {
        currentAudioRef.current.pause();
        setIsPaused(true);
      }
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  // Jump to selected chapter if provided
  useEffect(() => {
    if (selectedChapterId) {
      const idx = chapters.findIndex((c) => c.id === selectedChapterId);
      if (idx !== -1) {
        setCurrentChapterIndex(idx);
        if (isContinuousScroll) {
          const el = document.getElementById(`preview-${selectedChapterId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }, [selectedChapterId, chapters, isContinuousScroll]);

  // Styling theme classes
  const themeClasses: Record<string, string> = {
    light: 'bg-[#faf9f6] text-[#22211f] border-stone-200',
    parchment: 'bg-[#f4eedb] text-[#2b241e] border-[#d8cdb4]',
    dark: 'bg-[#18181b] text-[#e4e4e7] border-stone-800',
    'obsidian-dark': 'bg-[#09090b] text-[#f4f4f5] border-[#27272a] shadow-2xl',
    'parchment-white': 'bg-[#fdfbf7] text-[#18181b] border-[#e7e5e4]',
    'parchment-cream': 'bg-[#fbf4e6] text-[#33271c] border-[#e4d7be]',
  };
  const activeThemeClass = themeClasses[options.colorTheme] || themeClasses.parchment;

  const fontCssMap: Record<BookFontFamily, string> = {
    cormorant: "'Cormorant Garamond', Georgia, serif",
    alegreya: "'Alegreya', Georgia, serif",
    sourceserif: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
    crimson: "'Crimson Text', Georgia, serif",
    serif: "'Lora', Georgia, serif",
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: 'monospace',
  };

  const currentFontFamilyCss = fontCssMap[options.fontFamily] || fontCssMap.serif;
  const currentFontDetail = BOOK_FONT_DETAILS.find((f) => f.id === options.fontFamily) || BOOK_FONT_DETAILS[4];

  // Helper to format chapter body text
  const formatBody = (raw: string) => {
    return formatDocumentText(raw, {
      curlyQuotes: options.curlyQuotes,
      emDashes: options.emDashes,
      ellipses: options.ellipses,
      cleanDoubleSpacing: options.cleanDoubleSpacing,
      sceneBreakOrnament: options.sceneBreakOrnament,
    });
  };

  // Compute page numbers
  let runningPage = 1;
  const chapterPageMap = new Map<string, number>();
  chapters.forEach((ch) => {
    chapterPageMap.set(ch.id, runningPage);
    runningPage += ch.pageEstimate;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Reading Toolbar */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300 shadow-md relative">
        {/* Navigation Selector */}
        <div className="flex items-center gap-2">
          {/* Side Navigation Panel & Voice Reader Button */}
          <button
            onClick={() => setIsSidePanelOpen(true)}
            className="flex items-center gap-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-700 hover:border-amber-500 text-stone-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs"
            title="Open Chapters & Episodes Navigation & Voice Reader (TTS Models)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Chapters & Audio</span>
            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {chapters.length}
            </span>
            {isSpeaking && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              const prev = Math.max(0, currentChapterIndex - 1);
              setCurrentChapterIndex(prev);
              const el = document.getElementById(`preview-${chapters[prev]?.id}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            disabled={currentChapterIndex === 0}
            className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 transition-colors"
            title="Previous Chapter"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={chapters[currentChapterIndex]?.id || ''}
            onChange={(e) => {
              const idx = chapters.findIndex((c) => c.id === e.target.value);
              if (idx !== -1) {
                setCurrentChapterIndex(idx);
                const el = document.getElementById(`preview-${chapters[idx]?.id}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500 max-w-[200px] truncate"
          >
            {chapters.map((ch, idx) => (
              <option key={ch.id} value={ch.id}>
                {idx + 1}. {ch.cleanTitle} (p. {chapterPageMap.get(ch.id)})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const next = Math.min(chapters.length - 1, currentChapterIndex + 1);
              setCurrentChapterIndex(next);
              const el = document.getElementById(`preview-${chapters[next]?.id}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            disabled={currentChapterIndex >= chapters.length - 1}
            className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 transition-colors"
            title="Next Chapter"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Typography & Aesthetic Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Literary Font Family Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFontMenu(!showFontMenu)}
              className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-stone-200 transition-colors"
              title="Select Book Typography / Font"
            >
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium max-w-[130px] truncate">{currentFontDetail.name}</span>
            </button>

            {showFontMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-800 mb-1 flex items-center justify-between">
                  <span>Literary Typefaces</span>
                  <button
                    onClick={() => {
                      onChangeOptions({ ...options, fontFamily: 'serif' });
                      setShowFontMenu(false);
                    }}
                    className="text-amber-400 hover:underline normal-case text-[10px]"
                  >
                    Default
                  </button>
                </div>
                <div className="space-y-1">
                  {BOOK_FONT_DETAILS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onChangeOptions({ ...options, fontFamily: f.id });
                        setShowFontMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col ${
                        options.fontFamily === f.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'hover:bg-stone-800 text-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ fontFamily: f.cssFamily }}>
                          {f.name}
                        </span>
                        <span className="text-[10px] text-stone-400 bg-stone-950 px-1.5 py-0.5 rounded">
                          {f.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{f.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-stone-950 rounded-lg px-2 py-1 border border-stone-800">
            <button
              onClick={() => onChangeOptions({ ...options, fontSize: Math.max(14, options.fontSize - 1) })}
              className="text-stone-400 hover:text-stone-100 p-0.5"
              title="Decrease font size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1">{options.fontSize}px</span>
            <button
              onClick={() => onChangeOptions({ ...options, fontSize: Math.min(24, options.fontSize + 1) })}
              className="text-stone-400 hover:text-stone-100 p-0.5"
              title="Increase font size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Palette */}
          <div className="flex items-center gap-1.5 bg-stone-950 rounded-lg p-1 border border-stone-800">
            {/* Standard themes */}
            <button
              onClick={() => onChangeOptions({ ...options, colorTheme: 'parchment' })}
              title="Parchment Antique (Default Book Page)"
              className={`w-4 h-4 rounded-full bg-[#f4eedb] border transition-all ${
                options.colorTheme === 'parchment' ? 'ring-2 ring-amber-500 scale-110' : 'border-stone-600 hover:scale-105'
              }`}
            />
            <button
              onClick={() => onChangeOptions({ ...options, colorTheme: 'light' })}
              title="Classic Day (White Page)"
              className={`w-4 h-4 rounded-full bg-[#faf9f6] border transition-all ${
                options.colorTheme === 'light' ? 'ring-2 ring-amber-500 scale-110' : 'border-stone-600 hover:scale-105'
              }`}
            />
            <button
              onClick={() => onChangeOptions({ ...options, colorTheme: 'dark' })}
              title="Cozy Night (Muted Dark)"
              className={`w-4 h-4 rounded-full bg-[#27272a] border transition-all ${
                options.colorTheme === 'dark' ? 'ring-2 ring-amber-500 scale-110' : 'border-stone-600 hover:scale-105'
              }`}
            />

            {/* Unlocked Themes (Ancient Bloodline Easter Egg) */}
            {isSecretUnlocked && (
              <>
                <div className="w-px h-3.5 bg-stone-700 mx-0.5" />
                <button
                  onClick={() => onChangeOptions({ ...options, colorTheme: 'obsidian-dark' })}
                  title="★ Unlocked: Obsidian Dark (Deep Black & Gold)"
                  className={`w-4 h-4 rounded-full bg-[#09090b] border border-amber-500/80 transition-all ${
                    options.colorTheme === 'obsidian-dark' ? 'ring-2 ring-amber-400 scale-110 shadow-xs' : 'hover:scale-105'
                  }`}
                />
                <button
                  onClick={() => onChangeOptions({ ...options, colorTheme: 'parchment-white' })}
                  title="★ Unlocked: Paper White (Parchment White)"
                  className={`w-4 h-4 rounded-full bg-[#ffffff] border border-stone-300 transition-all ${
                    options.colorTheme === 'parchment-white' ? 'ring-2 ring-amber-400 scale-110 shadow-xs' : 'hover:scale-105'
                  }`}
                />
                <button
                  onClick={() => onChangeOptions({ ...options, colorTheme: 'parchment-cream' })}
                  title="★ Unlocked: Parchment Cream (Warm Library)"
                  className={`w-4 h-4 rounded-full bg-[#fbf4e6] border border-amber-300 transition-all ${
                    options.colorTheme === 'parchment-cream' ? 'ring-2 ring-amber-400 scale-110 shadow-xs' : 'hover:scale-105'
                  }`}
                />
                <span className="text-[10px] text-amber-400 font-mono pl-0.5 hidden sm:inline" title="Ancient Bloodline hidden themes unlocked">
                  ✦
                </span>
              </>
            )}
          </div>

          {/* Formatting Toggles */}
          <button
            onClick={() => onChangeOptions({ ...options, dropCaps: !options.dropCaps })}
            className={`px-2 py-1 rounded border text-xs transition-colors ${
              options.dropCaps
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-stone-950 border-stone-800 text-stone-400'
            }`}
            title="Toggle first-letter Drop Caps on chapter openings"
          >
            Drop Caps
          </button>

          <button
            onClick={() => onChangeOptions({ ...options, paragraphIndent: !options.paragraphIndent })}
            className={`px-2 py-1 rounded border text-xs transition-colors ${
              options.paragraphIndent
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-stone-950 border-stone-800 text-stone-400'
            }`}
            title="Toggle paragraph indentation (classic book style)"
          >
            Indent
          </button>

          {/* Always Choose Defaults Action */}
          <button
            onClick={() => onChangeOptions(DEFAULT_FORMAT_OPTIONS)}
            className="px-2 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            title="Reset to recommended editorial default formatting"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Defaults</span>
          </button>

          {/* Export & Save Book */}
          <button
            onClick={onOpenExport}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
            title="Export as EPUB, HTML, or Print PDF"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Export Book</span>
          </button>
        </div>
      </div>

      {/* Main Manuscript Book Layout Container */}
      <div
        ref={containerRef}
        className={`book-canvas rounded-2xl shadow-xl border p-8 sm:p-14 transition-colors duration-200 ${activeThemeClass}`}
        style={{
          fontFamily: currentFontFamilyCss,
          fontSize: `${options.fontSize}px`,
          lineHeight: options.lineHeight,
        }}
      >
        {/* 1. Cover Display Section if enabled */}
        {options.includeCoverInBook && (
          <div className="mb-16 pb-16 border-b border-current/15 flex flex-col items-center justify-center min-h-[500px] text-center">
            {metadata.coverImageUrl ? (
              <div className="max-w-md w-full shadow-2xl rounded-lg overflow-hidden border border-black/20">
                <img
                  src={metadata.coverImageUrl}
                  alt={metadata.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="w-full max-w-sm aspect-[1/1.5] p-8 border-2 border-current/30 rounded-lg flex flex-col justify-between items-center shadow-lg">
                <p className="text-xs uppercase tracking-[0.25em] opacity-70">
                  {metadata.genre || 'A Novel'}
                </p>
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {metadata.title || 'Untitled Document'}
                  </h1>
                  {metadata.subtitle && (
                    <p className="text-sm italic opacity-80 mt-1">{metadata.subtitle}</p>
                  )}
                </div>
                <div className="pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] font-medium">
                    {metadata.author || 'Author Name'}
                  </p>
                  {metadata.publisher && (
                    <p className="text-[10px] opacity-60 mt-1">{metadata.publisher}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Half-Title & Title Page */}
        <div className="mb-16 pb-16 border-b border-current/15 text-center py-12">
          <p className="text-xs uppercase tracking-[0.3em] opacity-60 mb-6">
            {metadata.genre || 'First Edition'}
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            {metadata.title || 'Untitled Document'}
          </h1>
          {metadata.subtitle && (
            <p className="text-lg italic opacity-75 max-w-lg mx-auto mb-6">
              {metadata.subtitle}
            </p>
          )}
          <div className="w-12 h-0.5 bg-current opacity-30 mx-auto my-6" />
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            {metadata.author || 'By The Author'}
          </p>
          {metadata.publisher && (
            <p className="text-xs opacity-60 mt-4 tracking-wider">
              Published by {metadata.publisher} {metadata.year ? `(${metadata.year})` : ''}
            </p>
          )}
        </div>

        {/* 3. Formatted Table of Contents inside Document */}
        {options.includeTocInBook && chapters.length > 0 && (
          <div className="mb-16 pb-16 border-b border-current/15 max-w-xl mx-auto">
            <h2 className="text-center font-serif text-xl sm:text-2xl font-bold uppercase tracking-[0.2em] mb-8">
              Contents
            </h2>
            <div className="space-y-3 font-serif">
              {chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  onClick={() => {
                    const el = document.getElementById(`preview-${ch.id}`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`cursor-pointer group flex items-baseline justify-between gap-2 py-0.5 hover:opacity-80 transition-opacity ${
                    ch.level === 2 ? 'pl-6 text-sm opacity-90' : ch.level === 3 ? 'pl-10 text-xs opacity-80' : 'text-base font-semibold'
                  }`}
                >
                  <span className="truncate group-hover:underline">
                    {ch.cleanTitle}
                  </span>
                  {options.tocStyle === 'classic-dots' && (
                    <span className="flex-1 border-b border-dotted border-current/30 mx-2 select-none" />
                  )}
                  <span className="text-sm opacity-70 font-mono shrink-0">
                    {chapterPageMap.get(ch.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Document Chapters & Sections */}
        <div className="space-y-20 max-w-2xl mx-auto">
          {chapters.map((ch, index) => {
            const formattedContent = formatBody(ch.content);
            const paragraphs = formattedContent
              .split('\n\n')
              .map((p) => p.trim())
              .filter(Boolean);

            return (
              <article
                key={ch.id}
                id={`preview-${ch.id}`}
                className="scroll-mt-20 pt-8"
              >
                {/* Chapter Heading Header */}
                <header className="text-center mb-10 pb-4">
                  {ch.prefix && (
                    <span className="block text-xs uppercase tracking-[0.25em] font-sans opacity-60 mb-2">
                      {ch.prefix}
                    </span>
                  )}
                  <h2
                    className={`font-bold tracking-tight ${
                      ch.level === 1
                        ? 'text-2xl sm:text-3xl font-serif'
                        : ch.level === 2
                        ? 'text-xl sm:text-2xl'
                        : 'text-lg font-semibold'
                    }`}
                  >
                    {ch.subtitle || ch.cleanTitle}
                  </h2>
                  <div className="flex items-center justify-center gap-3 mt-4 text-xs opacity-60 font-sans">
                    <span>Page {chapterPageMap.get(ch.id)}</span>
                    <span>•</span>
                    <span>{ch.wordCount} words</span>
                    <span>•</span>
                    <button
                      onClick={() => {
                        handlePlayChapter(index);
                        setIsSidePanelOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 transition-colors"
                      title="Listen to this section"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  </div>
                </header>

                {/* Chapter Text Body */}
                <div
                  className={`space-y-4 ${
                    options.paragraphIndent ? 'prose-indent' : 'prose-spaced'
                  }`}
                >
                  {paragraphs.map((para, pIdx) => {
                    // Check if it's a scene break marker
                    if (para.includes('scene-break') || /^\s*(\*\s*\*\s*\*|✦\s*✦\s*✦|❦|—{3,})\s*$/.test(para)) {
                      return (
                        <div
                          key={pIdx}
                          className="text-center my-8 text-base tracking-widest opacity-60 select-none"
                        >
                          ✦ ✦ ✦
                        </div>
                      );
                    }

                    const isParagraphActive = activeSpeakingChapter === index && activeParaIndex === pIdx;

                    // Check for drop cap on first paragraph of chapter
                    const isFirstPara = pIdx === 0 && options.dropCaps && para.length > 20;
                    if (isFirstPara) {
                      const firstChar = para.charAt(0);
                      const restText = para.slice(1);
                      return (
                        <p
                          key={pIdx}
                          id={`preview-p-${index}-${pIdx}`}
                          className={`leading-relaxed relative transition-all duration-200 ${
                            isParagraphActive
                              ? 'bg-amber-500/15 border-l-4 border-amber-500 pl-3 py-1.5 rounded-r shadow-xs'
                              : ''
                          }`}
                          style={{ textIndent: 0 }}
                        >
                          <span className="float-left text-5xl font-serif font-bold leading-none pr-3 pt-1 text-amber-600 dark:text-amber-400 select-none">
                            {firstChar}
                          </span>
                          {restText}
                        </p>
                      );
                    }

                    return (
                      <p
                        key={pIdx}
                        id={`preview-p-${index}-${pIdx}`}
                        className={`leading-relaxed transition-all duration-200 ${
                          options.paragraphIndent && pIdx > 0 && !isParagraphActive ? 'indent-8' : ''
                        } ${
                          isParagraphActive
                            ? 'bg-amber-500/15 border-l-4 border-amber-500 pl-3 py-1.5 rounded-r shadow-xs'
                            : ''
                        }`}
                      >
                        {para}
                      </p>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Side Navigation Panel Drawer & Voice Models TTS Player */}
      <BookSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        metadata={metadata}
        chapters={chapters}
        currentChapterIndex={currentChapterIndex}
        onSelectChapter={(idx) => {
          setCurrentChapterIndex(idx);
          const el = document.getElementById(`preview-${chapters[idx]?.id}`);
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onPlayChapter={handlePlayChapter}
        onTogglePause={handleTogglePause}
        onStop={handleStopSpeech}
        voices={voices}
        selectedVoiceIndex={selectedVoiceIndex}
        onSelectVoice={setSelectedVoiceIndex}
        rate={ttsRate}
        onChangeRate={setTtsRate}
        pitch={ttsPitch}
        onChangePitch={setTtsPitch}
        autoAdvance={autoAdvance}
        onChangeAutoAdvance={setAutoAdvance}
        activeParaIndex={activeParaIndex}
        ttsEngineMode={ttsEngineMode}
        onChangeTtsEngineMode={setTtsEngineMode}
        selectedPuterVoiceId={selectedPuterVoiceId}
        onSelectPuterVoiceId={setSelectedPuterVoiceId}
        puterAvailable={typeof window !== 'undefined' && Boolean(window.puter?.ai?.txt2speech)}
      />
    </div>
  );
}
