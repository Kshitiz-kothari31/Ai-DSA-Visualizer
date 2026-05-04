import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Database, Zap, Info, TrendingUp, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import XarrowRaw, { Xwrapper } from 'react-xarrows';
const Xarrow = XarrowRaw.default || XarrowRaw;

// --- Type Checking Heuristics ---
const isPrimitive = (val) => val === null || val === undefined || typeof val !== 'object';
const isArray = (val) => Array.isArray(val) || (val && val.__type === 'array');
const getKeys = (val) => Object.keys(val).map(k => k.toLowerCase());

const isLinkedListNode = (val, rootVariables) => {
    if (isArray(val) || isPrimitive(val)) return false;
    
    // Resolve ref if needed
    let actualVal = val;
    if (val.__ref && rootVariables) {
        // Simple search for the object by ID in rootVariables
        const findObj = (obj, id) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.__id === id) return obj;
            for (let k in obj) {
                const found = findObj(obj[k], id);
                if (found) return found;
            }
            return null;
        };
        for (let k in rootVariables) {
            const found = findObj(rootVariables[k], val.__ref);
            if (found) { actualVal = found; break; }
        }
    }

    const keys = getKeys(actualVal);
    return (keys.includes('val') || keys.includes('value') || keys.includes('data')) && 
           (keys.includes('next') || keys.includes('prev'));
};

const isTreeNode = (val) => {
    if (isArray(val) || isPrimitive(val) || val.__ref) return false;
    const keys = getKeys(val);
    return (keys.includes('val') || keys.includes('value') || keys.includes('data')) && 
           (keys.includes('left') || keys.includes('right') || keys.includes('child'));
};

// --- Helper Components ---

const ExplanationPanel = ({ description, event, opCount, iteration }) => (
    <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4 mb-6 flex items-start gap-4 backdrop-blur-md shadow-[0_0_20px_rgba(14,165,233,0.1)]"
    >
        <div className="bg-sky-500 p-2 rounded-lg text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]">
            <Info size={18} />
        </div>
        <div className="flex-grow">
            <div className="flex items-center gap-3 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${event === 'input' ? 'text-amber-400 animate-pulse' : 'text-sky-400'}`}>
                    {event === 'input' ? 'Action Required' : 'Current Action'}
                </span>
                {event && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${event === 'input' ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-sky-500 text-white'}`}>
                        {event}
                    </span>
                )}
            </div>
            <p className={`text-sm font-medium leading-relaxed ${event === 'input' ? 'text-amber-200' : 'text-zinc-100'}`}>
                {description || "Initializing algorithm state..."}
            </p>
            <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px]">
                    <Hash size={10} />
                    <span>OPS: {opCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px]">
                    <TrendingUp size={10} />
                    <span>ITER: {iteration || 0}</span>
                </div>
            </div>
        </div>
    </motion.div>
);

