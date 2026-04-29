import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Database, Zap } from 'lucide-react';
import Xarrow, { Xwrapper } from 'react-xarrows';

// --- Type Checking Heuristics ---
const isPrimitive = (val) => val === null || val === undefined || typeof val !== 'object';
const isArray = (val) => Array.isArray(val);
const getKeys = (val) => Object.keys(val).map(k => k.toLowerCase());

const isLinkedListNode = (val) => {
    if (isArray(val) || isPrimitive(val)) return false;
    const keys = getKeys(val);
    return (keys.includes('val') || keys.includes('value') || keys.includes('data')) && 
           (keys.includes('next') || keys.includes('prev'));
};

const isTreeNode = (val) => {
    if (isArray(val) || isPrimitive(val)) return false;
    const keys = getKeys(val);
    return (keys.includes('val') || keys.includes('value') || keys.includes('data')) && 
           (keys.includes('left') || keys.includes('right'));
};

// --- Specialized DSA Viewers ---

const PrimitiveViewer = ({ data }) => {
    if (data === null || data === undefined) return <span className="text-zinc-500 font-mono text-base italic">null</span>;
    if (typeof data === 'boolean') return <span className="text-orange-400 font-mono text-base">{String(data)}</span>;
    if (typeof data === 'string') return <span className="text-green-400 font-mono text-base">"{data}"</span>;
    return <span className="text-yellow-400 font-mono font-bold text-base bg-yellow-400/10 px-3 py-1 rounded border border-yellow-400/20">{String(data)}</span>;
};

