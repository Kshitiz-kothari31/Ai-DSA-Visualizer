import { useState, useCallback, useEffect, useRef } from 'react';
import { instrumentCode, executeInstrumented } from '../utils/interceptor';
import { transpileToVisualJS } from '../utils/LanguageTranspiler'; // Ensure path is correct

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);
    
    // This ref will store the "resolve" function of our input Promise
    const inputResolver = useRef(null);

    /**
     * Helper to create a promise that resolves when the user types in the terminal
     */
    const requestInputFromUI = useCallback(() => {
        return new Promise((resolve) => {
            inputResolver.current = resolve;
        });
    }, []);

    /**
     * Called by RunnerSection.jsx when user presses Enter
     */
    const sendInput = useCallback((input) => {
        // 1. Handle our local interactive execution (JS/Py/Cpp visualization)
        if (inputResolver.current) {
            inputResolver.current(input);
            inputResolver.current = null;
        }

        // 2. Keep your existing Vite HMR terminal support
        if (import.meta.hot) {
            import.meta.hot.send('terminal:input', { input });
        }
    }, []);

    const executeCode = useCallback(async (code, language = 'javascript', mode = 'visualize') => {
        setIsRunning(true);
        setOutput([]);
        setStateList([]);

        if (mode === 'visualize') {
            try {
                setOutput([`Preparing ${language} visualization engine...`]);

                // 1. BRIDGE: Transpile Python/C++ to "Fake JS"
                const jsCompatibleCode = transpileToVisualJS(code, language);

                // 2. INSTRUMENT: Inject tracking hooks
                const { instrumented, varsToTrack } = instrumentCode(jsCompatibleCode);

                // 3. EXECUTE: Run asynchronously to support interactive input()
                const frames = await executeInstrumented(
                    { instrumented, varsToTrack }, 
                    {}, 
                    requestInputFromUI
                );

                // 4. TRANSFORM: Convert frames into your UI's expected format
                const transformedStates = frames.map((frame) => {
                    const state = frame.state || {};
                    const logs = state.__logs || [];
                    
                    let arrayVar = [];
                    const vars = {};

                    Object.entries(state).forEach(([key, val]) => {
                        if (key === '__logs') return; // Skip internal log variable

                        if (Array.isArray(val) && (arrayVar.length === 0 || ['arr', 'myArray', 'v', 'items'].includes(key))) {
                            arrayVar = val.map((v, i) => ({
                                id: `v-${i}`,
                                value: typeof v === 'number' ? v : (v?.value ?? 0)
                            }));
                        } else if (['number', 'string', 'boolean'].includes(typeof val)) {
                            vars[key] = val;
                        }
                    });

                    // Update output terminal with any new logs found in this frame
                    if (logs.length > 0) setOutput(logs);

                    return {
                        array: arrayVar,
                        variables: vars,
                        line: frame.line
                    };
                });

                setStateList(transformedStates);
                setOutput(prev => [...prev, `Done! Generated ${transformedStates.length} steps.`]);

            } catch (err) {
                setOutput(prev => [...prev, `Error: ${err.message}`]);
                console.error('Execution Failed:', err);
            } finally {
                setIsRunning(false);
            }
        } else {
            // MODE: 'run' - Use your existing Vite Terminal logic
            if (import.meta.hot) {
                setOutput([`Starting terminal session for ${language}...`]);
                import.meta.hot.send('terminal:run', { code, language });
            } else {
                setOutput(['Interactive terminal requires Vite Dev Server.']);
                setIsRunning(false);
            }
        }
    }, [requestInputFromUI]);

    // Keep your existing HMR effect for non-visualize mode
    useEffect(() => {
        if (import.meta.hot) {
            const handleOutput = ({ data }) => {
                const newLines = data.split('\n');
                setOutput(prev => [...prev, ...newLines.filter(l => l !== '')]);
            };
            const handleExit = ({ code }) => {
                setIsRunning(false);
                if (code !== undefined) setOutput(prev => [...prev, `Process exited (${code})`]);
            };

            import.meta.hot.on('terminal:output', handleOutput);
            import.meta.hot.on('terminal:exit', handleExit);
            return () => {
                import.meta.hot.off('terminal:output', handleOutput);
                import.meta.hot.off('terminal:exit', handleExit);
            };
        }
    }, []);

    return { isRunning, output, stateList, executeCode, sendInput };
}