const GraphViewer = ({ data, path, rootVariables }) => {
    const actualData = Array.isArray(data) ? data : (data?.value || []);
    const n = actualData.length;
    
    // Determine if it's an Adjacency Matrix (n x n)
    let isMatrix = true;
    for (let i = 0; i < n; i++) {
        const row = actualData[i];
        const rowData = Array.isArray(row) ? row : (row?.value || []);
        if (rowData.length !== n) {
            isMatrix = false;
            break;
        }
    }

    const nodes = [];
    const edges = [];

    for (let i = 0; i < n; i++) {
        nodes.push(i);
        const row = actualData[i];
        const rowData = Array.isArray(row) ? row : (row?.value || []);
        
        if (isMatrix) {
            for (let j = 0; j < rowData.length; j++) {
                if (rowData[j] !== 0) { // Assumes 0 is no edge
                    edges.push({ source: i, target: j, weight: rowData[j] === 1 ? null : rowData[j] });
                }
            }
        } else {
            // Adjacency List
            for (let j = 0; j < rowData.length; j++) {
                const neighbor = rowData[j];
                // Assuming neighbor is just an integer index
                if (typeof neighbor === 'number') {
                    edges.push({ source: i, target: neighbor });
                }
            }
        }
    }

    // Identify visited nodes
    const visitedSet = new Set();
    const v = rootVariables.visited || rootVariables.vis;
    if (v) {
        const vData = Array.isArray(v) ? v : (v?.value || []);
        vData.forEach((val, idx) => {
            if (val === true || val === 1 || val === 2) visitedSet.add(idx);
        });
    }

    // Current active node in BFS/DFS
    let currentNode = null;
    if (rootVariables.u !== undefined) currentNode = rootVariables.u;
    if (rootVariables.curr !== undefined) currentNode = rootVariables.curr;
    if (rootVariables.node !== undefined) currentNode = rootVariables.node;

    const radius = Math.max(80, n * 20);
    const center = radius + 40;

    return (
        <div className="relative mx-auto my-4" style={{ width: center * 2, height: center * 2 }}>
            {nodes.map((node) => {
                const angle = (node / n) * 2 * Math.PI - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                const isVisited = visitedSet.has(node);
                const isActive = currentNode === node;

                return (
                    <motion.div
                        key={node}
                        id={`graph-${path}-node-${node}`}
                        initial={false}
                        animate={{ 
                            scale: isActive ? 1.15 : 1,
                            backgroundColor: isActive ? 'rgba(251, 191, 36, 0.2)' : (isVisited ? 'rgba(14, 165, 233, 0.6)' : 'rgba(39, 39, 42, 1)'),
                            borderColor: isActive ? '#fbbf24' : (isVisited ? '#0ea5e9' : '#52525b')
                        }}
                        className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-mono font-bold z-10 transition-all shadow-lg text-zinc-100`}
                        style={{ left: x, top: y }}
                    >
                        {node}
                    </motion.div>
                );
            })}
            {edges.map((edge, idx) => (
                <Xarrow
                    key={idx}
                    start={`graph-${path}-node-${edge.source}`}
                    end={`graph-${path}-node-${edge.target}`}
                    showHead={true}
                    color={visitedSet.has(edge.source) && visitedSet.has(edge.target) ? "#0ea5e9" : "#52525b"}
                    strokeWidth={2.5}
                    headSize={4}
                    path="straight"
                    labels={edge.weight ? <div className="bg-zinc-900 text-zinc-300 text-[9px] px-1 rounded font-mono">{edge.weight}</div> : null}
                />
            ))}
            {nodes.length === 0 && <span className="text-zinc-600 font-mono text-sm italic absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">Empty Graph</span>}
        </div>
    );
};

const PrimitiveViewer = ({ data }) => {
    if (data === null || data === undefined) return <span className="text-zinc-500 font-mono text-base italic">null</span>;
    if (typeof data === 'boolean') return <span className="text-orange-400 font-mono text-base">{String(data)}</span>;
    if (typeof data === 'string') return <span className="text-green-400 font-mono text-base">"{data}"</span>;
    return <span className="text-yellow-400 font-mono font-bold text-base bg-yellow-400/10 px-3 py-1 rounded border border-yellow-400/20">{String(data)}</span>;
};

const ArrayViewer = ({ data, rootVariables, currentEvent }) => {
    const actualData = Array.isArray(data) ? data : (data?.value || []);
    const arrayId = data?.__id ? `obj-${data.__id}` : '';

    // Find variables that act as pointers (i.e., integers that match the index)
    const pointersForIndex = (idx) => {
        const pointers = [];
        const commonPointerNames = ['i', 'j', 'k', 'l', 'r', 'm', 'left', 'right', 'mid', 'low', 'high', 'ptr', 'curr', 'start', 'end'];
        
        for (const [vName, vVal] of Object.entries(rootVariables)) {
            if (commonPointerNames.includes(vName.toLowerCase()) && typeof vVal === 'number' && vVal === idx) {
                pointers.push(vName);
            }
        }
        return pointers;
    };

    const POINTER_COLORS = {
        left: 'bg-emerald-500',
        low: 'bg-emerald-500',
        right: 'bg-rose-500',
        high: 'bg-rose-500',
        mid: 'bg-amber-500',
        m: 'bg-amber-500',
        i: 'bg-sky-500',
        j: 'bg-indigo-500',
        l: 'bg-emerald-500',
        r: 'bg-rose-500',
    };
    
    const isCompare = currentEvent === 'compare';
    const isSwap = currentEvent === 'swap';

    return (
        <div className="flex items-end gap-2 py-10 px-4 min-h-[120px]" id={arrayId}>
            <AnimatePresence mode="popLayout">
                {actualData.map((item, idx) => {
                        const pointers = pointersForIndex(idx);
                        const isTarget = item === rootVariables['target'] || item === rootVariables['key'] || item === rootVariables['x'];
                        
                        return (
                            <motion.div 
                                key={idx} 
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="flex flex-col items-center gap-1.5 relative group" 
                                id={`obj-${item?.__id || ''}`}
                            >
                                {/* Dynamic Pointer Arrows */}
                                {pointers.length > 0 && (
                                    <motion.div 
                                        layoutId={`pointers-${pointers.join('-')}`}
                                        className="absolute bottom-full mb-2 flex flex-col-reverse items-center"
                                    >
                                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-zinc-400 mt-1" />
                                        <div className="flex flex-col gap-1 items-center">
                                            {pointers.map(p => {
                                                const color = POINTER_COLORS[p.toLowerCase()] || 'bg-sky-500';
                                                return (
                                                    <motion.span 
                                                        key={p} 
                                                        layout
                                                        className={`${color} text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter`}
                                                    >
                                                        {p}
                                                    </motion.span>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                                
                                <motion.div 
                                    layout
                                    className={`w-10 h-10 flex items-center justify-center border-2 transition-all duration-300
                                        ${isTarget ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 
                                          isCompare && pointers.length > 0 ? 'border-sky-400 bg-sky-400/20 shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-105' :
                                          isSwap && pointers.length > 0 ? 'border-rose-400 bg-rose-400/20 shadow-[0_0_15px_rgba(251,113,133,0.4)] scale-110 rotate-3' :
                                          'border-zinc-600 bg-zinc-800'} 
                                        text-zinc-100 font-mono text-xs rounded hover:border-sky-500 shadow-lg relative`}
                                >
                                    {isPrimitive(item) ? String(item) : (item.__ref ? 'Ref' : 'Obj')}
                                    {item?.__ref && <Xarrow start={`obj-${item.__ref}-ptr-${idx}`} end={`obj-${item.__ref}`} showHead={true} color="#a1a1aa" />}
                                </motion.div>
                            <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900 px-1 rounded">{idx}</span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            {actualData.length === 0 && <span className="text-zinc-600 font-mono text-sm italic">Empty Array</span>}
        </div>
    );
};

const LinkedListViewer = ({ head, path, rootVariables }) => {
    // Helper to resolve __ref pointers to actual objects in the memory snapshot
    const resolveValue = (val) => {
        if (!val || !val.__ref) return val;
        
        const findInObject = (obj, targetId) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.__id === targetId) return obj;
            
            for (let k in obj) {
                if (k === '__id' || k === '__ref') continue;
                const found = findInObject(obj[k], targetId);
                if (found) return found;
            }
            return null;
        };

        for (let rootVar in rootVariables) {
            const found = findInObject(rootVariables[rootVar], val.__ref);
            if (found) return found;
        }
        return val;
    };

    const nodes = [];
    let curr = resolveValue(head);
    let limit = 50; // increased limit
    const visited = new Set();
    let cycleTargetNodeId = null;
    let cycleSourceNodeId = null;
    const pathPrefix = path.replace(/[^a-zA-Z0-9]/g, '-');

    while (curr && !isPrimitive(curr) && limit > 0) {
        const actualNode = resolveValue(curr);
        const nodeId = `ll-${pathPrefix}-${nodes.length}`;
        
        const currentId = actualNode.__id || actualNode.__addr || nodes.length;
        if (visited.has(currentId)) {
            cycleTargetNodeId = actualNode.__id ? `obj-${actualNode.__id}` : `ll-${pathPrefix}-0`;
            cycleSourceNodeId = `ll-${pathPrefix}-${nodes.length - 1}`;
            break;
        }
        
        visited.add(currentId);
        nodes.push(actualNode);
        
        const nextVal = actualNode.next !== undefined ? actualNode.next : 
                       (actualNode.Next !== undefined ? actualNode.Next : actualNode.child);
                       
        if (!nextVal || isPrimitive(nextVal)) {
            curr = null;
        } else {
            curr = nextVal;
        }
        limit--;
    }

    return (
        <div className="flex items-center gap-12 p-6 overflow-x-auto">
            {nodes.map((n, i) => {
                const nodeId = `ll-${pathPrefix}-${i}`;
                const val = n.val !== undefined ? n.val : (n.value !== undefined ? n.value : n.data);
                const prev = n.prev || n.Prev;

                return (
                    <div key={`${nodeId}-${i}`} className="relative shrink-0 flex flex-col items-center" id={n.__id ? `obj-${n.__id}` : ''}>
                        {/* Node Labels (Head/Tail) */}
                        <div className="absolute -top-8 flex gap-2">
                            {i === 0 && <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded uppercase shadow-sm">HEAD</span>}
                            {i === nodes.length - 1 && !cycleTargetNodeId && <span className="text-[9px] font-black bg-zinc-500 text-white px-2 py-0.5 rounded uppercase shadow-sm">TAIL</span>}
                        </div>

                        <div id={nodeId} className="flex border-2 border-purple-500 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.2)] rounded overflow-hidden z-10 relative hover:-translate-y-0.5 transition-transform group">
                            <div className="px-3 py-1.5 font-mono font-bold text-purple-100 border-r border-purple-500/50 flex items-center justify-center min-w-[2.5rem] bg-zinc-900/50 text-sm">
                                {val !== undefined && val !== null ? String(val) : 'null'}
                            </div>
                            <div className="flex flex-col">
                                <div className="px-2 py-1 flex items-center justify-center border-b border-purple-500/30">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" title="Next Pointer"></div>
                                </div>
                                {prev && (
                                    <div className="px-2 py-1 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-sm bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" title="Prev Pointer"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Arrow to Next Node */}
                        {i < nodes.length - 1 && (
                            <Xarrow start={nodeId} end={`ll-${pathPrefix}-${i+1}`} showHead={true} color="#c084fc" strokeWidth={2.5} path="straight" startAnchor="right" endAnchor="left" />
                        )}

                        {/* Arrow to Prev Node (for DLL) */}
                        {prev && i > 0 && (
                            <Xarrow start={nodeId} end={`ll-${pathPrefix}-${i-1}`} showHead={true} color="#38bdf8" strokeWidth={2} path="grid" startAnchor="bottom" endAnchor="bottom" dashness={true} headSize={3} />
                        )}

                        {/* Null Terminator */}
                        {i === nodes.length - 1 && !cycleTargetNodeId && (!n.next && !n.Next) && (
                            <>
                                <div id={`ll-${pathPrefix}-null`} className="absolute -right-16 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs italic bg-zinc-900 px-2 rounded">∅</div>
                                <Xarrow start={nodeId} end={`ll-${pathPrefix}-null`} showHead={true} color="#52525b" strokeWidth={2} path="straight" dashness={true} startAnchor="right" endAnchor="left" />
                            </>
                        )}
                    </div>
                );
            })}
            
            {cycleTargetNodeId && cycleSourceNodeId && (
                <>
                    <span className="text-rose-500 text-xs font-mono font-bold ml-4 border border-rose-500 px-2 py-1 rounded bg-rose-900/20">⟲ Cycle</span>
                    <Xarrow start={cycleSourceNodeId} end={cycleTargetNodeId} showHead={true} color="#f43f5e" strokeWidth={2} dashness={true} path="grid" />
                </>
            )}
            {limit === 0 && <span className="text-zinc-500 text-xs ml-4">(Truncated)</span>}
        </div>
    );
};

const TreeViewer = ({ node, path, rootVariables }) => {
    if (!node || isPrimitive(node)) return null;

    const nodeId = `tree-${path}`;
    const leftChild = node.left !== undefined ? node.left : (node.Left || node.child);
    const rightChild = node.right !== undefined ? node.right : node.Right;
    const val = node.val !== undefined ? node.val : (node.value !== undefined ? node.value : node.data);
    
    // Visited heuristic
    const visitedSet = new Set();
    const v = rootVariables.visited || rootVariables.vis;
    if (v && isArray(v)) {
        const vData = v.value || v;
        vData.forEach(item => visitedSet.add(item));
    }
    const isVisited = visitedSet.has(val) || (rootVariables.curr === val) || (rootVariables.node?.val === val);

    return (
        <div className="flex flex-col items-center gap-12 py-4" id={node.__id ? `obj-${node.__id}` : ''}>
            <motion.div 
                layout
                id={nodeId} 
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono font-bold transition-all duration-500 z-10 text-xs
                    ${isVisited ? 'border-amber-400 bg-amber-400/20 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-110' : 
                                  'border-emerald-500 bg-emerald-900/40 text-emerald-100'}`}
                title={`Tree Node: ${val}`}
            >
                {val !== undefined && val !== null ? String(val) : 'null'}
            </motion.div>
            
            <div className="flex gap-4 sm:gap-16 justify-center">
                {leftChild && !isPrimitive(leftChild) && (
                    <div className="flex flex-col items-center relative">
                        <TreeViewer node={leftChild} path={`${path}-L`} rootVariables={rootVariables} />
                        <Xarrow 
                            start={nodeId} 
                            end={`tree-${path}-L`} 
                            showHead={true} 
                            color={isVisited ? "#fbbf24" : "#34d399"} 
                            strokeWidth={2} 
                            path="straight" 
                            startAnchor="bottom" 
                            endAnchor="top" 
                        />
                    </div>
                )}
                {rightChild && !isPrimitive(rightChild) && (
                    <div className="flex flex-col items-center relative">
                        <TreeViewer node={rightChild} path={`${path}-R`} rootVariables={rootVariables} />
                        <Xarrow 
                            start={nodeId} 
                            end={`tree-${path}-R`} 
                            showHead={true} 
                            color={isVisited ? "#fbbf24" : "#34d399"} 
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
             {Object.entries(data).map(([k, v], idx) => {
                  if (k === '__id') return null;
                  return (
                       <div key={`${path}-${k}-${idx}`} className="flex flex-col mb-2 last:mb-0">
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


const DataDispatcher = ({ data, path, rootVariables, currentEvent }) => {
    if (isPrimitive(data)) {
        return <PrimitiveViewer data={data} />;
    }
    if (data.__ref !== undefined) {
        // Pointer mapping! Graph reference visually.
        return (
            <div className="relative inline-flex flex-col items-center">
                <div id={`ptr-${path}`} className="px-3 py-1 bg-zinc-800 border-2 border-zinc-600 rounded-lg text-[10px] font-mono text-zinc-300 shadow-md">
                    Ptr: {data.address || '0x...'}
                </div>
                <Xarrow start={`ptr-${path}`} end={`obj-${data.__ref}`} showHead={true} color="#38bdf8" strokeWidth={2} dashness={true} headSize={4} />
            </div>
        );
    }
    if (isArray(data)) {
        const pathLower = path.toLowerCase();
        const isGraph = pathLower === 'graph' || pathLower === 'adj' || pathLower === 'matrix' || pathLower === 'edges';
        const actualData = Array.isArray(data) ? data : (data?.value || []);
        if (isGraph && actualData.length > 0) {
            const firstElement = actualData[0];
            if (isArray(firstElement)) {
                return <GraphViewer data={actualData} path={path} rootVariables={rootVariables} currentEvent={currentEvent} />;
            }
        }
        return <ArrayViewer data={data} rootVariables={rootVariables} currentEvent={currentEvent} />;
    }
    if (isTreeNode(data)) {
        return <TreeViewer node={data} path={path} rootVariables={rootVariables} currentEvent={currentEvent} />;
    }
    if (isLinkedListNode(data, rootVariables)) {
        return <LinkedListViewer head={data} path={path} rootVariables={rootVariables} />;
    }
    return <ObjectViewer data={data} path={path} rootVariables={rootVariables} />;
};


// --- Main Section ---
const VisualizerSection = ({
    stateList = [], currentStateIndex = 0, setCurrentStateIndex,
    isPlaying, setIsPlaying, playbackSpeed, setPlaybackSpeed, onClose
}) => {
    const currentState = stateList[currentStateIndex] || { variables: {} };
    const variables = currentState.variables || {};

    return (
        <div className="flex flex-col h-full bg-[#050505] text-zinc-100 select-none font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-900 bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
                    <span className="text-[11px] lg:text-[13px] font-bold text-zinc-400 uppercase tracking-[0.2em]">DSA Visualizer</span>
                </div>
                <button onClick={onClose} className="hover:bg-zinc-800 p-1 rounded transition-colors text-zinc-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {/* Render Area wrapped in Xwrapper for arrows */}
            <Xwrapper>
            <div className="flex-grow overflow-auto p-4 sm:p-6 pb-32 space-y-4 sm:space-y-6 custom-scrollbar relative">
                    <div className="flex-grow">
                        <ExplanationPanel 
                            description={currentState.description || "Preparing algorithm execution..."}
                            event={currentState.event}
                            opCount={currentState.opCount}
                            iteration={currentState.iteration}
                        />
                        
                        {Object.keys(variables).length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-900 rounded-xl mt-4">
                                 <Database size={24} className="mb-2 opacity-20" />
                                 <p className="text-[10px] font-mono tracking-tight uppercase opacity-40">Scanning memory for variables...</p>
                            </div>
                        ) : (
                            Object.entries(variables).map(([name, value], idx) => {
                                // Optionally hide internal system variables
                                if (name.startsWith('__')) return null;

                                return (
                                    <div key={`${name}-${idx}`} className="animate-in fade-in slide-in-from-bottom-2 duration-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/80 mb-3 backdrop-blur-sm relative shadow-lg overflow-x-auto">
                                         <div className="flex items-center gap-2 mb-3 bg-zinc-950 inline-flex px-1.5 py-1 rounded border border-zinc-800 shadow-sm">
                                             <div className="h-1 w-1 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]" />
                                             <span className="text-[9px] font-bold text-zinc-100 font-mono">{name}</span>
                                         </div>
                                        
                                        <div className="pl-2">
                                            <DataDispatcher data={value} path={name} rootVariables={variables} currentEvent={currentState.event} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
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
                    <div className="flex flex-col sm:flex-row items-center justify-between text-zinc-500 font-mono text-sm gap-4 sm:gap-0 mt-4 sm:mt-0">
                        <span className="bg-zinc-900 px-3 py-1.5 rounded w-full sm:w-auto text-center lg:text-xs">STEP {stateList.length === 0 ? 0 : currentStateIndex + 1} / {stateList.length}</span>
                        <div className="flex items-center gap-4 text-zinc-400 w-full sm:w-auto justify-center">
                            <button onClick={() => setCurrentStateIndex(Math.max(0, currentStateIndex - 1))} className="hover:text-sky-500 transition-colors p-2"><SkipBack size={16} /></button>
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)} 
                                className="bg-sky-600 hover:bg-sky-500 p-4 rounded-full transition-all shadow-[0_0_12px_rgba(14,165,233,0.4)] hover:shadow-[0_0_15px_rgba(14,165,233,0.6)] hover:scale-105 active:scale-95 mx-2"
                            >
                                {isPlaying ? <Pause size={20} fill="white" className="text-white"/> : <Play size={20} fill="white" className="text-white"/>}
                            </button>
                            <button onClick={() => setCurrentStateIndex(Math.min(stateList.length - 1, currentStateIndex + 1))} className="hover:text-sky-500 transition-colors p-2"><SkipForward size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Speed</span>
                            <select 
                                value={playbackSpeed}
                                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                                className="bg-zinc-800 text-zinc-200 text-xs font-mono border-none outline-none rounded p-1"
                            >
                                <option value={0.5}>0.5x</option>
                                <option value={1}>1.0x</option>
                                <option value={2}>2.0x</option>
                                <option value={4}>4.0x</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualizerSection;