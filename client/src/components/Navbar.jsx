import React, { useRef } from 'react';
import { Play, Upload, Code2, Save, Bot, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onVisualize, onFileUpload, onAiAnalysis }) {
    const { logout } = useAuth();
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && onFileUpload) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onFileUpload(event.target.result);
            };
            reader.readAsText(file);
        }
        // reset input so the same file can be uploaded again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <nav className="w-full bg-black shadow-lg px-2 sm:px-8 h-12 sm:h-16 flex items-center justify-between border-b border-[#1f1f1f]">
            <div className="flex items-center space-x-2 sm:space-x-8">
                <div className="flex items-center space-x-1.5 sm:space-x-4">
                    <Code2 className="w-5 h-5 sm:w-8 sm:h-8 text-[#3b82f6]" />
                    <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-[0.1em]">Koda</h1>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={triggerFileInput}
                        className="flex items-center space-x-1 text-[10px] sm:text-sm text-gray-400 hover:text-[#3b82f6] font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4 sm:w-5 h-5" />
                        <span className="hidden sm:inline lg:text-base">Upload File</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                    onClick={onVisualize}
                    className="flex items-center space-x-1.5 sm:space-x-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-md text-[10px] sm:text-sm lg:text-base font-bold transition-all border border-[#333] hover:border-[#3b82f6] shadow-sm whitespace-nowrap"
                >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-[#3b82f6] text-[#3b82f6]" />
                    <span className="hidden sm:inline">Visualize</span>
                </button>
                <button
                    onClick={onAiAnalysis}
                    className="flex items-center space-x-1.5 sm:space-x-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:brightness-110 text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-md text-[10px] sm:text-sm lg:text-base font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">AI Analysis</span>
                </button>
                <div className="hidden sm:block w-px h-6 bg-gray-700 mx-1"></div>
                <button
                    onClick={logout}
                    title="Log Out"
                    className="flex items-center justify-center bg-transparent border border-red-500/50 hover:bg-red-500/20 text-red-500 p-1.5 sm:p-2.5 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>
            </div>
        </nav>
    );
}
