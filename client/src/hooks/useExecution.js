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
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        let baseUrl = import.meta.env.VITE_ENGINE_API_URL || 'http://127.0.0.1:5001';
        baseUrl = baseUrl.replace(/\/$/, "");

        console.log(`[Socket] Connecting to: ${baseUrl}`);

        const newSocket = io(baseUrl, {
            transports: ['websocket'],
            reconnection: true,
            forceNew: true
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('[Socket] Connected successfully!');
        });

        newSocket.on('terminal:output', ({ data }) => {
            const incoming = data.split('\n');
            setOutput(prev => {
                const next = [...prev];
                if (next.length === 0) {
                    next.push("");
                }

                // Strings are primitives, so this perfectly bypasses React Strict Mode double-mutation!
                next[next.length - 1] += incoming[0];

                for (let i = 1; i < incoming.length; i++) {
                    next.push(incoming[i]);
                }
                return next;
            });
        });


        newSocket.on('terminal:exit', ({ code }) => {
            setIsRunning(false);
            if (code !== undefined) {
                setOutput(prev => [...prev, `\nProcess exited with code ${code}`]);
            }
        });


        newSocket.on('terminal:visualize-frame', (frame) => {
            if (frame.variables) {
                setStateList(prev => [...prev, frame]);
            }
        });

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
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

        // Echo the user's input to the terminal to match native behavior
        setOutput(prev => {
            const next = [...prev];
            if (next.length === 0) next.push("");
            next[next.length - 1] += input + '\n';
            next.push(""); // Prepare next line
            return next;
        });

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

    const lastRequestTime = useRef(0);

    const executeCode = useCallback((code, language = 'cpp') => {
        const now = Date.now();
        if (now - lastRequestTime.current < 800) return; // Prevent double-triggers
        lastRequestTime.current = now;

        setIsRunning(true);
        setOutput([""]);
        if (socketRef.current) {
            socketRef.current.emit('terminal:run', { code, language, mode: 'run' });
        }
    }, []);

    const visualizeCode = useCallback((code, language = 'cpp') => {
        const now = Date.now();
        if (now - lastRequestTime.current < 800) return; // Prevent double-triggers
        lastRequestTime.current = now;

        setIsRunning(true);
        setStateList([]);
        setOutput(["System: Initializing Visualization Bridge..."]);
        
        if (socketRef.current) {
            socketRef.current.emit('terminal:run', { code, language, mode: 'visualize' });
        }
    }, []);

    return { isRunning, output, stateList, executeCode, visualizeCode, sendInput, executeShellCommand, clearOutput };
}