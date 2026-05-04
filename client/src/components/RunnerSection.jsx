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
            if (isRunning) {
                onInput(inputValue);
            } else if (inputValue.trim() !== '') {
                onShellCommand && onShellCommand(inputValue);
            }
            setInputValue('');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0c0c0c] border-t border-[#1f1f1f] shadow-2xl font-mono">
            {/* Terminal Header */}
            <div className="px-4 py-1.5 bg-[#121212] flex items-center justify-between border-b border-[#1f1f1f]">
                <div className="flex items-center space-x-2">
                    <Terminal className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Terminal</span>
                    {isRunning && (
                        <div className="flex items-center gap-1.5 ml-4">
                            <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                            <span className="text-[10px] text-sky-400 font-bold uppercase">Active</span>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 transition-all hover:text-zinc-200">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Terminal Content */}
            <div 
                ref={scrollRef}
                className="flex-grow p-4 lg:p-5 text-[13px] lg:text-[14px] bg-[#0c0c0c] text-zinc-300 selection:bg-sky-500/30 overflow-y-auto custom-scrollbar leading-relaxed"
            >
                {output.length === 0 && !isRunning ? (
                    <div className="text-zinc-600 italic">KODA Terminal v1.0.0 - Ready for execution.</div>
                ) : (
                    output.map((line, i) => {
                        const isLastLine = i === output.length - 1;
                        if (!line && isLastLine && !isRunning) return null; // Hide trailing empty line if not running
                        const safeLine = line.replace(/\r/g, '');
                        const displayLine = safeLine === '' ? ' ' : safeLine;
                        const isError = displayLine.toLowerCase().includes('error') || displayLine.includes('fault');
                        const isSystem = displayLine.startsWith('System:');
                        
                        return (
                            <div key={`term-line-${i}`} className={`whitespace-pre-wrap break-words ${isError ? 'text-rose-400 font-medium' : isSystem ? 'text-zinc-500 italic' : ''} min-h-[1.5em]`}>
                                <span>{displayLine}</span>
                                {isLastLine && isRunning && (
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700 focus:ring-0 p-0 ml-1 inline-block min-w-[200px]"
                                        placeholder=""
                                        autoFocus
                                    />
                                )}
                            </div>
                        );
                    })
                )}
                
                {/* Shell Command Input Area (only when NOT running) */}
                {!isRunning && (
                    <div className="mt-1 flex items-center gap-2 group">
                        <span className="text-emerald-500 font-bold">KODA</span>
                        <span className="text-zinc-500">~</span>
                        <span className="text-sky-500 font-bold">$</span>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-grow bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700 focus:ring-0 p-0"
                            placeholder=""
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
