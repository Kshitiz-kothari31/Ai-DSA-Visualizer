import { useState, useCallback, useEffect, useRef } from 'react';
import { instrumentCode, executeInstrumented } from '../utils/interceptor';
import { transpileToVisualJS } from '../utils/LanguageTranspiler';
import { io } from 'socket.io-client';

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);
    
    const inputResolver = useRef(null);
    const socketRef = useRef(null);

    // Initialize Socket for Production
    useEffect(() => {
        if (!import.meta.hot || import.meta.env.PROD) {
            const baseUrl = import.meta.env.VITE_ENGINE_API_URL || 'http://127.0.0.1:5001';
            socketRef.current = io(baseUrl);

            socketRef.current.on('terminal:output', ({ data }) => {
                const newLines = data.split('\n');
                setOutput(prev => [...prev, ...newLines.filter(l => l !== '')]);
            });

            socketRef.current.on('terminal:exit', ({ code }) => {
                setIsRunning(false);
                if (code !== undefined) setOutput(prev => [...prev, `Process exited with code ${code}`]);
            });

            socketRef.current.on('terminal:visualize-frame', (frame) => {
                setStateList(prev => [...prev, {
                    variables: takeSnapshot(frame.variables),
                    line: frame.line
                }]);
            });

            return () => {
                if (socketRef.current) socketRef.current.disconnect();
            };
        }
    }, []);

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
        
        if (socketRef.current) {
            socketRef.current.emit('terminal:input', { input });
        } else if (import.meta.hot) {
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
     * Helper to perform an ID-based clone of the execution state.
     * This preserves pointers and circular references!
     */
    const takeSnapshot = (variablesRoot) => {
        if (!variablesRoot) return {};
        const memory = new Map();
        let idCounter = 1;

        const cloneDeep = (val) => {
            if (val === null || val === undefined) return val;
            if (typeof val !== 'object') return val;
            
            if (memory.has(val)) {
                return { __ref: memory.get(val) };
            }

            const id = idCounter++;
            memory.set(val, id);

            if (Array.isArray(val)) {
                const arr = [];
                val.forEach((item, i) => arr[i] = cloneDeep(item));
                arr.__id = id;
                return arr;
            }

            const obj = { __id: id };
            for (let key in val) {
                if (key !== '__id') obj[key] = cloneDeep(val[key]);
            }
            return obj;
        };

        const snapshot = {};
        for (let k in variablesRoot) {
            if (k === '__logs') continue;
            // clone each root variable tracking IDs
            snapshot[k] = cloneDeep(variablesRoot[k]);
        }
        return snapshot;
    };

    const executeCode = useCallback(async (code, language = 'javascript', mode = 'visualize') => {
        setIsRunning(true);
        setOutput([]);
        setStateList([]);

        if (mode === 'visualize' && language === 'javascript') {
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
                    
                    // Track everything via object graph mapping
                    const variablesSnapshot = takeSnapshot(state.variables || state);

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
        } else if (mode === 'visualize') {
            // New path for other languages: Native Tracing on the server
            if (socketRef.current) {
                setOutput([`Running Native Tracing for ${language}...`]);
                socketRef.current.emit('terminal:run', { code, language, mode: 'visualize' });
            } else if (import.meta.hot) {
                setOutput([`Running Native Tracing for ${language}...`]);
                import.meta.hot.send('terminal:run', { code, language, mode: 'visualize' });
            } else {
                setOutput(['Native Tracing requires a connected backend or Vite Dev Server.']);
                setIsRunning(false);
            }
        } else {
            // MODE: 'run'
            if (socketRef.current) {
                setOutput([`Running remote terminal for ${language}...`]);
                socketRef.current.emit('terminal:run', { code, language, mode: 'run' });
            } else if (import.meta.hot) {
                setOutput([`Running terminal for ${language}...`]);
                import.meta.hot.send('terminal:run', { code, language, mode: 'run' });
            } else {
                setOutput(['Terminal requires a connected backend or Vite Dev Server.']);
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
            const handleVisualizeFrame = (frame) => {
                // Real-time frame capture from native processes
                setStateList(prev => [...prev, {
                    variables: takeSnapshot(frame.variables),
                    line: frame.line
                }]);
            };

            import.meta.hot.on('terminal:output', handleOutput);
            import.meta.hot.on('terminal:exit', handleExit);
            import.meta.hot.on('terminal:visualize-frame', handleVisualizeFrame);

            return () => {
                import.meta.hot.off('terminal:output', handleOutput);
                import.meta.hot.off('terminal:exit', handleExit);
                import.meta.hot.off('terminal:visualize-frame', handleVisualizeFrame);
            };
        }
    }, []);

    return { isRunning, output, stateList, executeCode, sendInput, executeShellCommand, clearOutput };
}