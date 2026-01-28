// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 2)}>
//           count is {count}
//         </button> <br />
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div >
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

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
  Check
} from 'lucide-react';

/**
 * MOCK DATA: Simulating real-world versioning chaos
 */
const MOCK_PROJECTS = [
  {
    id: 'compare_01',
    name: 'Auth-System-Core',
    v1: [
      { path: 'src/auth/login_v1.js', content: 'function auth(u, p) {\n  return db.query("SELECT * FROM users");\n}\n\nexport default auth;' },
      { path: 'src/utils/logger-legacy.js', content: 'export const log = (m) => console.log(`[LOG]: ${m}`);' },
      { path: 'package.json', content: '{\n  "name": "auth-core",\n  "version": "1.0.0"\n}' }
    ],
    v2: [
      { path: 'src/auth/login_v1.2.js', content: 'async function auth(u, p) {\n  // Added async support and security hashing\n  const hash = await crypto.hash(p);\n  return db.execute("SELECT * FROM users WHERE creds = ?", [u, hash]);\n}\n\nexport default auth;' },
      { path: 'src/utils/logger-modern.js', content: 'export const log = (m) => console.log(`[MODERN-LOG]: ${m}`);\nexport const error = (m) => console.error(m);' },
      { path: 'package.json', content: '{\n  "name": "auth-core",\n  "version": "1.2.0",\n  "dependencies": { "crypto": "latest" }\n}' },
      { path: 'README.md', content: '# Auth Core\nUpdated to use crypto hashing.' }
    ]
  },
  {
    id: 'compare_02',
    name: 'UI-Library-Alpha',
    v1: [
      { path: 'components/Button-v1.tsx', content: 'export const Button = () => <button>Click</button>' }
    ],
    v2: [
      { path: 'components/Button-v2-final.tsx', content: 'export const Button = ({ variant }) => (\n  <button className={variant === "primary" ? "bg-blue" : "bg-gray"}>\n    Click\n  </button>\n)' }
    ]
  }
];

// --- UTILS ---

/**
 * ENTITY RESOLUTION LOGIC
 * Strips extensions, version numbers, and legacy/modern markers to find the "identity" of a file.
 */
const getFileSlug = (filename) => {
  return filename
    .toLowerCase()
    .split('/')
    .pop() // Get just the filename
    .replace(/[._-]v?\d+(\.\d+)*/g, '') // Remove v1.0, -v2
    .replace(/[._-](legacy|modern|old|new|final|latest)/g, '') // Remove stage markers
    .replace(/\.[^/.]+$/, "") // Remove extension
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
            ID: <code className="text-blue-400/80">{pair.slug}</code>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1 text-xs font-bold">
            <span className="text-emerald-400">+{stats.added}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">-{stats.removed}</span>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-md transition-colors text-slate-400">
            <Copy size={16} />
          </button>
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
  const [activeProject, setActiveProject] = useState(MOCK_PROJECTS[0]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const matchedPairs = useMemo(() => {
    const pairs = [];
    const v1Map = new Map();
    const v2Map = new Map();

    activeProject.v1.forEach(f => {
      const slug = getFileSlug(f.path);
      if (!v1Map.has(slug)) v1Map.set(slug, []);
      v1Map.get(slug).push(f);
    });

    activeProject.v2.forEach(f => {
      const slug = getFileSlug(f.path);
      if (!v2Map.has(slug)) v2Map.set(slug, []);
      v2Map.get(slug).push(f);
    });

    const allSlugs = new Set([...v1Map.keys(), ...v2Map.keys()]);

    allSlugs.forEach(slug => {
      const v1Files = v1Map.get(slug) || [];
      const v2Files = v2Map.get(slug) || [];

      if (v1Files.length > 0 && v2Files.length > 0) {
        pairs.push({ type: 'modified', slug, v1: v1Files[0], v2: v2Files[0] });
      } else if (v1Files.length > 0) {
        pairs.push({ type: 'deleted', slug, v1: v1Files[0], v2: null });
      } else {
        pairs.push({ type: 'added', slug, v1: null, v2: v2Files[0] });
      }
    });

    return pairs;
  }, [activeProject]);

  useEffect(() => {
    if (matchedPairs.length > 0) {
      setSelectedPair(matchedPairs[0]);
    }
  }, [matchedPairs]);

  return (
    <div className="flex h-screen bg-[#010409] text-slate-300 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0d1117] z-10 shadow-2xl">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code size={18} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-widest uppercase">Version Lens</h1>
          </div>

          <label className="text-[10px] font-bold text-slate-500 mb-2 block tracking-wider uppercase">Active Project</label>
          <div className="relative">
            <select
              className="w-full bg-[#161b22] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none cursor-pointer"
              onChange={(e) => setActiveProject(MOCK_PROJECTS.find(x => x.id === e.target.value))}
            >
              {MOCK_PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-slate-500" />
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="relative group">
            <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Filter by name or slug..."
              className="w-full bg-[#010409] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-auto px-2 space-y-1 custom-scrollbar">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Changeset</div>
          {matchedPairs
            .filter(p => p.slug.includes(searchTerm.toLowerCase()) || (p.v2?.path || '').toLowerCase().includes(searchTerm.toLowerCase()))
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

        <div className="p-4 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[8px]">V1</div>
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[8px]">V2</div>
            </div>
            <span>Smart Resolution Enabled</span>
          </div>
        </div>
      </aside>

      {/* Main Diff Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedPair ? (
          <ComparisonView pair={selectedPair} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117]">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
              <Diff size={32} className="text-slate-600" />
            </div>
            <h3 className="text-white font-medium">No File Selected</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs text-center">
              Choose a file from the sidebar to inspect version differences and logic changes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}