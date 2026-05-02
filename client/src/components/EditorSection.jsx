import React from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

const EditorSection = React.memo(({ code, language, onLanguageChange, onChange, onRun }) => {
    return (
        <div className="h-full w-full flex flex-col bg-black">
            <div className="px-4 py-2 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className="text-[11px] lg:text-[13px] font-bold text-zinc-400 uppercase tracking-[0.2em] hidden sm:inline">C++ Code Editor</span>
                    <span className="text-xs bg-zinc-900 border border-[#333] rounded px-3 py-1 text-[#3b82f6] font-bold">C++</span>
                </div>
                <button 
                  onClick={onRun}
                  className="flex items-center space-x-2 px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-sm lg:text-base font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run</span>
                </button>
            </div>
            <div className="flex-grow relative overflow-hidden">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={onChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: window.innerWidth < 768 ? 13 : 17,
                        lineHeight: window.innerWidth < 768 ? 18 : 24,
                        padding: { top: 10, bottom: 200 },
                        automaticLayout: true,
                        scrollBeyondLastLine: true,
                        backgroundColor: '#000000',
                        lineNumbersMinChars: 2,
                        fixedOverflowWidgets: true,
                        wordWrap: 'on',
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                        },
                        renderLineHighlight: 'all',
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true
                    }}
                />
            </div>
        </div>
    );
});

export default EditorSection;
