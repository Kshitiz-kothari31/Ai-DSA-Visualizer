import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X, Bot, Activity, HardDrive } from 'lucide-react';

export default function AiAnalysisSection({ analysisData, isAnalyzing, onClose }) {
    const [isStressTest, setIsStressTest] = useState(false);

    const formatYAxis = (tickItem) => {
        if (tickItem >= 1e9) return (tickItem / 1e9).toFixed(1) + 'B';
        if (tickItem >= 1e6) return (tickItem / 1e6).toFixed(1) + 'M';
        if (tickItem >= 1e3) return (tickItem / 1e3).toFixed(0) + 'K';
        return tickItem;
    };

    let insightColor = "border-gray-500/50 bg-gray-500/10 text-gray-400";
    if (analysisData?.insight) {
        if (analysisData.insight.includes("WARNING")) insightColor = "border-red-500/50 bg-red-500/10 text-red-400";
        else if (analysisData.insight.includes("GOOD")) insightColor = "border-green-500/50 bg-green-500/10 text-green-400";
        else if (analysisData.insight.includes("EXCELLENT") || analysisData.insight.includes("PERFECT")) insightColor = "border-blue-500/50 bg-blue-500/10 text-blue-400";
    }

    return (
        <div className="h-full bg-black flex flex-col border-l border-[#1f1f1f]">
            <div className="px-5 py-4 bg-[#0a0a0a] text-base font-bold text-[#3b82f6] uppercase tracking-widest border-b border-[#1f1f1f] flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Bot className="w-5 h-5 text-[#8b5cf6]" />
                    <span>AI Algorithm Analysis</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 hover:bg-[#1a1a1a] rounded text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            <div className="flex-grow p-6 overflow-y-auto">
                {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <Bot className="w-16 h-16 text-purple-400 animate-pulse" />
                        <p className="animate-pulse text-base">Analyzing algorithm logic and complexity...</p>
                    </div>
                ) : !analysisData ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic">
                        Click "API Analysis" to let AI interpret your code.
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Summary */}
                        <div className="bg-[#0a0a0a] p-5 rounded-lg shadow-lg border border-[#1f1f1f]">
                            <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest mb-3">Algorithm Recognition</h3>
                            <p className="text-base text-gray-300 leading-relaxed">
                                {analysisData.summary}
                            </p>
                        </div>

                        {/* Complexity Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0a0a0a] p-4 rounded-xl shadow-lg border border-[#1f1f1f] flex flex-col items-center justify-center text-center">
                                <Activity className="w-8 h-8 text-[#3b82f6] mb-2" />
                                <span className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Time Complexity</span>
                                <span className="text-2xl font-bold font-mono text-white">{analysisData.timeComplexity || 'O(N)'}</span>
                            </div>
                            <div className="bg-[#0a0a0a] p-4 rounded-xl shadow-lg border border-[#1f1f1f] flex flex-col items-center justify-center text-center">
                                <HardDrive className="w-8 h-8 text-[#8b5cf6] mb-2" />
                                <span className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Space Complexity</span>
                                <span className="text-2xl font-bold font-mono text-white">{analysisData.spaceComplexity || 'O(1)'}</span>
                            </div>
                        </div>

                        {/* Performance Insight */}
                        {analysisData.insight && (
                            <div className={`p-5 rounded-lg shadow-lg border ${insightColor} text-base font-medium leading-relaxed`}>
                                {analysisData.insight}
                            </div>
                        )}

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
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={isStressTest ? analysisData.stressChartData : analysisData.chartData}
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                                        {/* Changed dataKey to "n" */}
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
                                        {/* Changed dataKey to "time" */}
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
                )}
            </div>
        </div>
    );
}
