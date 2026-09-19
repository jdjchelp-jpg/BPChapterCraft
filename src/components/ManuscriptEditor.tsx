import { useState } from 'react';
import { formatDocumentText } from '../utils/parser';
import { FormatOptions, ChapterItem } from '../types';
import { SAMPLE_MANUSCRIPT, SAMPLE_SERIAL_MANUSCRIPT } from '../data/sampleDocument';
import { Wand2, PlusCircle, Check, Copy, FileText, BookOpen, Tv, Film, Calendar, Sparkles } from 'lucide-react';

interface ManuscriptEditorProps {
  rawText: string;
  onChangeText: (newText: string) => void;
  options: FormatOptions;
  chapters: ChapterItem[];
  onSelectChapter: (id: string) => void;
}

export function ManuscriptEditor({
  rawText,
  onChangeText,
  options,
  chapters,
  onSelectChapter,
}: ManuscriptEditorProps) {
  const [beautifiedMessage, setBeautifiedMessage] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleApplyFormatting = () => {
    const formatted = formatDocumentText(rawText, {
      curlyQuotes: options.curlyQuotes,
      emDashes: options.emDashes,
      ellipses: options.ellipses,
      cleanDoubleSpacing: options.cleanDoubleSpacing,
      sceneBreakOrnament: options.sceneBreakOrnament,
    });
    onChangeText(formatted);
    setBeautifiedMessage(true);
    setTimeout(() => setBeautifiedMessage(false), 2500);
  };

  const handleInsertUnitMark = (type: 'chapter' | 'episode' | 'act' | 'day') => {
    const count = chapters.length + 1;
    let insertion = '';
    switch (type) {
      case 'episode':
        insertion = `\n\nEpisode ${count}: New Episode Title\n\n`;
        break;
      case 'act':
        insertion = `\n\nAct ${count}, Scene 1: The Courtyard\n\n`;
        break;
      case 'day':
        insertion = `\n\nDay ${count}: Expedition Log\n\n`;
        break;
      case 'chapter':
      default:
        insertion = `\n\n** Chapter ${count} **\n\n`;
        break;
    }
    onChangeText(rawText + insertion);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = rawText.split('\n').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Action and stats bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3 text-stone-400">
          <span className="flex items-center gap-1.5 font-medium text-stone-200">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Manuscript Source</span>
          </span>
          <span>•</span>
          <span className="font-mono">{wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span className="font-mono">{lineCount.toLocaleString()} lines</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">{chapters.length} sections detected</span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Insert Delimiters */}
          <div className="flex items-center bg-stone-950 border border-stone-800 rounded-lg p-0.5">
            <button
              onClick={() => handleInsertUnitMark('chapter')}
              className="px-2.5 py-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Insert Chapter delimiter"
            >
              <PlusCircle className="w-3 h-3 text-amber-400" />
              <span>+ Chapter</span>
            </button>
            <button
              onClick={() => handleInsertUnitMark('episode')}
              className="px-2.5 py-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Insert Episode delimiter (e.g. Episode 1)"
            >
              <Tv className="w-3 h-3 text-indigo-400" />
              <span>+ Episode</span>
            </button>
            <button
              onClick={() => handleInsertUnitMark('act')}
              className="px-2.5 py-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors hidden sm:flex"
              title="Insert Act & Scene delimiter"
            >
              <Film className="w-3 h-3 text-purple-400" />
              <span>+ Act</span>
            </button>
            <button
              onClick={() => handleInsertUnitMark('day')}
              className="px-2.5 py-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded text-[11px] font-medium flex items-center gap-1 transition-colors hidden sm:flex"
              title="Insert Day/Log delimiter"
            >
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>+ Day</span>
            </button>
          </div>

          {/* Sample Swapper */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangeText(SAMPLE_MANUSCRIPT)}
              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs font-medium transition-colors"
              title="Load standard novel sample with Chapter 1, Chapter 2 Bess, etc."
            >
              Novel Sample
            </button>
            <button
              onClick={() => onChangeText(SAMPLE_SERIAL_MANUSCRIPT)}
              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-indigo-300 border border-stone-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              title="Load serialized sci-fi sample with Episode 1, Epsoide 2, Ep. 3, Arc 1"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Serial / Episode Sample</span>
            </button>
          </div>

          <button
            onClick={handleApplyFormatting}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Convert straight quotes to curly, dashes to em-dashes, normalize spacing"
          >
            {beautifiedMessage ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{beautifiedMessage ? 'Formatted Quotes & Dashes!' : 'Format Typography'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copiedMessage ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Chapters Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chapters quick list */}
        <div className="lg:col-span-1 bg-stone-900 border border-stone-800 rounded-xl p-4 max-h-[650px] overflow-y-auto space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Detected Outlines</span>
          </p>

          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => onSelectChapter(ch.id)}
              className="w-full text-left p-2.5 rounded-lg bg-stone-950/60 hover:bg-stone-800 border border-stone-800/80 transition-colors flex flex-col gap-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-amber-400">
                  {ch.level === 1 ? `Ch. ${idx + 1}` : 'Section'}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {ch.wordCount}w
                </span>
              </div>
              <span className="text-xs text-stone-200 truncate group-hover:text-amber-300 font-medium">
                {ch.cleanTitle}
              </span>
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="lg:col-span-3 bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm flex flex-col">
          <textarea
            value={rawText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Type or paste your book content here..."
            rows={26}
            className="w-full h-full min-h-[580px] bg-stone-950 border border-stone-800 rounded-lg p-4 text-sm font-serif leading-relaxed text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 resize-y"
          />
          <div className="mt-2 text-right">
            <span className="text-[11px] text-stone-500">
              Auto-parsing is active: changes immediately reflect in the Book View and Table of Contents
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
