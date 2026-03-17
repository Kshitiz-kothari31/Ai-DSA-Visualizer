import { useState, useCallback, useEffect } from 'react';
import { instrumentCode, executeInstrumented } from '../utils/interceptor';

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);

    useEffect(() => {
        if (import.meta.hot) {
            const handleOutput = ({ data }) => {
                // Split and append to output
                const newLines = data.split('\n');
                setOutput(prev => [...prev, ...newLines.filter(l => l !== '')]);

                // Parse VISUALIZE: tags in real-time
                const tagToken = 'VISUALIZE:';
                newLines.forEach(line => {
                    const idx = line.indexOf(tagToken);
                    if (idx > -1) {
                        const content = line.substring(idx + tagToken.length).trim();
                        const numberMatches = content.match(/-?\d+(\.\d+)?/g);
                        
                        if (numberMatches && numberMatches.length > 0) {
                            const newArray = numberMatches.map((str, i) => ({
                                id: `v-${i}`,
                                value: parseFloat(str)
                            }));
                            setStateList(prev => [...prev, { array: newArray, variables: {} }]);
                        }
                    }
                });
            };

            const handleExit = ({ code }) => {
                setIsRunning(false);
                if (code !== undefined) {
                    setOutput(prev => [...prev, `Process exited with code ${code}`]);
                }
            };

            import.meta.hot.on('terminal:output', handleOutput);
            import.meta.hot.on('terminal:exit', handleExit);

            return () => {
                import.meta.hot.off('terminal:output', handleOutput);
                import.meta.hot.off('terminal:exit', handleExit);
            };
        }
    }, []);

    const sendInput = useCallback((input) => {
        if (import.meta.hot) {
            import.meta.hot.send('terminal:input', { input });
        }
    }, []);

    const executeCode = useCallback((code, language = 'javascript', mode = 'visualize') => {
        setIsRunning(true);
        setOutput([]);
        
        if (mode === 'visualize') {
            setStateList([]);

            if (language === 'javascript') {
                setOutput(['Starting JavaScript client-side visualization...']);
                try {
                    const { instrumented, varsToTrack } = instrumentCode(code);
                    console.log('Instrumented Code:\n', instrumented);
                    console.log('Variables to track:', varsToTrack);

                    const frames = executeInstrumented({ instrumented, varsToTrack });
                    console.log('Captured Frames:', frames);
                    
                    // Transform each frame to an array of { id, value } for the visualizer
                    const transformedStates = frames.map((frame) => {
                        const state = frame.state || {};
                        
                        // Heuristic: Find arrays vs variables
                        let arrayVar = [];
                        const vars = {};

                        Object.entries(state).forEach(([key, val]) => {
                            if (Array.isArray(val) && (arrayVar.length === 0 || key === 'arr' || key === 'myArray')) {
                                arrayVar = val.map((v, i) => ({
                                    id: `v-${i}`,
                                    value: typeof v === 'number' ? v : (v?.value ?? 0)
                                }));
                            } else if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
                                vars[key] = val;
                            }
                        });

                        return {
                            array: arrayVar,
                            variables: vars,
                            line: frame.line
                        };
                    });

                    if (transformedStates.length > 0) {
                        setStateList(transformedStates);
                        setOutput(prev => [...prev, `Visualization complete. Generated ${transformedStates.length} frames.`]);
                    } else {
                        setOutput(prev => [...prev, 'Visualization generated 0 frames. Check your code for errors or assignments.']);
                    }
                } catch (err) {
                    setOutput(prev => [...prev, `Visualization Error: ${err.message}`]);
                    console.error('Visualization error details:', err);
                } finally {
                    setIsRunning(false);
                }
            } else {
                // Automatic AI-powered visualization for non-JS
                setOutput([`Analyzing ${language} code for automatic visualization...`]);
                
                fetch('/api/ai-visualize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        setOutput(prev => [...prev, `Visualization Error: ${data.error}`]);
                    } else if (Array.isArray(data)) {
                        setStateList(data);
                        setOutput(prev => [...prev, `Successfully generated ${data.length} visualization frames via AI.`]);
                    } else {
                        setOutput(prev => [...prev, 'Failed to generate visualization data. Ensure your code contains a trackable array.']);
                    }
                })
                .catch(err => {
                    setOutput(prev => [...prev, `AI Visualization Failed: ${err.message}`]);
                })
                .finally(() => setIsRunning(false));
            }
        } else {
            setStateList([]); // Clear previous visualization state
            if (import.meta.hot) {
                setOutput([`Starting interactive execution for ${language}...`]);
                import.meta.hot.send('terminal:run', { code, language });
            } else {
                setOutput(['Interactive mode requires Vite Dev Server.']);
                setIsRunning(false);
            }
        }
    }, []);

    return { isRunning, output, stateList, executeCode, sendInput };
}
