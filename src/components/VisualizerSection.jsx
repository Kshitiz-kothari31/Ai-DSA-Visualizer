// import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { X } from 'lucide-react';

// export default function VisualizerSection({ stateList, currentStateIndex, onClose }) {
//     // Each frame now has { array, variables }
//     const frame = stateList[currentStateIndex] || { array: [], variables: {} };
//     const currentArray = frame.array || [];
//     const variables = frame.variables || {};

//     // Get all values from variables to check for highlighting
//     const highlightIndices = Object.values(variables).filter(v => typeof v === 'number');

//     return (
//         <div className="h-full bg-black flex flex-col border-l border-[#1f1f1f] relative">
//             <div className="px-4 py-3 bg-[#0a0a0a] text-sm font-bold text-[#3b82f6] uppercase tracking-widest border-b border-[#1f1f1f] flex justify-between items-center">
//                 <span>Visualizer Section</span>
//                 <div className="flex items-center space-x-3">
//                     {stateList.length > 0 && (
//                         <span className="text-xs text-gray-500">
//                             Step {currentStateIndex + 1} of {stateList.length}
//                         </span>
//                     )}
//                     {onClose && (
//                         <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors">
//                             <X className="w-4 h-4" />
//                         </button>
//                     )}
//                 </div>
//             </div>

//             <div className="flex-grow flex flex-col">
//                 {/* Main Visualization Area */}
//                 <div className="flex-grow p-8 flex items-end justify-center space-x-2 overflow-hidden border-b border-[#111]">
//                     <AnimatePresence>
//                         {Array.isArray(currentArray) && currentArray.map((val, idx) => {
//                             const isHighlighted = highlightIndices.includes(idx);
//                             return (
//                                 <motion.div
//                                     layout
//                                     key={val.id}
//                                     initial={{ opacity: 0, y: 20 }}
//                                     animate={{ 
//                                         opacity: 1, 
//                                         y: 0,
//                                         scale: isHighlighted ? 1.05 : 1
//                                     }}
//                                     exit={{ opacity: 0, scale: 0.5 }}
//                                     transition={{ type: 'spring', stiffness: 300, damping: 25 }}
//                                     className={`w-12 rounded-t-lg flex items-end justify-center pb-2 text-white font-mono font-bold shadow-lg border-t border-white/10 ${isHighlighted ? 'z-10' : ''}`}
//                                     style={{
//                                         height: `${val.value * 3}px`, 
//                                         minHeight: '30px',
//                                         background: isHighlighted 
//                                             ? 'linear-gradient(to top, #fbbf24, #f59e0b)' // Golden highlight
//                                             : 'linear-gradient(to top, #3b82f6, #8b5cf6)'   // Default blue/purple
//                                     }}
//                                 >
//                                     {val.value}
//                                 </motion.div>
//                             );
//                         })}
//                     </AnimatePresence>
//                 </div>

//                 {/* Variable Watch Panel */}
//                 {Object.keys(variables).length > 0 && (
//                     <div className="p-4 bg-[#050505] border-t border-[#1f1f1f]">
//                         <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">Variable Watch</div>
//                         <div className="flex flex-wrap gap-3">
//                             {Object.entries(variables).map(([name, value]) => (
//                                 <div key={name} className="flex items-center space-x-2 bg-[#1a1a1a] px-3 py-1.5 rounded-md border border-[#333]">
//                                     <span className="text-xs font-mono text-[#3b82f6] font-bold">{name}:</span>
//                                     <span className="text-xs font-mono text-white">{value}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {stateList.length === 0 && (
//                 <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
//                     Click "Visualize" to see the magic
//                 </div>
//             )}
//         </div>
//     );
// }



import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';

