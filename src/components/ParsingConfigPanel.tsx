import { useState } from 'react';
import { ParsingConfig, ChapterItem, DEFAULT_PARSING_CONFIG } from '../types';
import {
  Settings2,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  X,
  Sparkles,
  Tv,
  BookOpen,
  Film,
  Calendar,
  Hash,
  Sliders,
  Type,
} from 'lucide-react';

interface ParsingConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: ParsingConfig;
  onChangeConfig: (newConfig: ParsingConfig) => void;
  chapterCount: number;
  sampleMatches: ChapterItem[];
}

export function ParsingConfigPanel({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  chapterCount,
  sampleMatches,
}: ParsingConfigPanelProps) {
  if (!isOpen) return null;

  const handleApplyPreset = (presetName: string) => {
    switch (presetName) {
      case 'all':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: true,
          detectEpisodesAndSerials: true,
          detectPlaysAndScenes: true,
          detectVolumesAndBooks: true,
          detectJournalsAndLogs: true,
          detectNumberedTitles: true,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'episodes':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: true,
          detectEpisodesAndSerials: true,
          detectPlaysAndScenes: false,
          detectVolumesAndBooks: true,
          detectJournalsAndLogs: false,
          detectNumberedTitles: true,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'novels':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: true,
          detectEpisodesAndSerials: false,
          detectPlaysAndScenes: false,
          detectVolumesAndBooks: true,
          detectJournalsAndLogs: false,
          detectNumberedTitles: true,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'plays':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: true,
          detectEpisodesAndSerials: false,
          detectPlaysAndScenes: true,
          detectVolumesAndBooks: false,
          detectJournalsAndLogs: false,
          detectNumberedTitles: false,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'journals':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: false,
          detectEpisodesAndSerials: false,
          detectPlaysAndScenes: false,
          detectVolumesAndBooks: false,
          detectJournalsAndLogs: true,
          detectNumberedTitles: true,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'numeric':
        onChangeConfig({
          ...config,
          detectBoldMarkdown: true,
          detectStandardChapters: true,
          detectEpisodesAndSerials: false,
          detectPlaysAndScenes: false,
          detectVolumesAndBooks: false,
          detectJournalsAndLogs: false,
          detectNumberedTitles: true,
          detectHeadings: true,
          detectAllCapLines: true,
        });
        break;
      case 'reset':
        onChangeConfig(DEFAULT_PARSING_CONFIG);
        break;
      default:
        break;
    }
  };

  const getChapterBadge = (cleanTitle: string, level: number) => {
    const lower = cleanTitle.toLowerCase();
    if (lower.startsWith('episode') || lower.startsWith('ep.')) {
      return { text: 'EPISODE', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
    if (lower.startsWith('act')) {
      return { text: 'ACT', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    if (lower.startsWith('scene')) {
      return { text: 'SCENE', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
    }
    if (lower.startsWith('volume') || lower.startsWith('vol.')) {
      return { text: 'VOLUME', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (lower.startsWith('day') || lower.startsWith('night') || lower.startsWith('log') || lower.startsWith('entry')) {
      return { text: 'JOURNAL', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (lower.startsWith('section') || lower.startsWith('subsection')) {
      return { text: 'SECTION', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (lower.startsWith('prologue') || lower.startsWith('epilogue') || lower.startsWith('preface')) {
      return { text: 'STRUCTURAL', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    return {
      text: level === 1 ? 'CHAPTER' : 'SUBSECTION',
      color: level === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-stone-800 text-stone-300 border-stone-700',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
                Chapter & Section Delimiter Engine
              </h2>
              <p className="text-xs text-stone-400">
                Configure recognition patterns for chapters, serialized episodes, plays, acts, and journals
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

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status summary banner */}
          <div className="p-4 bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-950 border border-amber-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Live Manuscript Analysis
                </p>
              </div>
              <p className="text-sm text-stone-200 mt-1">
                Detected <span className="font-bold text-amber-400 font-mono text-base">{chapterCount}</span> structural sections in manuscript
              </p>
            </div>
            <button
              onClick={() => handleApplyPreset('reset')}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs transition-colors border border-stone-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          {/* Quick Delimiter Presets */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Delimiter Presets
              </h3>
              <span className="text-[11px] text-stone-500">1-click configuration</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('episodes')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-indigo-500/50 rounded-lg transition-all group"
              >
                <Tv className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">Web Serials & Episodes</div>
                  <div className="text-[10px] text-stone-400">Episode 1, Epsoide 1, Arc</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('novels')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/50 rounded-lg transition-all group"
              >
                <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">Novels & Books</div>
                  <div className="text-[10px] text-stone-400">Chapter, Book, Part, Vol.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('plays')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-purple-500/50 rounded-lg transition-all group"
              >
                <Film className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">Plays & Scripts</div>
                  <div className="text-[10px] text-stone-400">Act I, Scene 2, Canto</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('journals')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-cyan-500/50 rounded-lg transition-all group"
              >
                <Calendar className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">Journals & Epistolary</div>
                  <div className="text-[10px] text-stone-400">Day 1, Log, Letter, Entry</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('numeric')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-emerald-500/50 rounded-lg transition-all group"
              >
                <Hash className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">Numeric & Roman</div>
                  <div className="text-[10px] text-stone-400">1. Title, 01 -, I., IV.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="flex items-center gap-2 p-2.5 text-left bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-400/50 rounded-lg transition-all group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-semibold text-stone-200">All Delimiters Active</div>
                  <div className="text-[10px] text-stone-400">Maximum coverage</div>
                </div>
              </button>
            </div>
          </div>

          {/* Delimiter Switches */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Active Delimiter Engines
            </h3>

            {/* 1. Episodes & Serials */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectEpisodesAndSerials}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectEpisodesAndSerials: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Tv className="w-4 h-4 text-indigo-400" />
                    Episodes & Serialized Fiction (e.g. Episode 1, Epsoide 1)
                  </span>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-950/50 border border-indigo-800/60 px-2 py-0.5 rounded">
                    Episode 1 • Epsoide 1 • Ep. 1 • Arc 1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Matches serialized titles like <code className="text-stone-300 font-mono">Episode 1</code>, <code className="text-stone-300 font-mono">Epsoide 1 Bess</code> (handles common typos automatically), <code className="text-stone-300 font-mono">Ep. 1: Pilot</code>, <code className="text-stone-300 font-mono">Installment 2</code>, <code className="text-stone-300 font-mono">Arc 1</code>, <code className="text-stone-300 font-mono">Saga I</code>.
                </p>
              </div>
            </label>

            {/* 2. Standard Chapter Phrases */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectStandardChapters}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectStandardChapters: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Standard Book Chapters & Subsections
                  </span>
                  <span className="text-xs font-mono text-stone-300 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                    Chapter 2 Bess • Part 1 • Section 1.1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Matches phrases like <code className="text-stone-300 font-mono">Chapter 2 Bess</code>, <code className="text-stone-300 font-mono">Chapter IV - The Return</code>, <code className="text-stone-300 font-mono">Chapter One</code>, <code className="text-stone-300 font-mono">Part 1: Origins</code>, <code className="text-stone-300 font-mono">Section 1.1</code>.
                </p>
              </div>
            </label>

            {/* 3. Plays, Acts & Scenes */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectPlaysAndScenes}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectPlaysAndScenes: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Film className="w-4 h-4 text-purple-400" />
                    Plays, Acts & Dramatic Scenes
                  </span>
                  <span className="text-xs font-mono text-purple-300 bg-purple-950/50 border border-purple-800/60 px-2 py-0.5 rounded">
                    Act 1 • Scene 2 • Act I, Scene 2
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Detects script delimiters like <code className="text-stone-300 font-mono">Act 1</code>, <code className="text-stone-300 font-mono">Scene 2: The Courtyard</code>, <code className="text-stone-300 font-mono">Canto IV</code>. Scenes automatically indent as Subsections.
                </p>
              </div>
            </label>

            {/* 4. Volumes & Books */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectVolumesAndBooks}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectVolumesAndBooks: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Volumes, Tomes & Multi-Book Series
                  </span>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded">
                    Volume 1 • Vol. 2 • Book One • Tome 1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Detects multi-volume manuscripts and book collections like <code className="text-stone-300 font-mono">Volume 1: The Gathering</code> or <code className="text-stone-300 font-mono">Vol. II</code>.
                </p>
              </div>
            </label>

            {/* 5. Journals & Logs */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectJournalsAndLogs}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectJournalsAndLogs: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Journals, Days, Letters & Logs
                  </span>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded">
                    Day 1 • Night 3 • Entry 1 • Letter 1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Perfect for epistolary novels, daily logs, and survival fiction: <code className="text-stone-300 font-mono">Day 1: Arrival</code>, <code className="text-stone-300 font-mono">Entry 12</code>, <code className="text-stone-300 font-mono">Letter 1</code>.
                </p>
              </div>
            </label>

            {/* 6. Numbered & Roman Delimiters */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectNumberedTitles}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectNumberedTitles: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    Numbered Titles & Roman Numerals
                  </span>
                  <span className="text-xs font-mono text-stone-300 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                    1. The Beginning • 01 - Intro • I. Awakening
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Recognizes numbered section headings like <code className="text-stone-300 font-mono">1. The Beginning</code>, <code className="text-stone-300 font-mono">01 - Introduction</code>, and standalone Roman numerals <code className="text-stone-300 font-mono">I.</code>, <code className="text-stone-300 font-mono">II.</code>
                </p>
              </div>
            </label>

            {/* 7. Bold Text Delimiters */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectBoldMarkdown}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectBoldMarkdown: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-400" />
                    Bold Text Standalone Lines (Markdown & HTML)
                  </span>
                  <span className="text-xs font-mono text-amber-400/90 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                    ** Chapter 2 Bess** • **Episode 1**
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Matches bold standalone lines like <code className="text-stone-300 font-mono">** Chapter 2 Bess**</code>, <code className="text-stone-300 font-mono">**Episode 1**</code>, or <code className="text-stone-300 font-mono">&lt;b&gt;Chapter 3&lt;/b&gt;</code>.
                </p>
              </div>
            </label>

            {/* 8. Markdown & HTML Headings */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectHeadings}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectHeadings: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100">
                    Markdown & Document Headings
                  </span>
                  <span className="text-xs font-mono text-stone-300 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                    # H1 • ## H2 • &lt;h1&gt; • &lt;h2&gt;
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Matches Markdown heading hashes <code className="text-stone-300 font-mono">#</code>, <code className="text-stone-300 font-mono">##</code>, <code className="text-stone-300 font-mono">###</code> and HTML heading tags converted from Word documents.
                </p>
              </div>
            </label>

            {/* 9. Classical All-Caps */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.detectAllCapLines}
                onChange={(e) =>
                  onChangeConfig({ ...config, detectAllCapLines: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-semibold text-stone-100">
                    Classical All-Caps Delimiters & Front/Back Matter
                  </span>
                  <span className="text-xs font-mono text-stone-300 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                    PROLOGUE • EPILOGUE • CHAPTER I • EPISODE 1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Detects classical standalone headings: <code className="text-stone-300 font-mono">PROLOGUE</code>, <code className="text-stone-300 font-mono">EPILOGUE</code>, <code className="text-stone-300 font-mono">PREFACE</code>, <code className="text-stone-300 font-mono">CONCLUSION</code>, <code className="text-stone-300 font-mono">CHAPTER 1</code>, <code className="text-stone-300 font-mono">EPISODE 1</code>.
                </p>
              </div>
            </label>

            {/* 10. Clean Redundant Leading Numbering */}
            <label className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
              <input
                type="checkbox"
                checked={config.stripLeadingNumbers}
                onChange={(e) =>
                  onChangeConfig({ ...config, stripLeadingNumbers: e.target.checked })
                }
                className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-stone-100">
                  Clean Redundant Leading Numbers in Subtitles
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  When enabled, removes duplicate numbering from subtitles (e.g. <code className="text-stone-300 font-mono">Chapter 1: 1. The Awakening</code> becomes <code className="text-stone-300 font-mono">Chapter 1: The Awakening</code>).
                </p>
              </div>
            </label>

            {/* 11. Custom Regex Pattern */}
            <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.detectCustomRegex}
                  onChange={(e) =>
                    onChangeConfig({ ...config, detectCustomRegex: e.target.checked })
                  }
                  className="rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900"
                />
                <span className="text-sm font-semibold text-stone-100">
                  Custom Regular Expression Pattern
                </span>
              </label>

              {config.detectCustomRegex && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-500">/</span>
                    <input
                      type="text"
                      value={config.customRegexPattern}
                      onChange={(e) =>
                        onChangeConfig({ ...config, customRegexPattern: e.target.value })
                      }
                      placeholder="e.g. ^(Episode|Epsoide|Arc|Act)\s+[0-9]+"
                      className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-mono text-stone-500">/i</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-stone-400">Quick inserts:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          customRegexPattern: '^(Episode|Epsoide|Ep\\.?)\\s+[0-9]+',
                        })
                      }
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 rounded border border-stone-700"
                    >
                      Episodes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          customRegexPattern: '^(Act|Scene)\\s+[0-9IVX]+',
                        })
                      }
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 rounded border border-stone-700"
                    >
                      Acts & Scenes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          customRegexPattern: '^(Day|Night|Log)\\s+[0-9]+',
                        })
                      }
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 rounded border border-stone-700"
                    >
                      Days & Logs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Detected Chapters Preview */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Current Detected Sections Preview ({sampleMatches.length})
              </h4>
              <span className="text-[11px] text-stone-500">Real-time parsed output</span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
              {sampleMatches.length === 0 ? (
                <div className="p-4 text-center text-stone-500 italic">
                  No chapters or sections detected yet. Check your document or activate delimiter rules above.
                </div>
              ) : (
                sampleMatches.map((ch) => {
                  const badge = getChapterBadge(ch.cleanTitle, ch.level);
                  return (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/80 hover:border-stone-700 text-stone-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}
                        >
                          {badge.text}
                        </span>
                        <span className="truncate font-sans font-medium text-stone-200">
                          {ch.cleanTitle}
                        </span>
                      </div>
                      <span className="text-stone-500 text-[11px] shrink-0 font-mono">
                        {ch.wordCount.toLocaleString()} words
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Changes apply instantaneously to your Table of Contents and reader view.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
