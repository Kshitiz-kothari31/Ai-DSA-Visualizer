import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import EditorSection from '../components/EditorSection';
import RunnerSection from '../components/RunnerSection';
import VisualizerSection from '../components/VisualizerSection';
import AiAnalysisSection from '../components/AiAnalysisSection';
import Resizer from '../components/Resizer';
import { useExecution } from '../hooks/useExecution';
import { useAiAnalysis } from '../hooks/useAiAnalysis';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

const DEFAULT_CODE = {
  javascript: `function bubbleSort(arr) {\n  let n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];\n      }\n    }\n  }\n}\nlet myArray = [50, 20, 80, 10];\nbubbleSort(myArray);`,
  python: `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n\nmy_array = [50, 20, 80, 10]\nbubble_sort(my_array)`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> arr = {50, 20, 80, 10};\n    sort(arr.begin(), arr.end());\n    for(int x : arr) cout << x << " ";\n    return 0;\n}`
};

export default function EditorPage() {
  // --- State ---
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  
  const { isRunning, output, stateList, executeCode, sendInput, clearOutput, executeShellCommand } = useExecution();
  const { isAnalyzing, analysisData, analyzeCode } = useAiAnalysis();

  const [isRunnerVisible, setIsRunnerVisible] = useState(false);
  const [isVisualizerVisible, setIsVisualizerVisible] = useState(false);
  const [isAiAnalysisVisible, setIsAiAnalysisVisible] = useState(false);

  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef(null);
  const containerRef = useRef(null);

  // Layout states
  const [sidePanelWidth, setSidePanelWidth] = useState(50); // Percentage
  const [bottomPanelHeight, setBottomPanelHeight] = useState(40); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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

  // --- Resize Handlers ---
  const handleVerticalResize = useCallback((e) => {
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;
    const containerHeight = containerRef.current.offsetHeight;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + (deltaY / containerHeight) * 100, 10), 80);
      setBottomPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [bottomPanelHeight]);

  const handleHorizontalResize = useCallback((e) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidePanelWidth;
    const containerWidth = containerRef.current.offsetWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + (deltaX / containerWidth) * 100, 20), 80);
      setSidePanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidePanelWidth]);

  // --- Render Helpers ---
  const isRightPanelOpen = isVisualizerVisible || isAiAnalysisVisible;

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-[#050505] text-white overflow-hidden">
      <Navbar 
        onVisualize={handleVisualize} 
        onAiAnalysis={handleAiAnalysis}
        onFileUpload={(fileCode) => setCode(fileCode)} 
      />

      <div 
        ref={containerRef}
        className={`flex-grow flex flex-col lg:flex-row w-full overflow-hidden ${isResizing ? 'select-none' : ''}`}
      >
        {/* Left Column: Editor & Terminal */}
        <motion.div
          className={`relative flex flex-col border-b lg:border-b-0 lg:border-r border-[#1f1f1f] ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
          style={{ 
            width: isDesktop && isRightPanelOpen ? `${100 - sidePanelWidth}%` : '100%',
            height: !isDesktop && isRightPanelOpen ? '50%' : '100%'
          }}
        >
          <div className="flex-grow w-full relative min-h-0">
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
              <>
                <Resizer direction="vertical" onMouseDown={handleVerticalResize} />
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${bottomPanelHeight}%`, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={isResizing ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 120 }}
                  className="w-full border-t border-[#333] z-50 bg-[#0a0a0a] overflow-hidden flex-shrink-0"
                >
                  <RunnerSection 
                    output={output} 
                    isRunning={isRunning} 
                    onInput={sendInput} 
                    onShellCommand={executeShellCommand}
                    onClose={() => setIsRunnerVisible(false)} 
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>

        {isDesktop && isRightPanelOpen && (
          <Resizer direction="horizontal" onMouseDown={handleHorizontalResize} />
        )}

        {/* Right Column: Visualizer or AI */}
        <AnimatePresence mode="wait">
          {isRightPanelOpen && (
            <motion.div
              initial={{ x: isDesktop ? "100%" : 0, y: isDesktop ? 0 : "100%", opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={{ x: isDesktop ? "100%" : 0, y: isDesktop ? 0 : "100%", opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                width: isDesktop ? `${sidePanelWidth}%` : '100%',
                height: !isDesktop ? '50%' : '100%'
              }}
              className="relative bg-[#080808] border-t lg:border-t-0 lg:border-l border-[#1f1f1f] overflow-hidden flex-shrink-0"
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

      {/* Global Bottom Bar */}
      <div className="h-14 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center px-8 shrink-0 z-[60]">
          <button 
              onClick={() => setIsRunnerVisible(!isRunnerVisible)}
              className={`flex items-center space-x-4 text-base font-black transition-colors ${isRunnerVisible ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <Terminal className="w-5 h-5" />
              <span className="uppercase tracking-[0.2em]">Terminal</span>
          </button>
      </div>
    </div>
  );
}
