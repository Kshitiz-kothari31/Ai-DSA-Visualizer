import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import EditorSection from './components/EditorSection';
import RunnerSection from './components/RunnerSection';
import VisualizerSection from './components/VisualizerSection';
import AiAnalysisSection from './components/AiAnalysisSection';
import { useExecution } from './hooks/useExecution';
import { useAiAnalysis } from './hooks/useAiAnalysis';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CODE = {
  javascript: `function bubbleSort(arr) {\n  let n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];\n      }\n    }\n  }\n}\nlet myArray = [50, 20, 80, 10];\nbubbleSort(myArray);`,
  python: `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n\nmy_array = [50, 20, 80, 10]\nbubble_sort(my_array)`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> arr = {50, 20, 80, 10};\n    sort(arr.begin(), arr.end());\n    for(int x : arr) cout << x << " ";\n    return 0;\n}`
};

function App() {
  // --- State ---
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  
  const { isRunning, output, stateList, executeCode, sendInput, clearOutput } = useExecution();
  const { isAnalyzing, analysisData, analyzeCode } = useAiAnalysis();

  const [isRunnerVisible, setIsRunnerVisible] = useState(false);
  const [isVisualizerVisible, setIsVisualizerVisible] = useState(false);
  const [isAiAnalysisVisible, setIsAiAnalysisVisible] = useState(false);

  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef(null);

  // Layout states
  const sidePanelWidth = 45; // Percentage
  const bottomPanelHeight = 35; // Percentage

  // --- Logic & Effects ---

  // Handle Playback for Visualizer
  useEffect(() => {
    if (isPlaying && stateList?.length > 0) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentStateIndex((prev) => {
          if (prev < stateList.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 800);
    } else {
      clearInterval(playbackIntervalRef.current);
    }
    return () => clearInterval(playbackIntervalRef.current);
  }, [isPlaying, stateList]);

  // Reset visualizer when new stateList arrives
  useEffect(() => {
    if (stateList?.length > 0) {
      setCurrentStateIndex(0);
      setIsPlaying(true);
    }
  }, [stateList]);

  // --- Handlers ---
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang] || "");
  };

  const handleVisualize = useCallback(() => {
    setIsAiAnalysisVisible(false);
    setIsRunnerVisible(false);
    setIsVisualizerVisible(true);
    executeCode(code, language, 'visualize');
  }, [code, language, executeCode]);

  const handleRun = useCallback(() => {
    setIsVisualizerVisible(false);
    setIsAiAnalysisVisible(false);
    setIsRunnerVisible(true);
    if (clearOutput) clearOutput(); // Ensure fresh console
    executeCode(code, language, 'run');
  }, [code, language, executeCode, clearOutput]);

  const handleAiAnalysis = useCallback(() => {
    setIsVisualizerVisible(false);
    setIsRunnerVisible(false);
    setIsAiAnalysisVisible(true);
    analyzeCode(code, language);
  }, [code, language, analyzeCode]);

  // --- Render Helpers ---
  const isRightPanelOpen = isVisualizerVisible || isAiAnalysisVisible;

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-[#050505] text-white overflow-hidden">
      <Navbar 
        onVisualize={handleVisualize} 
        onAiAnalysis={handleAiAnalysis}
        onFileUpload={(fileCode) => setCode(fileCode)} 
      />

      <div className="flex-grow flex w-full overflow-hidden">
        {/* Left Column: Editor & Terminal */}
        <motion.div
          layout
          className="relative flex flex-col h-full border-r border-[#1f1f1f] transition-all duration-300 ease-in-out"
          style={{ width: isRightPanelOpen ? `${100 - sidePanelWidth}%` : '100%' }}
        >
          <div className="flex-grow w-full relative h-full">
            <EditorSection
              code={code}
              language={language}
              onLanguageChange={handleLanguageChange}
              onChange={setCode}
              onRun={handleRun}
            />
          </div>

          <AnimatePresence>
            {isRunnerVisible && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                style={{ height: `${bottomPanelHeight}%` }}
                className="absolute bottom-0 left-0 right-0 border-t border-[#333] z-50 bg-[#0a0a0a] shadow-2xl"
              >
                <RunnerSection 
                  output={output} 
                  isRunning={isRunning} 
                  onInput={sendInput} 
                  onClose={() => setIsRunnerVisible(false)} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Column: Visualizer or AI */}
        <AnimatePresence mode="wait">
          {isRightPanelOpen && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: `${sidePanelWidth}%` }}
              className="relative h-full bg-[#080808] border-l border-[#1f1f1f] overflow-hidden flex-shrink-0"
            >
              <div className="h-full w-full">
                {isVisualizerVisible ? (
                  <VisualizerSection
                    stateList={stateList}
                    currentStateIndex={currentStateIndex}
                    setCurrentStateIndex={setCurrentStateIndex}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    onClose={() => setIsVisualizerVisible(false)}
                  />
                ) : (
                  <AiAnalysisSection
                    analysisData={analysisData}
                    isAnalyzing={isAnalyzing}
                    onClose={() => setIsAiAnalysisVisible(false)}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;