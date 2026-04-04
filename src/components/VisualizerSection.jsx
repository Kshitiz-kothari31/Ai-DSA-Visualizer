import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Database, Share2, Zap } from 'lucide-react';
// 1. IMPORT REACT-XARROWS
import Xarrow, { Xwrapper } from 'react-xarrows';

// --- Recursive DataNode with Arrow Logic ---
const DataNode = ({ data, depth = 0 }) => {
  const uniqueId = useId().replace(/:/g, "-");
  const nodeId = `node-${uniqueId}`;

  // 1. Safety check for recursion depth
  if (depth > 6) return <div className="text-red-500 text-[10px]">Max Depth</div>;

  // 2. Handle Null/Undefined
  if (data === null || data === undefined) {
    return <span className="text-zinc-600 font-mono text-xs italic">null</span>;
  }

  // 3. Handle Primitives (Numbers, Strings)
  if (typeof data !== 'object') {
    return (
      <span id={nodeId} className="text-yellow-400 font-mono font-bold px-1">
        {String(data)}
      </span>
    );
  }

  // 4. Handle Arrays
  if (Array.isArray(data)) {
    return (
      <div id={nodeId} className="flex flex-wrap gap-1 p-2 bg-white/5 border border-zinc-800 rounded">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center border border-zinc-700 bg-zinc-900 p-1 rounded">
            <span className="text-[8px] text-zinc-500">{i}</span>
            <DataNode data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  // 5. Handle Objects (Linked Lists / Trees)
  const keys = Object.keys(data);
  return (
    <div 
      id={nodeId} 
      className="p-3 border border-sky-500/30 bg-sky-900/10 rounded-lg shadow-inner min-w-[60px]"
    >
      {keys.map((key) => {
        const val = data[key];
        const isPointer = ['next', 'left', 'right'].includes(key.toLowerCase());

        return (
          <div key={key} className="mb-2 last:mb-0">
            <div className="text-[9px] text-sky-400 font-mono uppercase opacity-70">{key}</div>
            <div className="pl-2 border-l border-sky-500/20">
              <DataNode data={val} depth={depth + 1} />
              {/* Only render arrow if it's a pointer to another object */}
              {isPointer && val && typeof val === 'object' && (
                <Xarrow
                  start={nodeId}
                  end={`node-${key}-${depth}`} // Simplified for testing
                  color="#0ea5e9"
                  strokeWidth={1.5}
                  headSize={4}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- Main Section ---
const VisualizerSection = ({
  stateList = [], currentStateIndex = 0, setCurrentStateIndex,
  isPlaying, setIsPlaying, onClose
}) => {
  const currentState = stateList[currentStateIndex] || { variables: {} };
  const variables = currentState.variables || {};

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-100 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-900 bg-[#0a0a0a]">
        <div className="flex items-center gap-2.5">
          <Zap size={18} className="text-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
          <span className="font-bold text-xs tracking-wider text-zinc-300">STRUCTURE ENGINE v1.1</span>
        </div>
        <button onClick={onClose} className="hover:bg-zinc-800/50 p-1 rounded transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* 4. WRAP THE RENDER AREA IN XWRAPPER */}
      {/* This component re-calculates all arrow paths whenever the DOM updates */}
      <Xwrapper>
        <div className="flex-grow overflow-auto p-5 space-y-8 custom-scrollbar relative">
          {Object.keys(variables).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <Database size={36} className="mb-3 opacity-30" />
              <p className="text-[11px] font-mono tracking-tight">WAITING FOR MEMORY SNAPSHOT...</p>
            </div>
          ) : (
            Object.entries(variables).map(([name, value]) => (
              <div key={name} className="animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]" />
                  <span className="text-xs font-bold text-zinc-200 font-mono">{name}</span>
                </div>
                {/* Begin the recursive render */}
                <DataNode data={value} name={name} />
              </div>
            ))
          )}
        </div>
      </Xwrapper>

      {/* Controls */}
      <div className="p-4 border-t border-zinc-900 bg-[#0a0a0a]">
        <div className="flex flex-col gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, stateList.length - 1)}
            value={currentStateIndex}
            onChange={(e) => { setIsPlaying(false); setCurrentStateIndex(parseInt(e.target.value)); }}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
            <span>STEP {currentStateIndex + 1} / {stateList.length}</span>
            <div className="flex items-center gap-5 text-zinc-300">
              <button onClick={() => setCurrentStateIndex(Math.max(0, currentStateIndex - 1))} className="hover:text-sky-500"><SkipBack size={18} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="bg-sky-600 hover:bg-sky-500 p-2.5 rounded-full transition-all shadow-[0_0_12px_rgba(14,165,233,0.3)] active:scale-95"
              >
                {isPlaying ? <Pause size={18} fill="white" className="text-white"/> : <Play size={18} fill="white" className="text-white"/>}
              </button>
              <button onClick={() => setCurrentStateIndex(Math.min(stateList.length - 1, currentStateIndex + 1))} className="hover:text-sky-500"><SkipForward size={18} /></button>
            </div>
            <div className="w-12"></div> {/* Spacer */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizerSection;