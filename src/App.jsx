import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Diff,
  ArrowRightLeft,
  Plus,
  Minus,
  Search,
  Code,
  Copy,
  Upload,
  RefreshCw,
  FolderOpen,
  Layout,
  Columns,
  Eye,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical,
  Navigation
} from 'lucide-react';

// --- CONFIG & CONSTANTS ---

const DEFAULT_IGNORE = [
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'pdf', 'zip', 'tar', 'gz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'woff', 'woff2', 'ttf', 'eot',
  'node_modules', '.git', '.DS_Store', 'dist', 'build', '__pycache__', '.next'
];

const CONTEXT_LINES = 3;

// --- UTILS ---

const getFileSlug = (path) => {
  const segments = path.split('/');
  const filename = segments[segments.length - 1];
  return filename
    .toLowerCase()
    .replace(/[._-]v?\d+(\.\d+)*/g, '')
    .replace(/[._-](legacy|modern|old|new|final|latest)/g, '')
    .replace(/\.[^/.]+$/, "")
    .trim();
};

/**
 * Enhanced Word-level diffing. 
 * Correctly identifies which words are added vs removed in a pair.
 */
const getWordDiff = (oldStr, newStr) => {
  // Split by words, keeping punctuation and whitespace as separate tokens
  const tokenize = (s) => s.split(/(\W+)/).filter(Boolean);
  const oldWords = tokenize(oldStr);
  const newWords = tokenize(newStr);

  const result = [];
  let i = 0, j = 0;

  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      result.push({ value: oldWords[i], type: 'equal' });
      i++; j++;
    } else if (j < newWords.length && (i >= oldWords.length || !oldWords.slice(i, i + 8).includes(newWords[j]))) {
      result.push({ value: newWords[j], type: 'added' });
      j++;
    } else {
      result.push({ value: oldWords[i], type: 'removed' });
      i++;
    }
  }
  return result;
};

const calculateDiff = (oldText, newText) => {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const diff = [];

  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: 'unchanged', oldLine: i + 1, newLine: j + 1, content: oldLines[i] });
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i, i + 15).includes(newLines[j]))) {
      diff.push({ type: 'added', oldLine: null, newLine: j + 1, content: newLines[j] });
      j++;
    } else {
      diff.push({ type: 'removed', oldLine: i + 1, newLine: null, content: oldLines[i] });
      i++;
    }
  }

  // Second pass: Identify "Intra-line" pairs
  for (let k = 0; k < diff.length - 1; k++) {
    if (diff[k].type === 'removed' && diff[k + 1].type === 'added') {
      diff[k].pairedWith = diff[k + 1];
      diff[k + 1].pairedWith = diff[k];
    }
  }

  return diff;
};

const chunkifyDiff = (diff) => {
  if (diff.length === 0) return [];
  const chunks = [];
  let currentChunk = { type: diff[0].type, lines: [diff[0]] };

  for (let i = 1; i < diff.length; i++) {
    if (diff[i].type === currentChunk.type || (diff[i].type !== 'unchanged' && currentChunk.type !== 'unchanged')) {
      currentChunk.lines.push(diff[i]);
    } else {
      chunks.push(currentChunk);
      currentChunk = { type: diff[i].type, lines: [diff[i]] };
    }
  }
  chunks.push(currentChunk);
  return chunks;
};

// --- COMPONENTS ---

/**
 * Mini-map showing changes throughout the file
 */
const DiffMiniMap = ({ diff, onJump }) => {
  if (!diff.length) return null;

  return (
    <div className="w-4 h-full bg-slate-900/50 border-l border-white/5 flex flex-col shrink-0 select-none cursor-pointer group relative">
      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/5 pointer-events-none" />
      {diff.map((line, idx) => {
        let color = 'transparent';
        if (line.type === 'added') color = '#10b981'; // emerald-500
        if (line.type === 'removed') color = '#f43f5e'; // rose-500

        return (
          <div
            key={idx}
            onClick={() => onJump(idx)}
            className="w-full flex-1 min-h-[1px]"
            style={{ backgroundColor: color }}
            title={`Line ${line.oldLine || line.newLine}`}
          />
        );
      })}
    </div>
  );
};