const ArrayViewer = ({ data, rootVariables }) => {
    // Find variables that act as pointers (i.e., integers that match the index)
    const pointersForIndex = (idx) => {
        const pointers = [];
        for (const [vName, vVal] of Object.entries(rootVariables)) {
            if (isPrimitive(vVal) && typeof vVal === 'number' && vVal === idx) {
                // Ignore the array's own name or other arrays
                if (isArray(vVal)) continue;
                pointers.push(vName);
            }
        }
        return pointers;
    };

    return (
        <div className="flex items-end gap-2 py-6 px-4">
            {data.map((item, idx) => {
                const pointers = pointersForIndex(idx);
                return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 relative group" id={`obj-${item?.__id || ''}`}>
                        {/* Step-by-Step Pointers / Function Loop Variables */}
                        {pointers.length > 0 && (
                            <div className="absolute bottom-full mb-1 flex flex-col-reverse items-center gap-1">
                                <div className="w-0.5 h-2 bg-sky-500/50 rounded" />
                                {pointers.map(p => (
                                    <span key={p} className="text-[9px] bg-sky-500 text-white px-1 py-0.5 rounded-sm font-mono shadow-[0_0_8px_rgba(14,165,233,0.4)]">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}
                        
                        <div className="w-10 h-10 flex items-center justify-center border-2 border-zinc-600 bg-zinc-800 text-zinc-100 font-mono text-xs rounded hover:border-sky-500 transition-colors shadow-lg relative">
                            {isPrimitive(item) ? String(item) : (item.__ref ? 'Ref' : 'Obj')}
                            {item?.__ref && <Xarrow start={`obj-${item.__ref}-ptr-${idx}`} end={`obj-${item.__ref}`} showHead={true} color="#a1a1aa" />}
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900 px-1 rounded">{idx}</span>
                    </div>
                );
            })}
            {data.length === 0 && <span className="text-zinc-600 font-mono text-sm italic">Empty Array</span>}
        </div>
    );
};

const LinkedListViewer = ({ head, path }) => {
    const nodes = [];
    let curr = head;
    let limit = 20; // safety against infinit loops
    const visited = new Set();
    let hasCycle = false;

    while (curr && !isPrimitive(curr) && limit > 0) {
        if (visited.has(curr)) {
            hasCycle = true;
            break;
        }
        visited.add(curr);
        nodes.push(curr);
        curr = curr.next !== undefined ? curr.next : curr.Next;
        limit--;
    }

    return (
        <div className="flex items-center gap-12 p-6 overflow-x-auto">
            {nodes.map((n, i) => {
                const nodeId = `ll-${path}-${i}`;
                const val = n.val !== undefined ? n.val : (n.value !== undefined ? n.value : n.data);
                return (
                    <div key={i} className="relative shrink-0" id={n.__id ? `obj-${n.__id}` : ''}>
                        <div id={nodeId} className="flex border-2 border-purple-500 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.2)] rounded overflow-hidden z-10 relative hover:-translate-y-0.5 transition-transform">
                            <div className="px-3 py-1.5 font-mono font-bold text-purple-100 border-r border-purple-500/50 flex items-center justify-center min-w-[2.5rem] bg-zinc-900/50 text-sm">
                                {val !== undefined && val !== null ? String(val) : 'null'}
                            </div>
                            <div className="px-2 py-2 flex items-center justify-center bg-purple-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"></div>
                            </div>
                        </div>

                        {/* Arrow to Next Node */}
                        {i < nodes.length - 1 && (
                            <Xarrow start={nodeId} end={`ll-${path}-${i+1}`} showHead={true} color="#c084fc" strokeWidth={2.5} path="straight" startAnchor="right" endAnchor="left" />
                        )}

                        {/* Null Terminator */}
                        {i === nodes.length - 1 && !hasCycle && (!n.next && !n.Next) && (
                            <>
                                <div id={`ll-${path}-null`} className="absolute -right-16 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs italic bg-zinc-900 px-2 rounded">∅</div>
                                <Xarrow start={nodeId} end={`ll-${path}-null`} showHead={true} color="#52525b" strokeWidth={2} path="straight" dashness={true} startAnchor="right" endAnchor="left" />
                            </>
                        )}
                    </div>
                );
            })}
            
            {hasCycle && <span className="text-rose-500 text-xs font-mono font-bold ml-4 border border-rose-500 px-2 py-1 rounded bg-rose-900/20">⟲ Cycle Detected</span>}
            {limit === 0 && <span className="text-zinc-500 text-xs ml-4">(Truncated)</span>}
        </div>
    );
};

const TreeViewer = ({ node, path }) => {
    if (!node || isPrimitive(node)) return null;

    const nodeId = `tree-${path}`;
    const leftChild = node.left !== undefined ? node.left : node.Left;
    const rightChild = node.right !== undefined ? node.right : node.Right;
    const val = node.val !== undefined ? node.val : (node.value !== undefined ? node.value : node.data);

    return (
        <div className="flex flex-col items-center gap-8 py-4" id={node.__id ? `obj-${node.__id}` : ''}>
            <div 
                id={nodeId} 
                className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-900/40 flex items-center justify-center font-mono font-bold text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10 hover:bg-emerald-800 transition-colors text-xs"
                title={`Tree Node: ${val}`}
            >
                {val !== undefined && val !== null ? String(val) : 'null'}
            </div>
            
            <div className="flex gap-16 justify-center">
                {leftChild && !isPrimitive(leftChild) && (
                    <div className="flex flex-col items-center relative">
                        <TreeViewer node={leftChild} path={`${path}-L`} />
                        <Xarrow 
                            start={nodeId} 
                            end={`tree-${path}-L`} 
                            showHead={true} 
                            color="#34d399" 
                            strokeWidth={2} 
                            path="straight" 
                            startAnchor="bottom" 
                            endAnchor="top" 
                        />
                    </div>
                )}
                {rightChild && !isPrimitive(rightChild) && (
                    <div className="flex flex-col items-center relative">
                        <TreeViewer node={rightChild} path={`${path}-R`} />
                        <Xarrow 
                            start={nodeId} 
                            end={`tree-${path}-R`} 
                            showHead={true} 
                            color="#34d399" 
                            strokeWidth={2} 
                            path="straight" 
                            startAnchor="bottom" 
                            endAnchor="top" 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const ObjectViewer = ({ data, path, rootVariables }) => {
    // Standard Object/Dictionary fallback
    return (
        <div className="p-4 border-l-2 border-sky-500/50 bg-sky-900/10 rounded-r-lg shadow-inner min-w-[120px] inline-block" id={data.__id ? `obj-${data.__id}` : ''}>
             {Object.entries(data).map(([k, v]) => {
                  if (k === '__id') return null;
                  return (
                       <div key={k} className="flex flex-col mb-2 last:mb-0">
                            <span className="text-[10px] text-sky-400 font-mono mb-0.5 uppercase tracking-wider">{k}</span>
                            <div className="pl-2 border-l text-xs border-zinc-700">
                                <DataDispatcher data={v} path={`${path}-${k}`} rootVariables={rootVariables} />
                            </div>
                       </div>
                  )
             })}
        </div>
    );
};


const DataDispatcher = ({ data, path, rootVariables }) => {
    if (isPrimitive(data)) {
        return <PrimitiveViewer data={data} />;
    }
    if (data.__ref !== undefined) {
        // Pointer mapping! Graph reference visually.
        return (
            <div className="relative inline-flex flex-col items-center">
                <div id={`ptr-${path}`} className="px-3 py-1 bg-zinc-800 border-2 border-zinc-600 rounded-lg text-xs font-mono text-zinc-300 shadow-md">
                    Pointer
                </div>
                <Xarrow start={`ptr-${path}`} end={`obj-${data.__ref}`} showHead={true} color="#38bdf8" strokeWidth={2} dashness={true} headSize={4} />
            </div>
        );
    }
    if (isArray(data)) {
        return <ArrayViewer data={data} rootVariables={rootVariables} />;
    }
    if (isTreeNode(data)) {
        return <TreeViewer node={data} path={path} />;
    }
    if (isLinkedListNode(data)) {
        return <LinkedListViewer head={data} path={path} />;
    }
    return <ObjectViewer data={data} path={path} rootVariables={rootVariables} />;
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
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
                    <span className="font-bold text-[10px] tracking-widest text-zinc-400 uppercase">DSA Visualizer</span>
                </div>
                <button onClick={onClose} className="hover:bg-zinc-800 p-1 rounded transition-colors text-zinc-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {/* Render Area wrapped in Xwrapper for arrows */}
            <Xwrapper>
            <div className="flex-grow overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar relative">
                    {Object.keys(variables).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                             <Database size={40} className="mb-3 opacity-20" />
                             <p className="text-[10px] font-mono tracking-tight uppercase">Waiting for memory snapshot...</p>
                        </div>
                    ) : (
                        Object.entries(variables).map(([name, value]) => {
                            // Optionally hide internal system variables if they bleed through
                            if (name.startsWith('__')) return null;

                            return (
                                <div key={name} className="animate-in fade-in slide-in-from-bottom-2 duration-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/80 mb-3 backdrop-blur-sm relative shadow-lg overflow-x-auto">
                                     <div className="flex items-center gap-2 mb-3 bg-zinc-950 inline-flex px-1.5 py-1 rounded border border-zinc-800 shadow-sm">
                                         <div className="h-1 w-1 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]" />
                                         <span className="text-[9px] font-bold text-zinc-100 font-mono">{name}</span>
                                     </div>
                                    
                                    <div className="pl-2">
                                        {/* Entry Point for the specific variable structure */}
                                        <DataDispatcher data={value} path={name} rootVariables={variables} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Xwrapper>

            {/* Controls Toolbar */}
            <div className="p-5 border-t border-zinc-900 bg-zinc-950">
                <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                    <div className="relative group">
                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, stateList.length - 1)}
                            value={currentStateIndex}
                            onChange={(e) => { setIsPlaying(false); setCurrentStateIndex(parseInt(e.target.value)); }}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:h-2 transition-all"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between text-zinc-500 font-mono text-[10px] gap-4 sm:gap-0 mt-4 sm:mt-0">
                        <span className="bg-zinc-900 px-2 py-1 rounded w-full sm:w-auto text-center">STEP {stateList.length === 0 ? 0 : currentStateIndex + 1} / {stateList.length}</span>
                        <div className="flex items-center gap-4 text-zinc-400">
                            <button onClick={() => setCurrentStateIndex(Math.max(0, currentStateIndex - 1))} className="hover:text-sky-500 transition-colors p-1"><SkipBack size={14} /></button>
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)} 
                                className="bg-sky-600 hover:bg-sky-500 p-2.5 rounded-full transition-all shadow-[0_0_12px_rgba(14,165,233,0.4)] hover:shadow-[0_0_15px_rgba(14,165,233,0.6)] hover:scale-105 active:scale-95"
                            >
                                {isPlaying ? <Pause size={14} fill="white" className="text-white"/> : <Play size={14} fill="white" className="text-white"/>}
                            </button>
                            <button onClick={() => setCurrentStateIndex(Math.min(stateList.length - 1, currentStateIndex + 1))} className="hover:text-sky-500 transition-colors p-1"><SkipForward size={14} /></button>
                        </div>
                        <div className="w-20 hidden sm:block"></div> {/* Spacer for symmetry */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualizerSection;