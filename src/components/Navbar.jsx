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
        <nav className="w-full bg-black shadow-lg px-6 py-3 flex items-center justify-between border-b border-[#1f1f1f]">
            <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                    <Code2 className="w-6 h-6 text-[#3b82f6]" />
                    <h1 className="text-xl font-bold text-white tracking-widest">Code_Visualizer+</h1>
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={triggerFileInput}
                        className="flex items-center space-x-1 text-sm text-gray-400 hover:text-[#3b82f6] font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload File</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <button
                    onClick={onVisualize}
                    className="flex items-center space-x-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-5 py-2 rounded-md font-medium transition-all border border-[#333] hover:border-[#3b82f6] shadow-sm"
                >
                    <Play className="w-4 h-4 fill-[#3b82f6] text-[#3b82f6]" />
                    <span>Visualize</span>
                </button>
                <button
                    onClick={onAiAnalysis}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:brightness-110 text-white px-5 py-2 rounded-md font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5"
                >
                    <Bot className="w-4 h-4" />
                    <span>AI Analysis</span>
                </button>
                <div className="w-px h-6 bg-gray-700 mx-2"></div>
                <button
                    onClick={logout}
                    title="Log Out"
                    className="flex items-center justify-center bg-transparent border border-red-500/50 hover:bg-red-500/20 text-red-500 p-2 rounded-md transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </nav>
    );
}