const DiffLine = ({ line }) => {
  const typeStyles = {
    added: 'bg-emerald-500/10 text-emerald-300 border-l-4 border-emerald-500',
    removed: 'bg-rose-500/10 text-rose-300 border-l-4 border-rose-500',
    unchanged: 'text-slate-400 border-l-4 border-transparent'
  };

  const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

  const renderContent = () => {
    if (!line.pairedWith) return line.content;

    // Use paired line to calculate exact token changes
    const oldStr = line.type === 'removed' ? line.content : line.pairedWith.content;
    const newStr = line.type === 'added' ? line.content : line.pairedWith.content;
    const wordDiffs = getWordDiff(oldStr, newStr);

    return wordDiffs.map((segment, idx) => {
      if (segment.type === 'equal') return <span key={idx}>{segment.value}</span>;

      // Only highlight if the segment type matches the current line type
      if (segment.type === line.type) {
        return (
          <span
            key={idx}
            className={line.type === 'added' ? 'bg-emerald-500 text-white px-0.5 rounded-sm font-bold shadow-sm' : 'bg-rose-500 text-white px-0.5 rounded-sm font-bold shadow-sm'}
          >
            {segment.value}
          </span>
        );
      }
      return null;
    });
  };

  return (
    <div className={`flex font-mono text-[13px] leading-6 group transition-colors duration-75 ${typeStyles[line.type]} hover:bg-white/5`}>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40 shrink-0">{line.oldLine || ''}</div>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40 border-r border-white/5 shrink-0">{line.newLine || ''}</div>
      <div className="px-4 whitespace-pre flex-1 min-w-0 overflow-hidden">
        <span className="mr-3 opacity-30 select-none w-4 inline-block">{prefix}</span>
        {renderContent()}
      </div>
    </div>
  );
};

const ChunkBlock = ({ chunk }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUnchanged = chunk.type === 'unchanged';
  const shouldFold = isUnchanged && chunk.lines.length > (CONTEXT_LINES * 2 + 2);

  if (!shouldFold || isExpanded) {
    return chunk.lines.map((line, idx) => <DiffLine key={idx} line={line} />);
  }

  const startLines = chunk.lines.slice(0, CONTEXT_LINES);
  const endLines = chunk.lines.slice(-CONTEXT_LINES);
  const foldedCount = chunk.lines.length - (CONTEXT_LINES * 2);

  return (
    <>
      {startLines.map((line, idx) => <DiffLine key={`start-${idx}`} line={line} />)}
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-3 py-2 bg-slate-800/30 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-all border-y border-white/5 group"
      >
        <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-blue-500/20" />
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900 border border-white/10 text-[11px] font-bold uppercase tracking-wider">
          <Maximize2 size={12} />
          Expand {foldedCount} Unchanged Lines
        </div>
        <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-blue-500/20" />
      </button>
      {endLines.map((line, idx) => <DiffLine key={`end-${idx}`} line={line} />)}
    </>
  );
};

const SettingsModal = ({ isOpen, onClose, ignoreList, setIgnoreList }) => {
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  const addTag = (e) => {
    e.preventDefault();
    if (newTag && !ignoreList.includes(newTag)) {
      setIgnoreList([...ignoreList, newTag.toLowerCase()]);
      setNewTag('');
    }
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-6">
      <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-500" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Workspace Policy</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Exclude Patterns</label>
          <form onSubmit={addTag} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="e.g. .env, build/, .tmp"
              className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all text-slate-200"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {ignoreList.map(tag => (
              <span key={tag} className="flex items-center gap-2 bg-slate-800 text-slate-300 px-2 py-1 rounded-md text-[10px] font-mono border border-white/5 group hover:border-rose-500/30 transition-colors">
                {tag}
                <button onClick={() => setIgnoreList(ignoreList.filter(t => t !== tag))} className="text-slate-500 hover:text-rose-400">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center">
          <button
            onClick={() => setIgnoreList(DEFAULT_IGNORE)}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ComparisonView = ({ pair, toggleSidebar, isSidebarCollapsed }) => {
  const scrollContainerRef = useRef(null);
  const diff = useMemo(() => calculateDiff(pair.v1?.content, pair.v2?.content), [pair]);
  const chunks = useMemo(() => chunkifyDiff(diff), [diff]);

  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'added').length,
    removed: diff.filter(d => d.type === 'removed').length,
  }), [diff]);

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = pair.v2?.content || pair.v1?.content || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jumpToLine = (index) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const totalLines = diff.length;
      const targetScroll = (index / totalLines) * container.scrollHeight;
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] overflow-hidden animate-in fade-in duration-300 relative">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/40 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg shadow-inner shrink-0">
                <FileText size={18} className="text-blue-400" />
              </div>
              <h2 className="text-slate-100 font-semibold tracking-tight truncate max-w-md">
                {pair.v2?.path || pair.v1?.path}
              </h2>
            </div>
            <div className="flex items-center gap-2 ml-11">
              <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter ${pair.type === 'modified' ? 'bg-blue-500/20 text-blue-400' :
                  pair.type === 'added' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                {pair.type}
              </span>
              <span className="text-slate-700 select-none">•</span>
              <code className="text-[10px] text-slate-500 font-mono">identity: {pair.slug}</code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-black/40 rounded-full px-3 py-1.5 border border-white/5 space-x-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[11px] font-bold text-emerald-400">+{stats.added}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              <span className="text-[11px] font-bold text-rose-400">-{stats.removed}</span>
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-white/10 shadow-lg transition-all active:scale-95"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="font-medium">{copied ? 'Copied!' : 'Copy Target'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-[#0d1117] custom-scrollbar selection:bg-blue-500/30">
          <div className="py-4">
            {chunks.map((chunk, idx) => (
              <ChunkBlock key={idx} chunk={chunk} />
            ))}
          </div>
        </div>
        {/* Toggable Mini-map on the far right */}
        <DiffMiniMap diff={diff} onJump={jumpToLine} />
      </div>
    </div>
  );
};

