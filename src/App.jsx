import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Diff,
  ArrowRightLeft,
  Plus,
  Minus,
  Info,
  Search,
  Activity,
  Code,
  Copy,
  Upload,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

// --- UTILS ---

/**
 * ENTITY RESOLUTION LOGIC
 * Strips extensions, version numbers, and legacy/modern markers to find the "identity" of a file.
 */
const getFileSlug = (filename) => {
  return filename
    .toLowerCase()
    .split('/')
    .pop()
    .replace(/[._-]v?\d+(\.\d+)*/g, '')
    .replace(/[._-](legacy|modern|old|new|final|latest)/g, '')
    .replace(/\.[^/.]+$/, "")
    .trim();
};

/**
 * MYERS-INSPIRED DIFF
 * Simple line-by-line comparison
 */
const calculateDiff = (oldText, newText) => {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const diff = [];

  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: 'unchanged', oldLine: i + 1, newLine: j + 1, content: oldLines[i] });
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i, i + 10).includes(newLines[j]))) {
      diff.push({ type: 'added', oldLine: null, newLine: j + 1, content: newLines[j] });
      j++;
    } else {
      diff.push({ type: 'removed', oldLine: i + 1, newLine: null, content: oldLines[i] });
      i++;
    }
  }
  return diff;
};

// --- COMPONENTS ---

const DiffRow = ({ line }) => {
  const typeStyles = {
    added: 'bg-emerald-500/15 text-emerald-300 border-l-4 border-emerald-500',
    removed: 'bg-rose-500/15 text-rose-300 border-l-4 border-rose-500',
    unchanged: 'text-slate-400 border-l-4 border-transparent'
  };

  const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

  return (
    <div className={`flex font-mono text-[13px] leading-6 group transition-colors duration-100 ${typeStyles[line.type]} hover:bg-white/5`}>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40">{line.oldLine || ''}</div>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40 border-r border-white/5">{line.newLine || ''}</div>
      <div className="px-4 whitespace-pre flex-1">
        <span className="mr-3 opacity-30 select-none">{prefix}</span>
        {line.content}
      </div>
    </div>
  );
};

