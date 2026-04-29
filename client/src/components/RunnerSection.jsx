import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, ChevronRight } from 'lucide-react';

export default function RunnerSection({ output = [], isRunning, onInput, onShellCommand, onClose }) {
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (inputValue.trim() === '') return;
            if (isRunning) {
                onInput(inputValue);
            } else {
                onShellCommand && onShellCommand(inputValue);
            }
            setInputValue('');
        }
    };

    return (
        <div className="h-full flex flex-col bg-black border-t border-[#1f1f1f] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="px-4 py-1.5 bg-[#0a0a0a] flex items-center justify-between border-b border-[#1f1f1f]">
                <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-[#3b82f6]" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Interactive Terminal</span>
                    {isRunning && (
                        <span className="text-sm text-[#3b82f6] font-bold animate-pulse ml-2">Running...</span>
                    )}
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#1a1a1a] rounded text-gray-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div 
                ref={scrollRef}
                className="flex-grow p-4 overflow-y-auto font-mono text-sm bg-black text-[#a1a1aa] selection:bg-[#3b82f6]/30"
            >
                {output.length === 0 && !isRunning ? (
                    <div className="text-gray-600 italic mb-2">Terminal ready. Type a command or run your code.</div>
                ) : (
                    output.map((line, i) => (
                        <div key={i} className={`mb-1 ${line.startsWith('Error:') || line.includes('Process error') ? 'text-red-500 font-bold' : ''}`}>
                            <span className="text-[#3b82f6] mr-2">›</span>
                            {line}
                        </div>
                    ))
                )}
                
                <div className="mt-2 flex items-center space-x-2 text-[#3b82f6]">
                    <ChevronRight className="w-4 h-4" />
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-grow bg-transparent border-none outline-none text-white placeholder-gray-600 focus:ring-0"
                        placeholder={isRunning ? "Type input here and press Enter..." : "Type shell command (e.g. node script.js) and press Enter..."}
                        autoFocus
                    />
                </div>
            </div>
        </div>
    );
}