export default function App() {
  const [v1Files, setV1Files] = useState([]);
  const [v2Files, setV2Files] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ignoreList, setIgnoreList] = useState(DEFAULT_IGNORE);
  const [showSettings, setShowSettings] = useState(false);

  // Sidebar Resize & Collapse State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Resize Handler Logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const shouldIgnore = (path) => {
    const lowerPath = path.toLowerCase();
    return ignoreList.some(pattern => {
      const p = pattern.toLowerCase();
      return lowerPath.endsWith(p) || lowerPath.includes(`/${p}/`) || lowerPath.startsWith(`${p}/`);
    });
  };

  const handleDirectorySelect = async (e, setFiles) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsProcessing(true);
    const fileData = [];

    const batchSize = 20;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (file) => {
        const path = file.webkitRelativePath || file.name;
        if (shouldIgnore(path)) return null;

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve({
            path,
            content: event.target.result,
            size: file.size
          });
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        });
      }));
      fileData.push(...results.filter(Boolean));
    }

    setFiles(fileData);
    setIsProcessing(false);
  };

  const matchedPairs = useMemo(() => {
    if (v1Files.length === 0 && v2Files.length === 0) return [];

    const v1Map = new Map();
    const v2Map = new Map();

    v1Files.forEach(f => {
      const slug = getFileSlug(f.path);
      if (!v1Map.has(slug)) v1Map.set(slug, []);
      v1Map.get(slug).push(f);
    });

    v2Files.forEach(f => {
      const slug = getFileSlug(f.path);
      if (!v2Map.has(slug)) v2Map.set(slug, []);
      v2Map.get(slug).push(f);
    });

    const allSlugs = new Set([...v1Map.keys(), ...v2Map.keys()]);

    const pairs = Array.from(allSlugs).map(slug => {
      const v1Matches = v1Map.get(slug) || [];
      const v2Matches = v2Map.get(slug) || [];

      if (v1Matches.length > 0 && v2Matches.length > 0) {
        return { type: 'modified', slug, v1: v1Matches[0], v2: v2Matches[0] };
      } else if (v1Matches.length > 0) {
        return { type: 'deleted', slug, v1: v1Matches[0], v2: null };
      } else {
        return { type: 'added', slug, v1: null, v2: v2Matches[0] };
      }
    });

    return pairs.sort((a, b) => a.slug.localeCompare(b.slug));
  }, [v1Files, v2Files]);

  useEffect(() => {
    if (matchedPairs.length > 0 && !selectedPair) {
      setSelectedPair(matchedPairs[0]);
    }
  }, [matchedPairs, selectedPair]);

  const stats = {
    modified: matchedPairs.filter(p => p.type === 'modified').length,
    added: matchedPairs.filter(p => p.type === 'added').length,
    deleted: matchedPairs.filter(p => p.type === 'deleted').length,
  };

  return (
    <div className="flex h-screen bg-[#010409] text-slate-300 font-sans antialiased overflow-hidden relative">
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        ignoreList={ignoreList}
        setIgnoreList={setIgnoreList}
      />

      <aside
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        className={`border-r border-white/10 flex flex-col bg-[#0d1117] z-30 shadow-2xl shrink-0 transition-[width] duration-300 ease-in-out relative group/sidebar ${isSidebarCollapsed ? 'overflow-hidden' : ''}`}
      >
        <div className="p-5 border-b border-white/5 bg-slate-900/20 whitespace-nowrap min-w-[320px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Code size={18} className="text-white" />
              </div>
              <h1 className="text-xs font-black text-white tracking-widest uppercase">Version Lens</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-blue-400 transition-all active:scale-90"
                title="Workspace Policy"
              >
                <Settings size={15} />
              </button>
              {(v1Files.length > 0 || v2Files.length > 0) && (
                <button
                  onClick={() => { setV1Files([]); setV2Files([]); setSelectedPair(null); }}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-rose-400 transition-all active:scale-90"
                  title="Clear Workspace"
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-[#1c2128] transition-all group overflow-hidden">
              <FolderOpen size={16} className={v1Files.length ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400/70"} />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-tighter">Base Version</span>
                <span className="text-xs truncate font-bold text-slate-300">
                  {v1Files.length ? `${v1Files.length} files indexed` : "Select Base Folder"}
                </span>
              </div>
              <input type="file" webkitdirectory="true" className="hidden" onChange={(e) => handleDirectorySelect(e, setV1Files)} />
            </label>

            <label className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-[#1c2128] transition-all group overflow-hidden">
              <FolderOpen size={16} className={v2Files.length ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400/70"} />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-tighter">Target Version</span>
                <span className="text-xs truncate font-bold text-slate-300">
                  {v2Files.length ? `${v2Files.length} files indexed` : "Select New Folder"}
                </span>
              </div>
              <input type="file" webkitdirectory="true" className="hidden" onChange={(e) => handleDirectorySelect(e, setV2Files)} />
            </label>
          </div>
        </div>

        {matchedPairs.length > 0 ? (
          <div className="min-w-[320px] flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Jump to file..."
                  className="w-full bg-[#010409] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-500/10 shrink-0">
                  MOD: {stats.modified}
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-500/10 shrink-0">
                  ADD: {stats.added}
                </div>
                <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-black border border-rose-500/10 shrink-0">
                  DEL: {stats.deleted}
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-auto px-3 space-y-1 py-4 custom-scrollbar">
              {matchedPairs
                .filter(p => p.slug.includes(searchTerm.toLowerCase()) || (p.v2?.path || '').toLowerCase().includes(searchTerm.toLowerCase()))
                .map((pair, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPair(pair)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group relative border ${selectedPair === pair
                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 shadow-inner'
                        : 'hover:bg-white/5 border-transparent'
                      }`}
                  >
                    <div className="flex-shrink-0">
                      {pair.type === 'modified' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                      {pair.type === 'added' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />}
                      {pair.type === 'deleted' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold truncate ${selectedPair === pair ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'}`}>
                        {pair.v2?.path.split('/').pop() || pair.v1?.path.split('/').pop()}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate mt-0.5 font-mono opacity-60">
                        {pair.slug}
                      </span>
                    </div>
                  </button>
                ))}
            </nav>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40 min-w-[320px]">
            <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <FolderOpen size={24} className="text-slate-600" />
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              Workspace Idle
            </p>
          </div>
        )}

        {/* Resizer Handle */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={startResizing}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-40 flex items-center justify-center group/resizer"
          >
            <div className="w-[1px] h-10 bg-white/10 group-hover/resizer:bg-blue-500/50" />
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative">
        {selectedPair ? (
          <ComparisonView
            pair={selectedPair}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 text-center">
              <div className="relative inline-block mb-10">
                <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-28 h-28 bg-slate-900 border border-white/10 rounded-[32px] flex items-center justify-center shadow-2xl">
                  <Layout size={48} className="text-blue-500" />
                </div>
              </div>

              <h3 className="text-3xl font-black text-white tracking-tighter mb-4">CodeDiff Intelligence</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-10 font-medium">
                Deep-link comparison with intra-line highlighting. Unchanged blocks are folded automatically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
                {[
                  { icon: Navigation, color: 'text-blue-400', label: 'Mini-Map', text: 'Visual heatmap of changes' },
                  { icon: Eye, color: 'text-emerald-400', label: 'Intra-Line', text: 'Granular word-level diffs' },
                  { icon: ShieldAlert, color: 'text-amber-400', label: 'Policy', text: 'Auto binary filtering' }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center text-center group hover:bg-slate-800/60 transition-all">
                    <item.icon size={24} className={`${item.color} mb-4 group-hover:scale-110 transition-transform`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</span>
                    <p className="text-xs text-slate-400 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center transition-all duration-300">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
          <p className="text-white font-black tracking-widest uppercase text-xs mb-2">Analyzing File Trees</p>
          <p className="text-slate-500 text-[10px] font-mono animate-pulse">Running identity resolution & Myers-diff engine...</p>
        </div>
      )}
    </div>
  );
}