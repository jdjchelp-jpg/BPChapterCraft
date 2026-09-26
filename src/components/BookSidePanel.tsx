import { useState, useMemo } from 'react';
import {
  BookMetadata,
  ChapterItem,
} from '../types';
import {
  X,
  Search,
  BookOpen,
  Volume2,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  CloudLightning,
  Laptop,
  LogIn,
  CheckCircle,
} from 'lucide-react';
import { PUTER_VOICES, PuterVoice, isPuterSignedIn, signInToPuter } from '../utils/puterTTS';

interface BookSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: BookMetadata;
  chapters: ChapterItem[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  onPlayChapter: (index: number) => void;
  onTogglePause: () => void;
  onStop: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  onSelectVoice: (index: number) => void;
  rate: number;
  onChangeRate: (rate: number) => void;
  pitch: number;
  onChangePitch: (pitch: number) => void;
  autoAdvance: boolean;
  onChangeAutoAdvance: (val: boolean) => void;
  activeParaIndex: number | null;
  ttsEngineMode: 'puter' | 'browser';
  onChangeTtsEngineMode: (mode: 'puter' | 'browser') => void;
  selectedPuterVoiceId: string;
  onSelectPuterVoiceId: (id: string) => void;
  puterAvailable: boolean;
}

export function BookSidePanel({
  isOpen,
  onClose,
  metadata,
  chapters,
  currentChapterIndex,
  onSelectChapter,
  isSpeaking,
  isPaused,
  onPlayChapter,
  onTogglePause,
  onStop,
  voices,
  selectedVoiceIndex,
  onSelectVoice,
  rate,
  onChangeRate,
  pitch,
  onChangePitch,
  autoAdvance,
  onChangeAutoAdvance,
  activeParaIndex,
  ttsEngineMode,
  onChangeTtsEngineMode,
  selectedPuterVoiceId,
  onSelectPuterVoiceId,
  puterAvailable,
}: BookSidePanelProps) {
  const [activeTab, setActiveTab] = useState<'toc' | 'tts'>('toc');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered chapters for search
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters.map((ch, idx) => ({ ch, idx }));
    const q = searchQuery.toLowerCase();
    return chapters
      .map((ch, idx) => ({ ch, idx }))
      .filter(
        ({ ch }) =>
          ch.cleanTitle.toLowerCase().includes(q) ||
          (ch.prefix && ch.prefix.toLowerCase().includes(q))
      );
  }, [chapters, searchQuery]);

  // Categorize browser voices
  const categorizedVoices = useMemo(() => {
    const neuralHD: { voice: SpeechSynthesisVoice; index: number }[] = [];
    const naturalStudio: { voice: SpeechSynthesisVoice; index: number }[] = [];
    const standard: { voice: SpeechSynthesisVoice; index: number }[] = [];

    voices.forEach((v, idx) => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();

      const isNeural =
        name.includes('natural') ||
        name.includes('neural') ||
        name.includes('online') ||
        name.includes('journey') ||
        name.includes('multilingual');

      const isStudio =
        name.includes('studio') ||
        name.includes('enhanced') ||
        name.includes('google') ||
        name.includes('microsoft') ||
        name.includes('apple') ||
        name.includes('samantha') ||
        name.includes('daniel') ||
        name.includes('karen') ||
        name.includes('jenny') ||
        name.includes('guy');

      if (isNeural) {
        neuralHD.push({ voice: v, index: idx });
      } else if (isStudio || lang.startsWith('en')) {
        naturalStudio.push({ voice: v, index: idx });
      } else {
        standard.push({ voice: v, index: idx });
      }
    });

    return { neuralHD, naturalStudio, standard };
  }, [voices]);

  // Categorize Puter AI voices by provider
  const categorizedPuterVoices = useMemo(() => {
    const gemini = PUTER_VOICES.filter((v) => v.provider === 'gemini');
    const xAI = PUTER_VOICES.filter((v) => v.provider === 'xai');
    const speechify = PUTER_VOICES.filter((v) => v.provider === 'speechify');
    const openAI = PUTER_VOICES.filter((v) => v.provider === 'openai');
    const polly = PUTER_VOICES.filter((v) => v.provider === 'aws-polly');
    const elevenLabs = PUTER_VOICES.filter((v) => v.provider === 'elevenlabs');
    return { gemini, xAI, speechify, openAI, polly, elevenLabs };
  }, []);

  const activePuterVoice = useMemo(
    () => PUTER_VOICES.find((v) => v.id === selectedPuterVoiceId) || PUTER_VOICES[0],
    [selectedPuterVoiceId]
  );

  const currentChapter = chapters[currentChapterIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-stone-900 border-r border-stone-800 text-stone-100 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-950 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-stone-100 line-clamp-1">
              {metadata.title || 'Untitled Document'}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              By {metadata.author || 'Author'} • {chapters.length} Sections
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 bg-stone-950/60">
          <button
            onClick={() => setActiveTab('toc')}
            className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'toc'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chapters & Episodes ({chapters.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tts'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>AI Voice & TTS</span>
            {isSpeaking && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Tab 1: Chapters & Episodes Navigator */}
        {activeTab === 'toc' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search filter */}
            <div className="p-3 border-b border-stone-800 bg-stone-900/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter chapters or episodes..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredChapters.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-500">
                  No matching chapters or episodes found.
                </div>
              ) : (
                filteredChapters.map(({ ch, idx }) => {
                  const isEpisode = /episode|epsoide|ep\./i.test(ch.cleanTitle);
                  const isAct = /act|scene/i.test(ch.cleanTitle);
                  const unitLabel = isEpisode ? 'Episode' : isAct ? 'Act' : 'Chapter';
                  const isSelected = idx === currentChapterIndex;

                  return (
                    <div
                      key={ch.id}
                      onClick={() => onSelectChapter(idx)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 group ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-stone-950/40 border-stone-800/80 hover:bg-stone-800/60 hover:border-stone-700 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                            isEpisode
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : isAct
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {unitLabel} {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-500 font-mono">
                            {ch.wordCount || 0} words
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectChapter(idx);
                              onPlayChapter(idx);
                              setActiveTab('tts');
                            }}
                            className="p-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-400 transition-colors"
                            title="Listen to this section"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-medium line-clamp-2 leading-relaxed">
                        {ch.cleanTitle}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Prev / Next Footer */}
            <div className="p-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-2">
              <button
                onClick={() => onSelectChapter(Math.max(0, currentChapterIndex - 1))}
                disabled={currentChapterIndex === 0}
                className="flex-1 py-1.5 px-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Section</span>
              </button>
              <button
                onClick={() => onSelectChapter(Math.min(chapters.length - 1, currentChapterIndex + 1))}
                disabled={currentChapterIndex >= chapters.length - 1}
                className="flex-1 py-1.5 px-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Next Section</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Voice Models (TTS Reader) */}
        {activeTab === 'tts' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Active Section Info Card */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold">
                Active Section ({currentChapterIndex + 1} of {chapters.length})
              </span>
              <div className="text-sm font-serif font-bold text-stone-100 line-clamp-1">
                {currentChapter?.cleanTitle || 'Select a section'}
              </div>
              <div className="text-[11px] text-stone-400">
                {currentChapter?.wordCount || 0} words • Est. {Math.ceil((currentChapter?.wordCount || 0) / 140)} min listen
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              {!isSpeaking || isPaused ? (
                <button
                  onClick={() => onPlayChapter(currentChapterIndex)}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isPaused ? 'Resume Voice' : 'Listen Section'}</span>
                </button>
              ) : (
                <button
                  onClick={onTogglePause}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Voice</span>
                </button>
              )}

              <button
                onClick={onStop}
                disabled={!isSpeaking && !isPaused}
                className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-stone-700 transition-colors"
                title="Stop Speech"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            {/* Engine Selection: Puter Cloud AI vs Browser Native */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                <span>Voice Engine</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Free & Unlimited
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-lg border border-stone-800">
                <button
                  onClick={() => onChangeTtsEngineMode('puter')}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    ttsEngineMode === 'puter'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                >
                  <CloudLightning className="w-3.5 h-3.5" />
                  <span>Puter AI Cloud</span>
                </button>
                <button
                  onClick={() => onChangeTtsEngineMode('browser')}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    ttsEngineMode === 'browser'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Browser Native</span>
                </button>
              </div>
            </div>

            {/* Voice Model Selector: Puter AI Mode */}
            {ttsEngineMode === 'puter' && (
              <div className="space-y-2 bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Puter AI Speech Model</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                    {activePuterVoice.badge}
                  </span>
                </div>

                <select
                  value={selectedPuterVoiceId}
                  onChange={(e) => onSelectPuterVoiceId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <optgroup label="🔮 Google Gemini AI Voices (Natural & Expressive)">
                    {categorizedPuterVoices.gemini.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ xAI Grok TTS Models">
                    {categorizedPuterVoices.xAI.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🎧 Speechify Simba Models (Audiobook Premier)">
                    {categorizedPuterVoices.speechify.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🌟 OpenAI Studio Models">
                    {categorizedPuterVoices.openAI.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📖 AWS Polly Neural & Long-form Audio">
                    {categorizedPuterVoices.polly.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🎭 ElevenLabs Expressive Models">
                    {categorizedPuterVoices.elevenLabs.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.lang}) - {v.badge}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-[11px] text-stone-300 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-400">{activePuterVoice.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{activePuterVoice.provider.toUpperCase()}</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">{activePuterVoice.description}</p>
                </div>

                {/* Free Puter Account / Login Helper */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-stone-400">
                  <span>Free unlimited TTS</span>
                  <button
                    onClick={async () => {
                      try {
                        await signInToPuter();
                      } catch (e) {
                        console.warn('Puter sign in:', e);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>{isPuterSignedIn() ? 'Puter Connected' : 'Connect Puter (Free)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Voice Model Selector: Browser Native Mode */}
            {ttsEngineMode === 'browser' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Browser Speech Voice</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {voices.length} detected
                  </span>
                </label>

                <select
                  value={selectedVoiceIndex}
                  onChange={(e) => onSelectVoice(parseInt(e.target.value, 10))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {categorizedVoices.neuralHD.length > 0 && (
                    <optgroup label="⭐ Neural & Studio High-Definition Models">
                      {categorizedVoices.neuralHD.map(({ voice, index }) => (
                        <option key={index} value={index}>
                          ⭐ [Neural HD] {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {categorizedVoices.naturalStudio.length > 0 && (
                    <optgroup label="🎭 Natural English Literary Voices">
                      {categorizedVoices.naturalStudio.map(({ voice, index }) => (
                        <option key={index} value={index}>
                          🎭 [Natural] {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {categorizedVoices.standard.length > 0 && (
                    <optgroup label="🎙️ Standard Voices">
                      {categorizedVoices.standard.map(({ voice, index }) => (
                        <option key={index} value={index}>
                          🎙️ {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* Speed / Rate Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reading Speed</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">{rate.toFixed(2)}x</span>
              </div>

              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={rate}
                onChange={(e) => onChangeRate(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex gap-1.5">
                {[0.8, 1.0, 1.25, 1.5, 2.0].map((r) => (
                  <button
                    key={r}
                    onClick={() => onChangeRate(r)}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold border transition-all ${
                      rate === r
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch Slider (Browser native only) */}
            {ttsEngineMode === 'browser' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                  <span>Voice Warmth / Pitch</span>
                  <span className="font-mono text-stone-400">{pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => onChangePitch(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {/* Auto Advance Toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300 cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => onChangeAutoAdvance(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span>Auto-advance to next episode / chapter when finished</span>
            </label>

            {/* Status Card */}
            <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-400 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-stone-600'
                }`}
              />
              <span className="truncate">
                {isSpeaking
                  ? `Speaking paragraph ${(activeParaIndex ?? 0) + 1} (${ttsEngineMode === 'puter' ? activePuterVoice.name : 'Browser'})...`
                  : isPaused
                  ? 'Voice playback paused'
                  : ttsEngineMode === 'puter'
                  ? `Ready (${activePuterVoice.badge})`
                  : 'Browser synthesizer ready'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
