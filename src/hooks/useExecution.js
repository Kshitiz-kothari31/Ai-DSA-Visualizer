import { useState, useCallback, useEffect, useRef } from 'react';
import { instrumentCode, executeInstrumented } from '../utils/interceptor';
import { transpileToVisualJS } from '../utils/LanguageTranspiler';

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);
    
    const inputResolver = useRef(null);

    const requestInputFromUI = useCallback(() => {
        return new Promise((resolve) => {
            inputResolver.current = resolve;
        });
    }, []);

    const sendInput = useCallback((input) => {
        if (inputResolver.current) {
            inputResolver.current(input);
            inputResolver.current = null;
        }
        if (import.meta.hot) {
            import.meta.hot.send('terminal:input', { input });
        }
    }, []);

    const executeShellCommand = useCallback((command) => {
        if (!command.trim()) return;
        setIsRunning(true);
        setOutput(prev => [...prev, `\n> ${command}`]);
        if (import.meta.hot) {
            import.meta.hot.send('terminal:execute-command', { command });
        } else {
            setOutput(prev => [...prev, `Terminal requires a Vite Dev Server.`]);
            setIsRunning(false);
        }
    }, []);

    const clearOutput = useCallback(() => setOutput([]), []);

    /**
     * Helper to perform a deep clone of the execution state.
     * This ensures that snapshots of objects/arrays don't change 
     * as the code continues to run.
     */
    const deepClone = (obj) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            // Handle circular references if they exist in the user's data
            return { ...obj }; 
        }
    };

    const executeCode = useCallback(async (code, language = 'javascript', mode = 'visualize') => {
        setIsRunning(true);
        setOutput([]);
        setStateList([]);

        if (mode === 'visualize') {
            try {
                setOutput([`Initializing Universal Data Engine...`]);

                // 1. BRIDGE: Transpile
                const jsCompatibleCode = transpileToVisualJS(code, language);

                // 2. INSTRUMENT: Inject tracking hooks
                const { instrumented, varsToTrack } = instrumentCode(jsCompatibleCode);

                // 3. EXECUTE
                const frames = await executeInstrumented(
                    { instrumented, varsToTrack }, 
                    {}, 
                    requestInputFromUI
                );

                // 4. TRANSFORM: Universal Mapping
                const transformedStates = frames.map((frame) => {
                    const state = frame.state || {};
                    const logs = state.__logs || [];
                    
                    const variablesSnapshot = {};

                    // Instead of filtering for numbers/strings, we take EVERYTHING
                    Object.entries(state).forEach(([key, val]) => {
                        if (key === '__logs') return;

                        // Deep clone the value so that future mutations 
                        // don't overwrite this step's history
                        variablesSnapshot[key] = deepClone(val);
                    });

                    if (logs.length > 0) setOutput(logs);

                    return {
                        variables: variablesSnapshot,
                        line: frame.line
                    };
                });

                setStateList(transformedStates);
                setOutput(prev => [...prev, `Visualization ready: ${transformedStates.length} states captured.`]);

            } catch (err) {
                setOutput(prev => [...prev, `Execution Error: ${err.message}`]);
                console.error('Execution Failed:', err);
            } finally {
                setIsRunning(false);
            }
        } else {
            // MODE: 'run'
            if (import.meta.hot) {
                setOutput([`Running terminal for ${language}...`]);
                import.meta.hot.send('terminal:run', { code, language });
            } else {
                setOutput(['Terminal requires a Vite Dev Server.']);
                setIsRunning(false);
            }
        }
    }, [requestInputFromUI]);

    // Terminal listeners
    useEffect(() => {
        if (import.meta.hot) {
            const handleOutput = ({ data }) => {
                const newLines = data.split('\n');
                setOutput(prev => [...prev, ...newLines.filter(l => l !== '')]);
            };
            const handleExit = ({ code }) => {
                setIsRunning(false);
                if (code !== undefined) setOutput(prev => [...prev, `Process exited with code ${code}`]);
            };

            import.meta.hot.on('terminal:output', handleOutput);
            import.meta.hot.on('terminal:exit', handleExit);
            return () => {
                import.meta.hot.off('terminal:output', handleOutput);
                import.meta.hot.off('terminal:exit', handleExit);
            };
        }
    }, []);

    return { isRunning, output, stateList, executeCode, sendInput, executeShellCommand, clearOutput };
}