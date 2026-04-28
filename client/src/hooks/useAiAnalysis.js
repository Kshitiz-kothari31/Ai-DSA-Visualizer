import { useState, useCallback } from 'react';

export function useAiAnalysis() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);

    const analyzeCode = useCallback(async (code, language = 'javascript') => {
        setIsAnalyzing(true);
        setAnalysisData(null);
        
        try {
            const baseUrl = import.meta.env.VITE_ENGINE_API_URL || 'http://127.0.0.1:5001';
            const response = await fetch(`${baseUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to analyze code');
            }
            
            const data = await response.json();
            setAnalysisData(data);
        } catch (error) {
            console.error('AI Analysis failed:', error);
            setAnalysisData({
                summary: `Analysis failed: ${error.message}. Please ensure the Python backend is running (python app.py).`,
                timeComplexity: 'N/A',
                spaceComplexity: 'N/A',
                chartData: []
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    return { isAnalyzing, analysisData, analyzeCode };
}
