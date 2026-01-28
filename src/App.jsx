import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

// --- CONFIG & CONSTANTS ---

const IGNORE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'pdf', 'zip', 'tar', 'gz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'woff', 'woff2', 'ttf', 'eot'
]);

// --- UTILS ---

/**
 * ENTITY RESOLUTION LOGIC
 * Strips extensions, version numbers, and legacy/modern markers.
 */
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

const isTextFile = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return !IGNORE_EXTENSIONS.has(ext);
};

/**
 * MYERS-INSPIRED DIFF ENGINE
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
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i, i + 15).includes(newLines[j]))) {
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

const DiffLine = ({ line, viewMode }) => {
  const typeStyles = {
    added: 'bg-emerald-500/10 text-emerald-300 border-l-4 border-emerald-500',
    removed: 'bg-rose-500/10 text-rose-300 border-l-4 border-rose-500',
    unchanged: 'text-slate-400 border-l-4 border-transparent'
  };

  const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

  return (
    <div className={`flex font-mono text-[13px] leading-6 group transition-colors duration-75 ${typeStyles[line.type]} hover:bg-white/5`}>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40 shrink-0">{line.oldLine || ''}</div>
      <div className="w-10 text-right pr-3 text-slate-600 select-none opacity-40 border-r border-white/5 shrink-0">{line.newLine || ''}</div>
      <div className="px-4 whitespace-pre flex-1 min-w-0 overflow-hidden text-ellipsis">
        <span className="mr-3 opacity-30 select-none">{prefix}</span>
        {line.content}
      </div>
    </div>
  );
};

const ComparisonView = ({ pair, viewMode }) => {
  const diff = useMemo(() => calculateDiff(pair.v1?.content, pair.v2?.content), [pair]);
  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'added').length,
    removed: diff.filter(d => d.type === 'removed').length,
    total: diff.length
  }), [diff]);

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = pair.v2?.content || pair.v1?.content || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/40 backdrop-blur-xl shrink-0 z-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText size={18} className="text-blue-400" />
            </div>
            <h2 className="text-slate-100 font-semibold tracking-tight truncate max-w-md">
              {pair.v2?.path || pair.v1?.path}
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${pair.type === 'modified' ? 'bg-blue-500/20 text-blue-400' :
                pair.type === 'added' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
              {pair.type}
            </span>
            <span className="text-slate-600">•</span>
            <code className="text-[11px] text-slate-500 italic">resolved_as: {pair.slug}</code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-black/30 rounded-full px-3 py-1 border border-white/5 mr-2">
            <span className="text-[11px] font-bold text-emerald-500">+{stats.added}</span>
            <div className="w-[1px] h-3 bg-white/10 mx-2" />
            <span className="text-[11px] font-bold text-rose-500">-{stats.removed}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-white/10 transition-all"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Latest'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-[#0d1117] custom-scrollbar">
        <div className="py-4">
          {diff.map((line, idx) => (
            <DiffLine key={idx} line={line} viewMode={viewMode} />
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
  const [viewMode, setViewMode] = useState('unified');

  // Directory Reading Engine
  const handleDirectorySelect = async (e, setFiles) => {
    const files = Array.from(e.target.files);
    setIsProcessing(true);

    const fileData = [];
    for (const file of files) {
      if (!isTextFile(file.name)) continue;

      const content = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsText(file);
      });

      fileData.push({
        path: file.webkitRelativePath || file.name,
        content,
        size: file.size,
        ext: file.name.split('.').pop()
      });
    }

    setFiles(fileData);
    setIsProcessing(false);
  };

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

  const stats = {
    modified: matchedPairs.filter(p => p.type === 'modified').length,
    added: matchedPairs.filter(p => p.type === 'added').length,
    deleted: matchedPairs.filter(p => p.type === 'deleted').length,
  };

  return (
    <div className="flex h-screen bg-[#010409] text-slate-300 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0d1117] z-30 shadow-2xl shrink-0">
        <div className="p-5 border-b border-white/5 bg-slate-900/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Code size={18} className="text-white" />
              </div>
              <h1 className="text-xs font-black text-white tracking-widest uppercase">Version Lens</h1>
            </div>
            {(v1Files.length > 0 || v2Files.length > 0) && (
              <button
                onClick={reset}
                className="p-1.5 hover:bg-white/5 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
                title="Reset Workspace"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-[#1c2128] transition-all group">
              <FolderOpen size={16} className={v1Files.length ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400/70"} />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">Source Version</span>
                <span className="text-xs truncate font-medium text-slate-200">
                  {v1Files.length ? `${v1Files.length} files matched` : "Select Base Folder"}
                </span>
              </div>
              <input type="file" webkitdirectory="true" className="hidden" onChange={(e) => handleDirectorySelect(e, setV1Files)} />
            </label>

            <label className="flex items-center gap-3 px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-[#1c2128] transition-all group">
              <FolderOpen size={16} className={v2Files.length ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400/70"} />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">Target Version</span>
                <span className="text-xs truncate font-medium text-slate-200">
                  {v2Files.length ? `${v2Files.length} files matched` : "Select New Folder"}
                </span>
              </div>
              <input type="file" webkitdirectory="true" className="hidden" onChange={(e) => handleDirectorySelect(e, setV2Files)} />
            </label>
          </div>
        </div>

        {matchedPairs.length > 0 ? (
          <>
            <div className="px-5 py-4 border-b border-white/5">
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Filter by name or slug..."
                  className="w-full bg-[#010409] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs outline-none focus:border-blue-500/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-[10px] font-bold shrink-0">
                  <RefreshCw size={10} /> {stats.modified}
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md text-[10px] font-bold shrink-0">
                  <Plus size={10} /> {stats.added}
                </div>
                <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md text-[10px] font-bold shrink-0">
                  <Minus size={10} /> {stats.deleted}
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-auto px-2 space-y-1 py-3 custom-scrollbar">
              {matchedPairs
                .filter(p => p.slug.includes(searchTerm.toLowerCase()) || (p.v2?.path || '').toLowerCase().includes(searchTerm.toLowerCase()))
                .map((pair, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPair(pair)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group relative ${selectedPair === pair
                        ? 'bg-blue-600/10 text-blue-400 shadow-inner ring-1 ring-white/5'
                        : 'hover:bg-white/5'
                      }`}
                  >
                    <div className="flex-shrink-0">
                      {pair.type === 'modified' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                      {pair.type === 'added' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                      {pair.type === 'deleted' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate ${selectedPair === pair ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'}`}>
                        {pair.v2?.path || pair.v1?.path}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate mt-0.5 font-mono opacity-60">
                        {pair.slug}
                      </span>
                    </div>
                  </button>
                ))}
            </nav>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Settings size={32} className="text-slate-800 mb-4 animate-spin-slow" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Folders are matched automatically using fuzzy slug resolution.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative">
        {selectedPair ? (
          <ComparisonView pair={selectedPair} viewMode={viewMode} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="relative mb-10">
              <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                <Layout size={40} className="text-blue-500" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-3">Initialize Diff Workspace</h3>
            <p className="text-slate-500 text-sm max-w-sm text-center leading-relaxed">
              Drop directories or use the sidebar buttons. Binary files like images and executables are automatically skipped to keep comparison data clean.
            </p>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
              <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
                <Eye size={20} className="text-blue-400 mb-3" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Observation</span>
                <p className="text-xs text-slate-400">Unified diff visualization</p>
              </div>
              <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
                <Columns size={20} className="text-emerald-400 mb-3" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Matching</span>
                <p className="text-xs text-slate-400">Fuzzy filename pairing</p>
              </div>
              <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
                <AlertCircle size={20} className="text-amber-400 mb-3" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Filtering</span>
                <p className="text-xs text-slate-400">Auto-binary skipping</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center transition-all duration-300">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-white font-black tracking-widest uppercase text-xs">Parsing Filesystems</p>
          <p className="text-slate-500 text-[10px] mt-2 italic">Scanning for text content...</p>
        </div>
      )}
    </div>
  );
}