const ComparisonView = ({ pair }) => {
  const diff = useMemo(() => calculateDiff(pair.v1?.content, pair.v2?.content), [pair]);
  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'added').length,
    removed: diff.filter(d => d.type === 'removed').length
  }), [diff]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText size={18} className="text-blue-400" />
            </div>
            <h2 className="text-slate-100 font-semibold tracking-tight">
              {pair.v2?.path || pair.v1?.path}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 ml-11">
            Resolved ID: <code className="text-blue-400/80">{pair.slug}</code>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1 text-xs font-bold">
            <span className="text-emerald-400">+{stats.added}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">-{stats.removed}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-[#0d1117]">
        <div className="py-4">
          {diff.map((line, idx) => (
            <DiffRow key={idx} line={line} />
          ))}
        </div>
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

  // Handle Directory Input
  const handleDirectorySelect = async (e, setFiles) => {
    const files = Array.from(e.target.files);
    setIsProcessing(true);

    const fileData = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            path: file.webkitRelativePath || file.name,
            content: event.target.result,
            size: file.size
          });
        };
        reader.readAsText(file);
      });
    }));

    setFiles(fileData);
    setIsProcessing(false);
  };

  // The Core Matching Engine (Logic remains robust but acts on live state)
  const matchedPairs = useMemo(() => {
    if (v1Files.length === 0 && v2Files.length === 0) return [];

    const pairs = [];
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

    allSlugs.forEach(slug => {
      const v1Matches = v1Map.get(slug) || [];
      const v2Matches = v2Map.get(slug) || [];

      if (v1Matches.length > 0 && v2Matches.length > 0) {
        pairs.push({ type: 'modified', slug, v1: v1Matches[0], v2: v2Matches[0] });
      } else if (v1Matches.length > 0) {
        pairs.push({ type: 'deleted', slug, v1: v1Matches[0], v2: null });
      } else {
        pairs.push({ type: 'added', slug, v1: null, v2: v2Matches[0] });
      }
    });

    return pairs.sort((a, b) => a.slug.localeCompare(b.slug));
  }, [v1Files, v2Files]);

  useEffect(() => {
    if (matchedPairs.length > 0 && !selectedPair) {
      setSelectedPair(matchedPairs[0]);
    }
  }, [matchedPairs]);

  const reset = () => {
    setV1Files([]);
    setV2Files([]);
    setSelectedPair(null);
  };

  return (
    <div className="flex h-screen bg-[#010409] text-slate-300 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0d1117] z-10 shadow-2xl">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Code size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">Version Lens</h1>
            </div>
            {(v1Files.length > 0 || v2Files.length > 0) && (
              <button onClick={reset} className="text-slate-500 hover:text-white transition-colors">
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="group relative">
              <label className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border border-white/10 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all">
                <FolderOpen size={14} className={v1Files.length ? "text-emerald-400" : "text-slate-500"} />
                <span className="text-xs truncate font-medium">
                  {v1Files.length ? `${v1Files.length} files in V1` : "Select V1 Folder"}
                </span>
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  className="hidden"
                  onChange={(e) => handleDirectorySelect(e, setV1Files)}
                />
              </label>
            </div>

            <div className="group relative">
              <label className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border border-white/10 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all">
                <FolderOpen size={14} className={v2Files.length ? "text-emerald-400" : "text-slate-500"} />
                <span className="text-xs truncate font-medium">
                  {v2Files.length ? `${v2Files.length} files in V2` : "Select V2 Folder"}
                </span>
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  className="hidden"
                  onChange={(e) => handleDirectorySelect(e, setV2Files)}
                />
              </label>
            </div>
          </div>
        </div>

        {matchedPairs.length > 0 && (
          <>
            <div className="px-5 py-4 border-b border-white/5">
              <div className="relative group">
                <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Filter results..."
                  className="w-full bg-[#010409] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs outline-none focus:border-blue-500/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <nav className="flex-1 overflow-auto px-2 space-y-1 py-2 custom-scrollbar">
              {matchedPairs
                .filter(p => p.slug.includes(searchTerm.toLowerCase()))
                .map((pair, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPair(pair)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all group ${selectedPair === pair
                        ? 'bg-blue-600/10 text-blue-400 shadow-inner'
                        : 'hover:bg-white/5'
                      }`}
                  >
                    <div className="flex-shrink-0">
                      {pair.type === 'modified' && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                      {pair.type === 'added' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                      {pair.type === 'deleted' && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate ${selectedPair === pair ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'}`}>
                        {pair.v2?.path || pair.v1?.path}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                        {pair.slug}
                      </span>
                    </div>
                  </button>
                ))}
            </nav>
          </>
        )}

        <div className="p-4 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <div className="flex -space-x-1">
              <div className={`w-4 h-4 rounded-full border border-white/10 flex items-center justify-center text-[8px] ${v1Files.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>A</div>
              <div className={`w-4 h-4 rounded-full border border-white/10 flex items-center justify-center text-[8px] ${v2Files.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>B</div>
            </div>
            <span>{matchedPairs.length} matches found</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {selectedPair ? (
          <ComparisonView pair={selectedPair} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-800/30 rounded-full flex items-center justify-center mb-8 border border-white/5">
              <Upload size={32} className="text-slate-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Ready for Comparison</h3>
            <p className="text-slate-500 text-sm mt-3 max-w-sm text-center leading-relaxed px-6">
              Upload two versions of your project directories. Files will be automatically matched based on their core identity, even if renamed or versioned.
            </p>

            {!v1Files.length && !v2Files.length && (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/5 bg-[#161b22] text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Algorithm</p>
                  <p className="text-xs text-slate-400">Myers-inspired diffing</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-[#161b22] text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Resolution</p>
                  <p className="text-xs text-slate-400">Fuzzy filename slugs</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <RefreshCw size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-white font-medium">Indexing Files...</p>
        </div>
      )}
    </div>
  );
}