import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import EditorSection from './components/EditorSection';
import RunnerSection from './components/RunnerSection';
import VisualizerSection from './components/VisualizerSection';
import AiAnalysisSection from './components/AiAnalysisSection';
import { useExecution } from './hooks/useExecution';
import { useAiAnalysis } from './hooks/useAiAnalysis';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CODE = `// Welcome to the DSA Visualizer!
// Write your array sorting algorithm here.

function bubbleSort(arr) {
  let n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        // Swap
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

let myArray = [50, 20, 80, 10];
bubbleSort(myArray);
`;

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const { isRunning, output, stateList, executeCode, sendInput } = useExecution();
  const { isAnalyzing, analysisData, analyzeCode } = useAiAnalysis();

  const [isRunnerVisible, setIsRunnerVisible] = useState(false);
  const [isVisualizerVisible, setIsVisualizerVisible] = useState(false);
  const [isAiAnalysisVisible, setIsAiAnalysisVisible] = useState(false);

  // For playing the animation step by step
  const [currentStateIndex, setCurrentStateIndex] = useState(0);

  // Resize Panel State
  const [sidePanelWidth, setSidePanelWidth] = useState(50); // percentage
  const [bottomPanelHeight, setBottomPanelHeight] = useState(30); // percentage
  const [isResizingSide, setIsResizingSide] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingSide) {
        const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        if (newWidth > 20 && newWidth < 80) {
          setSidePanelWidth(newWidth);
        }
      }
      if (isResizingBottom) {
        const newHeight = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        if (newHeight > 15 && newHeight < 70) {
          setBottomPanelHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSide(false);
      setIsResizingBottom(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingSide || isResizingBottom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSide, isResizingBottom]);

  useEffect(() => {
    if (stateList.length > 0) {
      setCurrentStateIndex(0);
      let step = 0;
      const interval = setInterval(() => {
        if (step < stateList.length - 1) {
          step++;
          setCurrentStateIndex(step);
        } else {
          clearInterval(interval);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [stateList]);

  const handleVisualize = () => {
    setIsAiAnalysisVisible(false); // mutually exclusive with visualizer side panel
    setIsVisualizerVisible(true);
    executeCode(code, language, 'visualize');
  };

  const handleAiAnalysis = () => {
    setIsVisualizerVisible(false); // mutually exclusive
    setIsAiAnalysisVisible(true);
    analyzeCode(code, language);
  };

  const handleRun = () => {
    setIsRunnerVisible(true);
    executeCode(code, language, 'run');
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'py': 'python',
      'pyw': 'python',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'java': 'java'
    };

    const detectLanguageFromContent = (content) => {
      if (content.includes('#include') || content.includes('using namespace')) return 'cpp';
      if (content.includes('import ') && (content.includes('def ') || content.includes('print('))) return 'python';
      if (content.includes('public class ') || content.includes('System.out.println')) return 'java';
      if (content.includes('const ') || content.includes('let ') || content.includes('function ')) return 'javascript';
      return null;
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        setCode(content);
        
        // Priority 1: Extension mapping
        if (languageMap[extension]) {
          setLanguage(languageMap[extension]);
        } 
        // Priority 2: Content heuristics (for .txt or unknown extensions)
        else {
          const detected = detectLanguageFromContent(content);
          if (detected) setLanguage(detected);
        }
      } catch (err) {
        console.error("Error processing file content:", err);
      }
    };
    
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
    };

    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-black text-white overflow-hidden">
      <Navbar onVisualize={handleVisualize} onFileUpload={handleFileUpload} onAiAnalysis={handleAiAnalysis} />

      {/* Main Layout Layer */}
      <div className="flex-grow flex w-full h-[calc(100vh-65px)] overflow-hidden">

        {/* Editor & Runner Column */}
        <div
          className="relative flex flex-col h-full border-[#1f1f1f] transition-all duration-300"
          style={{ width: (isVisualizerVisible || isAiAnalysisVisible) ? `${100 - sidePanelWidth}%` : '100%' }}
        >

          {/* Editor */}
          <div
            className="flex-grow w-full relative h-full"
            style={{ paddingBottom: isRunnerVisible ? `${bottomPanelHeight}%` : '0' }}
          >
            <EditorSection
              code={code}
              language={language}
              onLanguageChange={setLanguage}
              onChange={setCode}
              onRun={handleRun}
            />
          </div>

          {/* Bottom Sliding Runner Panel */}
          <AnimatePresence>
            {isRunnerVisible && (
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ height: `${bottomPanelHeight}%` }}
                className="absolute bottom-0 left-0 right-0 min-h-[150px] border-t-2 border-[#3b82f6] shadow-[0_-10px_20px_rgba(59,130,246,0.1)] z-10 bg-[#0a0a0a]"
              >
                {/* Resize Handle for Bottom Panel */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#3b82f6] transition-colors z-20"
                  onMouseDown={() => {
                    setIsResizingBottom(true);
                    document.body.style.cursor = 'row-resize';
                  }}
                />
                <RunnerSection 
                  output={output} 
                  isRunning={isRunning} 
                  onInput={sendInput}
                  onClose={() => setIsRunnerVisible(false)} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side Column (Visualizer or AI Analysis) */}
        <AnimatePresence>
          {(isVisualizerVisible || isAiAnalysisVisible) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${sidePanelWidth}%`, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative h-full bg-black overflow-hidden flex-shrink-0 flex"
            >
              {/* Resize Handle for Side Panel */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#3b82f6] transition-colors z-20"
                onMouseDown={() => {
                  setIsResizingSide(true);
                  document.body.style.cursor = 'col-resize';
                }}
              />
              <div className="flex-grow h-full overflow-hidden">
                {isVisualizerVisible ? (
                  <VisualizerSection
                    stateList={stateList}
                    currentStateIndex={currentStateIndex}
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
