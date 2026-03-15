import { useState, useCallback, useEffect } from 'react';

export function useExecution() {
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState([]);
    const [stateList, setStateList] = useState([]);

    useEffect(() => {
        if (import.meta.hot) {
            const handleOutput = ({ data }) => {
                // Remove trailing newlines as we display per line
                const lines = data.split('\n').filter(l => l !== '');
                setOutput(prev => [...prev, ...lines]);
            };

            const handleExit = ({ code }) => {
                setIsRunning(false);
                setOutput(prev => [...prev, `Process exited with code ${code}`]);
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
            setOutput(['Starting AI visualization...']);
            setStateList([]);

            fetch('/api/ai-visualize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setOutput(prev => [...prev, `AI Error: ${data.error}`]);
                } else {
                    setStateList(data);
                    setOutput(prev => [...prev, `Visualization complete. Generated ${data.length} frames.`]);
                }
            })
            .catch(err => {
                setOutput(prev => [...prev, `Failed to visualize: ${err.message}`]);
            })
            .finally(() => setIsRunning(false));
        } else {
            if (import.meta.hot) {
                import.meta.hot.send('terminal:run', { code, language });
            } else {
                setOutput(['Interactive mode requires Vite Dev Server.']);
                setIsRunning(false);
            }
        }
    }, []);

    return { isRunning, output, stateList, executeCode, sendInput };
}
