import { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);
    
    const inputResolver = useRef(null);
    const socketRef = useRef(null);

    // Initialize Socket
    useEffect(() => {
        let baseUrl = import.meta.env.VITE_ENGINE_API_URL || 'http://127.0.0.1:5001';
        // Cleanup: Remove trailing slash if present
        baseUrl = baseUrl.replace(/\/$/, "");
        
        console.log(`[Socket] Connecting to: ${baseUrl}`);

        socketRef.current = io(baseUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true
        });

        socketRef.current.on('connect', () => {
            console.log('[Socket] Connected successfully!');
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
            setOutput(prev => [...prev, `Backend Connection Error: ${err.message}. Check if VITE_ENGINE_API_URL is set correctly.`]);
        });

        socketRef.current.on('terminal:output', ({ data }) => {
            setOutput(prev => {
                if (prev.length === 0) return [data];
                
                // If the data contains newlines, split it and append
                if (data.includes('\n')) {
                    const parts = data.split('\n');
                    const next = [...prev];
                    // Append the first part to the last line
                    next[next.length - 1] += parts[0];
                    // Add subsequent parts as new lines
                    for (let i = 1; i < parts.length; i++) {
                        if (parts[i] !== '' || i < parts.length - 1) {
                            next.push(parts[i]);
                        }
                    }
                    return next;
                } else {
                    // Just append to the last line
                    const next = [...prev];
                    next[next.length - 1] += data;
                    return next;
                }
            });
        });

        socketRef.current.on('terminal:exit', ({ code }) => {
            setIsRunning(false);
            if (code !== undefined) setOutput(prev => [...prev, `Process exited with code ${code}`]);
        });

        socketRef.current.on('terminal:visualize-frame', (frame) => {
            setStateList(prev => [...prev, {
                variables: frame.variables,
                line: frame.line
            }]);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
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

    const executeCode = useCallback(async (code, language = 'cpp', mode = 'visualize') => {
        setIsRunning(true);
        setOutput([]);
        setStateList([]);

        // Native Tracing for C++
        if (socketRef.current) {
            setOutput([`Initializing C++ Native Tracer...`]);
            socketRef.current.emit('terminal:run', { code, language: 'cpp', mode });
        } else if (import.meta.hot) {
            setOutput([`Initializing C++ Native Tracer...`]);
            import.meta.hot.send('terminal:run', { code, language: 'cpp', mode });
        } else {
            setOutput(['Terminal requires a connected backend or Vite Dev Server.']);
            setIsRunning(false);
        }
    }, []);

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
                    variables: frame.variables, // Robust tracers already provided snapshots
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