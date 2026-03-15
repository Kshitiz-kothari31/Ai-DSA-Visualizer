import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function VisualizerSection({ stateList, currentStateIndex, onClose }) {
    // stateList will contain the history of our "array" or data structure
    const currentState = stateList[currentStateIndex] || [];

    return (
        <div className="h-full bg-black flex flex-col border-l border-[#1f1f1f] relative">
            <div className="px-4 py-3 bg-[#0a0a0a] text-sm font-bold text-[#3b82f6] uppercase tracking-widest border-b border-[#1f1f1f] flex justify-between items-center">
                <span>Visualizer Section</span>
                <div className="flex items-center space-x-3">
                    {stateList.length > 0 && (
                        <span className="text-xs text-gray-500">
                            Step {currentStateIndex + 1} of {stateList.length}
                        </span>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-grow p-8 flex items-end justify-center space-x-2 overflow-hidden">
                <AnimatePresence>
                    {currentState.map((val, idx) => (
                        <motion.div
                            layout
                            key={val.id} // use unique id for proper layout animation swap
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="w-12 rounded-t-lg flex items-end justify-center pb-2 text-white font-mono font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] border-t border-white/10"
                            style={{
                                height: `${val.value * 3}px`, 
                                minHeight: '30px',
                                background: 'linear-gradient(to top, #3b82f6, #8b5cf6)'
                            }}
                        >
                            {val.value}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            {stateList.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                    Click "Visualize" to see the magic
                </div>
            )}
        </div>
    );
}