export default function VisualizerSection({ 
    stateList, 
    currentStateIndex, 
    setCurrentStateIndex, // Added prop to control index
    onClose,
    isPlaying,            // Optional: for play/pause state
    setIsPlaying          // Optional: to toggle play/pause
}) {
    const frame = stateList[currentStateIndex] || { array: [], variables: {} };
    const currentArray = frame.array || [];
    const variables = frame.variables || {};

    // Get highlighted indices from variables
    const highlightIndices = Object.values(variables).filter(v => typeof v === 'number');

    // --- Navigation Handlers ---
    const handleNext = () => {
        if (currentStateIndex < stateList.length - 1) {
            setCurrentStateIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStateIndex > 0) {
            setCurrentStateIndex(prev => prev - 1);
        }
    };

    const handleReset = () => {
        setCurrentStateIndex(0);
        if(setIsPlaying) setIsPlaying(false);
    };

    return (
        <div className="h-full bg-black flex flex-col border-l border-[#1f1f1f] relative">
            {/* Header */}
            <div className="px-4 py-3 bg-[#0a0a0a] text-sm font-bold text-[#3b82f6] uppercase tracking-widest border-b border-[#1f1f1f] flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Visualizer Engine</span>
                </div>
                <div className="flex items-center space-x-3">
                    {stateList.length > 0 && (
                        <span className="text-[10px] font-mono text-gray-500 bg-[#111] px-2 py-1 rounded border border-[#222]">
                            STEP: {String(currentStateIndex + 1).padStart(2, '0')} / {String(stateList.length).padStart(2, '0')}
                        </span>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col overflow-hidden">
                {/* Visualization Bars */}
                <div className="flex-grow p-8 flex items-end justify-center space-x-2 overflow-hidden relative">
                    <AnimatePresence mode="popLayout">
                        {Array.isArray(currentArray) && currentArray.map((val, idx) => {
                            const isHighlighted = highlightIndices.includes(idx);
                            return (
                                <motion.div
                                    layout
                                    key={val.id || idx}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ 
                                        opacity: 1, 
                                        scale: isHighlighted ? 1.1 : 1,
                                        filter: isHighlighted ? 'brightness(1.2)' : 'brightness(1)'
                                    }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className={`w-10 rounded-t-md flex items-end justify-center pb-2 text-white font-mono text-xs font-bold shadow-2xl border-t border-white/20 ${isHighlighted ? 'z-10 ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
                                    style={{
                                        height: `${Math.max(val.value * 3, 20)}px`, 
                                        background: isHighlighted 
                                            ? 'linear-gradient(to top, #f59e0b, #fbbf24)' 
                                            : 'linear-gradient(to top, #1e40af, #3b82f6)'
                                    }}
                                >
                                    {val.value}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Variable Watch Panel */}
                {Object.keys(variables).length > 0 && (
                    <div className="p-4 bg-[#050505] border-t border-[#1f1f1f]">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest flex items-center">
                            <div className="w-1 h-3 bg-[#3b82f6] mr-2" />
                            Live Variable Memory
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(variables).map(([name, value]) => (
                                <div key={name} className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-1.5 rounded border border-[#222] hover:border-[#3b82f6] transition-colors">
                                    <span className="text-[11px] font-mono text-[#3b82f6]">{name}</span>
                                    <span className="text-gray-600 text-[10px]">=</span>
                                    <span className="text-xs font-mono text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- NAVIGATION CONTROLS --- */}
                <div className="p-4 bg-[#0a0a0a] border-t border-[#1f1f1f] flex flex-col space-y-4">
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-[#3b82f6]"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStateIndex + 1) / stateList.length) * 100}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={handleReset}
                                className="p-2 hover:bg-[#1a1a1a] rounded-full text-gray-400 transition-all active:scale-90"
                                title="Reset"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={handlePrev}
                                disabled={currentStateIndex === 0}
                                className="p-2 bg-[#111] hover:bg-[#222] disabled:opacity-30 rounded-lg border border-[#333] text-white transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-3 bg-[#3b82f6] hover:bg-[#2563eb] rounded-full text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-90"
                            >
                                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>

                            <button 
                                onClick={handleNext}
                                disabled={currentStateIndex === stateList.length - 1}
                                className="p-2 bg-[#111] hover:bg-[#222] disabled:opacity-30 rounded-lg border border-[#333] text-white transition-all active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-[10px] text-gray-600 font-mono">
                            Auto-Step: 500ms
                        </div>
                    </div>
                </div>
            </div>

            {stateList.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                    <div className="p-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl flex flex-col items-center space-y-3">
                        <div className="w-10 h-10 border-2 border-dashed border-[#333] rounded-full flex items-center justify-center">
                           <Play className="w-4 h-4 text-[#333]" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Ready to Analyze</p>
                        <p className="text-gray-600 text-xs">Run a program to start visualization</p>
                    </div>
                </div>
            )}
        </div>
    );
}
