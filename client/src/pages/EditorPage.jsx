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
  cpp: `/* 
 *  ========================================================
 *  ██╗  ██╗ ██████╗ ██████╗  █████╗ 
 *  ██║ ██╔╝██╔═══██╗██╔══██╗██╔══██╗
 *  █████╔╝ ██║   ██║██║  ██║███████║
 *  ██╔═██╗ ██║   ██║██║  ██║██╔══██║
 *  ██║  ██╗╚██████╔╝██████╔╝██║  ██║
 *  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝
 *  ========================================================
 *  Welcome to KODA - Advanced Algorithmic Visualizer
 *  Write your C++ code below and click "Visualize" to 
 *  see it execute step-by-step.
 */

#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    // Your algorithmic journey starts here...
    
    return 0;
}`
};

export default function EditorPage() {
  // --- State ---
  const [language] = useState('cpp');
  const [code, setCode] = useState(DEFAULT_CODE.cpp);

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
  const [bottomPanelHeight, setBottomPanelHeight] = useState(40); // Left bottom (Terminal)
  const [rightBottomHeight, setRightBottomHeight] = useState(50); // Right bottom (AI Analysis)
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

  // Fix Monaco Editor scrolling/resize issues
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350); // Match transition duration
    return () => clearTimeout(timer);
  }, [sidePanelWidth, bottomPanelHeight, isRunnerVisible, isVisualizerVisible, isAiAnalysisVisible]);

  // --- Handlers ---
  // Language change removed (C++ only)

  const handleVisualize = useCallback(() => {
    if (!isDesktop) {
      setIsRunnerVisible(false);
      setIsAiAnalysisVisible(false);
    }
    setIsVisualizerVisible(true);
    executeCode(code, language, 'visualize');
  }, [code, language, executeCode, isDesktop]);

  const handleRun = useCallback(() => {
    if (!isDesktop) {
      setIsVisualizerVisible(false);
      setIsAiAnalysisVisible(false);
    }
    setIsRunnerVisible(true);
    if (clearOutput) clearOutput();
    executeCode(code, language, 'run');
  }, [code, language, executeCode, clearOutput, isDesktop]);

  const handleAiAnalysis = useCallback(() => {
    if (!isDesktop) {
      setIsVisualizerVisible(false);
      setIsRunnerVisible(false);
    }
    setIsAiAnalysisVisible(true);
    analyzeCode(code, language);
  }, [code, language, analyzeCode, isDesktop]);

  // --- Resize Handlers ---
  const handleVerticalResize = useCallback((e) => {
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;
    const containerHeight = containerRef.current.offsetHeight;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const pct = (deltaY / containerHeight) * 100;
      const newHeight = startHeight + pct;

      if (newHeight < 5) {
        setIsRunnerVisible(false);
        setBottomPanelHeight(40); // Reset for next time
      } else {
        setBottomPanelHeight(Math.min(Math.max(newHeight, 10), 80));
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [bottomPanelHeight]);

  const handleRightVerticalResize = useCallback((e) => {
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = rightBottomHeight;
    const containerHeight = containerRef.current.offsetHeight;

    const onMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const pct = (deltaY / containerHeight) * 100;
      const newHeight = startHeight + pct;

      if (newHeight < 5) {
        setIsAiAnalysisVisible(false);
        setRightBottomHeight(50); // Reset for next time
      } else {
        setRightBottomHeight(Math.min(Math.max(newHeight, 10), 80));
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightBottomHeight]);

  const handleHorizontalResize = useCallback((e) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidePanelWidth;
    const containerWidth = containerRef.current.offsetWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const pct = (deltaX / containerWidth) * 100;
      const newWidth = startWidth + pct;

      if (newWidth < 5) {
        setIsVisualizerVisible(false);
        setIsAiAnalysisVisible(false);
        setSidePanelWidth(50); // Reset for next time
      } else {
        setSidePanelWidth(Math.min(Math.max(newWidth, 20), 80));
      }
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
            height: !isDesktop && isRightPanelOpen ? '0%' : '100%',
            display: !isDesktop && isRightPanelOpen ? 'none' : 'flex'
          }}
        >
          <div className="flex-grow w-full relative min-h-0 flex flex-col">
            <div 
              className={`w-full overflow-hidden transition-all duration-300 ${
                !isDesktop && isRightPanelOpen ? 'h-0 hidden' : 
                !isDesktop && isRunnerVisible ? 'h-[30%]' : 'h-full'
              }`}
            >
              <EditorSection
                code={code}
                language={language}
                onLanguageChange={() => { }} // Disabled
                onChange={setCode}
                onRun={handleRun}
              />
            </div>

            <AnimatePresence>
              {isRunnerVisible && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: !isDesktop ? '70%' : `${bottomPanelHeight}%`, opacity: 1 }}
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
              )}
            </AnimatePresence>
          </div>
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
                height: !isDesktop ? '100%' : '100%'
              }}
              className="relative bg-[#080808] border-t lg:border-t-0 lg:border-l border-[#1f1f1f] overflow-hidden flex flex-col flex-shrink-0"
            >
              <div className="flex-grow flex flex-col min-h-0">
                {isVisualizerVisible && (
                  <div
                    className="flex-grow min-h-0 flex flex-col relative"
                    style={{ height: isAiAnalysisVisible ? `${100 - rightBottomHeight}%` : '100%' }}
                  >
                    <VisualizerSection
                      stateList={stateList}
                      currentStateIndex={currentStateIndex}
                      setCurrentStateIndex={setCurrentStateIndex}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                      onClose={() => setIsVisualizerVisible(false)}
                    />
                  </div>
                )}

                {isVisualizerVisible && isAiAnalysisVisible && (
                  <Resizer direction="vertical" onMouseDown={handleRightVerticalResize} />
                )}

                {isAiAnalysisVisible && (
                  <div
                    className="min-h-0 flex flex-col relative"
                    style={{ height: isVisualizerVisible ? `${rightBottomHeight}%` : '100%' }}
                  >
                    <AiAnalysisSection
                      analysisData={analysisData}
                      isAnalyzing={isAnalyzing}
                      onClose={() => setIsAiAnalysisVisible(false)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Bottom Bar */}
      <div className="h-14 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center px-8 shrink-0 z-[60]">
        <button
          onClick={() => {
            const nextState = !isRunnerVisible;
            if (nextState && !isDesktop) {
              setIsVisualizerVisible(false);
              setIsAiAnalysisVisible(false);
            }
            setIsRunnerVisible(nextState);
          }}
          className={`flex items-center space-x-4 text-base font-black transition-colors ${isRunnerVisible ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Terminal className="w-5 h-5" />
          <span className="uppercase tracking-[0.2em]">Terminal</span>
        </button>
      </div>
    </div>
  );
}
