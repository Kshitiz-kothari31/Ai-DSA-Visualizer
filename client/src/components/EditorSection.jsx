import React from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

export default function EditorSection({ code, language, onLanguageChange, onChange, onRun }) {
    return (
        <div className="h-full w-full flex flex-col bg-black">
            <div className="px-4 py-2 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Code Editor</span>
                    <select 
                        value={language} 
                        onChange={(e) => onLanguageChange(e.target.value)}
                        className="text-xs bg-black border border-[#333] rounded px-2 py-1 outline-none text-[#3b82f6] font-medium"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                    </select>
                </div>
                <button 
                  onClick={onRun}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-sm font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run</span>
                </button>
            </div>
            <div className="flex-grow relative">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={onChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 16,
                        padding: { top: 20 },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        backgroundColor: '#000000',
                        lineNumbersMinChars: 3
                    }}
                />
            </div>
        </div>
    );
}
