import { useState } from 'react';
import { ChapterItem, FormatOptions } from '../types';
import { ListOrdered, Copy, Check, Eye, Edit3, ArrowRight, BookOpen, Layers } from 'lucide-react';

interface TableOfContentsViewProps {
  chapters: ChapterItem[];
  options: FormatOptions;
  onChangeOptions: (updated: FormatOptions) => void;
  onSelectChapter: (chapterId: string) => void;
  onUpdateChapterTitle: (chapterId: string, newTitle: string) => void;
  onInsertTocIntoDocument: () => void;
}

export function TableOfContentsView({
  chapters,
  options,
  onChangeOptions,
  onSelectChapter,
  onUpdateChapterTitle,
  onInsertTocIntoDocument,
}: TableOfContentsViewProps) {
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [insertedNotice, setInsertedNotice] = useState(false);

  const startEdit = (ch: ChapterItem) => {
    setEditingId(ch.id);
    setEditTitleValue(ch.cleanTitle);
  };

  const saveEdit = (chId: string) => {
    if (editTitleValue.trim()) {
      onUpdateChapterTitle(chId, editTitleValue.trim());
    }
    setEditingId(null);
  };

  const generateTocText = (type: 'markdown' | 'plain'): string => {
    return chapters
      .map((ch, idx) => {
        const indent = ch.level === 1 ? '' : ch.level === 2 ? '   ' : '      ';
        if (type === 'markdown') {
          return `${indent}- [${ch.cleanTitle}](#${ch.id}) *(p. ${ch.pageEstimate})*`;
        } else {
          const dots = '.'.repeat(Math.max(4, 50 - ch.cleanTitle.length - (ch.level * 4)));
          return `${indent}${ch.cleanTitle} ${dots} p. ${ch.pageEstimate}`;
        }
      })
      .join('\n');
  };

  const copyToClipboard = (type: 'markdown' | 'plain') => {
    const text = generateTocText(type);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInsert = () => {
    onInsertTocIntoDocument();
    setInsertedNotice(true);
    setTimeout(() => setInsertedNotice(false), 3000);
  };

  // Cumulative page computation
  let runningPage = 1;
  const chapterPageMap = new Map<string, number>();
  chapters.forEach((ch) => {
    chapterPageMap.set(ch.id, runningPage);
    runningPage += ch.pageEstimate;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header card */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Generated Table of Contents
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {chapters.length} structural elements detected & formatted automatically
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => copyToClipboard('markdown')}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy TOC Markdown</span>
            </button>

            <button
              onClick={handleInsert}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {insertedNotice ? <Check className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              <span>{insertedNotice ? 'Inserted in Text!' : 'Insert in Manuscript'}</span>
            </button>
          </div>
        </div>

        {/* TOC Format Selector */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-stone-400 font-medium">Layout Style:</span>
          <div className="flex items-center gap-2">
            {[
              { id: 'classic-dots', label: 'Classic Dots (..........)' },
              { id: 'modern-clean', label: 'Modern Minimal' },
              { id: 'academic-numbered', label: 'Academic Numbered' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => onChangeOptions({ ...options, tocStyle: st.id as any })}
                className={`px-2.5 py-1 rounded-md border transition-all ${
                  options.tocStyle === st.id
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                    : 'border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Chapter List */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm">
        <div className="space-y-2">
          {chapters.map((ch, index) => {
            const pageNum = chapterPageMap.get(ch.id) || 1;
            const isEditing = editingId === ch.id;

            return (
              <div
                key={ch.id}
                className={`group p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                  ch.level === 1
                    ? 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                    : ch.level === 2
                    ? 'bg-stone-950/30 border-stone-800/60 ml-5 hover:border-stone-700'
                    : 'bg-stone-950/10 border-stone-800/40 ml-10 hover:border-stone-700'
                }`}
              >
                {/* Left Hierarchy indicator & Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${
                      ch.level === 1
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    {ch.level === 1 ? 'Chapter' : 'Section'}
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(ch.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-stone-900 border border-amber-500 rounded px-2 py-1 text-sm text-stone-100"
                      />
                      <button
                        onClick={() => saveEdit(ch.id)}
                        className="px-2 py-1 bg-amber-500 text-stone-950 text-xs font-semibold rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className={`truncate text-sm ${
                          ch.level === 1 ? 'font-serif font-semibold text-stone-100' : 'text-stone-300'
                        }`}
                      >
                        {options.tocStyle === 'academic-numbered'
                          ? `${index + 1}.0 ${ch.cleanTitle}`
                          : ch.cleanTitle}
                      </span>
                      <button
                        onClick={() => startEdit(ch)}
                        title="Edit title"
                        className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-stone-300 p-1 transition-opacity"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Leader and Stats */}
                <div className="flex items-center gap-4 shrink-0 text-xs text-stone-400">
                  {options.tocStyle === 'classic-dots' && (
                    <span className="hidden md:inline font-mono tracking-widest text-stone-700 select-none">
                      ....................
                    </span>
                  )}

                  <span className="font-mono text-stone-400 text-xs">
                    {ch.wordCount.toLocaleString()} words
                  </span>

                  <span className="font-serif text-amber-400 font-semibold px-2 py-0.5 rounded bg-stone-800/80 border border-stone-700/60 min-w-12 text-center">
                    p. {pageNum}
                  </span>

                  <button
                    onClick={() => onSelectChapter(ch.id)}
                    title="View chapter in book preview"
                    className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
