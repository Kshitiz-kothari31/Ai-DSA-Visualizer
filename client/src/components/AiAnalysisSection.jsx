import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X, Bot, Activity, HardDrive } from 'lucide-react';

export default function AiAnalysisSection({ analysisData, isAnalyzing, onClose }) {
    const [view, setView] = useState('hub'); // 'hub', 'analysis', 'comparison'
    const [isStressTest, setIsStressTest] = useState(false);

    const formatYAxis = (tickItem) => {
        if (tickItem >= 1e9) return (tickItem / 1e9).toFixed(1) + 'B';
        if (tickItem >= 1e6) return (tickItem / 1e6).toFixed(1) + 'M';
        if (tickItem >= 1e3) return (tickItem / 1e3).toFixed(0) + 'K';
        return tickItem;
    };

    const renderHub = () => (
        <div className="min-h-full flex flex-col items-center justify-center p-4 lg:p-6 py-10 pb-60 space-y-4 lg:space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-1 mb-2">
                <Bot className="w-8 h-8 lg:w-10 lg:h-10 text-purple-500 mx-auto mb-2" />
                <h2 className="text-sm lg:text-lg font-bold text-white uppercase tracking-widest">AI Intelligence Hub</h2>
                <p className="text-zinc-500 text-[10px] lg:text-xs font-mono">Select analysis depth</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3 lg:gap-4 w-full max-w-sm px-4">
                <button 
                    onClick={() => setView('analysis')}
                    className="group relative bg-[#0a0a0a] border border-[#1f1f1f] hover:border-purple-500/50 p-3 lg:p-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] overflow-hidden text-left w-full"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 lg:gap-4">
                        <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                        <div>
                            <h3 className="text-[11px] lg:text-sm font-bold text-zinc-200">Analyze the code</h3>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-mono line-clamp-2 hidden lg:block mt-0.5">Deep dive into line-by-line complexity and performance.</p>
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => setView('comparison')}
                    className="group relative bg-[#0a0a0a] border border-[#1f1f1f] hover:border-blue-500/50 p-3 lg:p-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] overflow-hidden text-left w-full"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 lg:gap-4">
                        <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                        <div>
                            <h3 className="text-[11px] lg:text-sm font-bold text-zinc-200">Complexity Comparison</h3>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-mono line-clamp-2 hidden lg:block mt-0.5">Compare best, average, and worst case scenarios.</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderComparison = () => {
        const cases = analysisData?.cases || {
            best: { tc: 'N/A', desc: 'No analysis data available.' },
            avg: { tc: 'N/A', desc: 'No analysis data available.' },
            worst: { tc: 'N/A', desc: 'No analysis data available.' }
        };

        return (
            <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-12">
                <button 
                    onClick={() => setView('hub')}
                    className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-2 mb-4"
                >
                    ← Back to Hub
                </button>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Complexity Case Comparison</h3>
                    
                    {[
                        { label: 'Best Case', data: cases.best, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
                        { label: 'Average Case', data: cases.avg, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
                        { label: 'Worst Case', data: cases.worst, color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
                    ].map((c, idx) => (
                        <div key={idx} className={`p-6 rounded-2xl border ${c.border} ${c.bg} relative overflow-hidden group`}>
                             <div className="flex justify-between items-start mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${c.color} bg-black/50 px-2 py-1 rounded`}>{c.label}</span>
                                <span className={`text-2xl font-mono font-bold ${c.color}`}>{c.data.tc}</span>
                             </div>
                             <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                                {c.data.desc}
                             </p>
                        </div>
                    ))}
                </div>

                <div className="bg-[#0a0a0a] border border-[#1f1f1f] p-5 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Case Explanation</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed italic">
                        The "Best Case" occurs when early exit conditions are met (e.g., finding an element at the first position), 
                        while the "Worst Case" assumes the algorithm must process the entire input size (N).
                    </p>
                </div>
            </div>
        );
    };

    const renderAnalysis = () => {
        let insightColor = "border-gray-500/50 bg-gray-500/10 text-gray-400";
        if (analysisData?.insight) {
            if (analysisData.insight.includes("WARNING")) insightColor = "border-red-500/50 bg-red-500/10 text-red-400";
            else if (analysisData.insight.includes("GOOD")) insightColor = "border-green-500/50 bg-green-500/10 text-green-400";
            else if (analysisData.insight.includes("EXCELLENT") || analysisData.insight.includes("PERFECT")) insightColor = "border-blue-500/50 bg-blue-500/10 text-blue-400";
        }

        return (
            <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-12">
                <button 
                    onClick={() => setView('hub')}
                    className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-2 mb-4"
                >
                    ← Back to Hub
                </button>

                {/* Summary */}
                <div className="bg-[#0a0a0a] p-4 lg:p-5 rounded-lg shadow-lg border border-[#1f1f1f]">
                    <h3 className="text-xs lg:text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Algorithm Recognition</h3>
                    <p className="text-sm lg:text-base text-gray-300 leading-relaxed">
                        {analysisData.summary}
                    </p>
                </div>

                {/* Complexity Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#0a0a0a] p-4 rounded-xl shadow-lg border border-[#1f1f1f] flex flex-col items-center justify-center text-center">
                        <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-[#3b82f6] mb-2" />
                        <span className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Time Complexity</span>
                        <span className="text-xl lg:text-2xl font-bold font-mono text-white">{analysisData.timeComplexity || 'O(N)'}</span>
                    </div>
                    <div className="bg-[#0a0a0a] p-4 rounded-xl shadow-lg border border-[#1f1f1f] flex flex-col items-center justify-center text-center">
                        <HardDrive className="w-6 h-6 lg:w-8 lg:h-8 text-[#8b5cf6] mb-2" />
                        <span className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Space Complexity</span>
                        <span className="text-xl lg:text-2xl font-bold font-mono text-white">{analysisData.spaceComplexity || 'O(1)'}</span>
                    </div>
                </div>

                {/* Performance Insight */}
                {analysisData.insight && (
                    <div className={`p-4 lg:p-5 rounded-lg shadow-lg border ${insightColor} text-sm lg:text-base font-medium leading-relaxed`}>
                        {analysisData.insight}
                    </div>
                )}

                {/* Complexity Breakdown (Teacher Mode) */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-blue-400" />
                        Complexity Teacher Breakdown
                    </h3>
                    
                    <div className="space-y-3">
                        {[...(analysisData.timeBreakdown || []), ...(analysisData.spaceBreakdown || [])].map((item, idx) => (
                            <div key={idx} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3 flex items-start space-x-3 hover:border-zinc-700 transition-colors">
                                <div className="mt-1 flex-shrink-0">
                                    {item.line ? (
                                        <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-500/30">
                                            L{item.line}
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-zinc-800 text-zinc-500 flex items-center justify-center">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{item.step}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">{item.impact}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-[#0a0a0a] p-4 rounded-lg shadow-lg border border-[#1f1f1f]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Theoretical Performance
                        </h3>
                        <button 
                            onClick={() => setIsStressTest(!isStressTest)}
                            className={`px-4 py-2 text-sm font-bold rounded uppercase tracking-wider transition-colors ${isStressTest ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}
                        >
                            {isStressTest ? 'Stress Test ON' : 'Stress Test OFF'}
                        </button>
                    </div>
                    <div className="h-[300px] lg:h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={isStressTest ? analysisData.stressChartData : analysisData.chartData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                                <XAxis 
                                    dataKey="n" 
                                    stroke="#4b5563" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    label={{ value: 'Size (n)', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#4b5563' }}
                                />
                                <YAxis 
                                    stroke="#4b5563" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={formatYAxis}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #1f1f1f' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Legend iconType="circle" />
                                <Line 
                                    type="monotone" 
                                    dataKey="time" 
                                    name="Estimated Steps" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#000' }}
                                    activeDot={{ r: 6 }} 
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-grow bg-black flex flex-col border-l border-[#1f1f1f] min-h-0">
            <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#1f1f1f] flex justify-between items-center">
                <div className="flex items-center space-x-2 text-zinc-400">
                    <Bot className="w-4 h-4 text-[#8b5cf6]" />
                    <span className="text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.2em]">AI Algorithm Analysis</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 hover:bg-[#1a1a1a] rounded text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            <div className="flex-grow p-4 lg:p-6 overflow-y-auto custom-scrollbar">
                {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <Bot className="w-16 h-16 text-purple-400 animate-pulse" />
                        <p className="animate-pulse text-base">Analyzing algorithm logic and complexity...</p>
                    </div>
                ) : !analysisData ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic">
                        Click "AI Analysis" to let AI interpret your code.
                    </div>
                ) : (
                    <>
                        {view === 'hub' && renderHub()}
                        {view === 'analysis' && renderAnalysis()}
                        {view === 'comparison' && renderComparison()}
                    </>
                )}
            </div>
        </div>
    );
}
