import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const executeCodePlugin = () => ({
  name: 'execute-code-plugin',
  configureServer(server) {
    let currentProcess = null;

    const setupProcessListeners = (proc, server, filesToCleanup) => {
      proc.stdout.on('data', (data) => {
        server.ws.send('terminal:output', { data: data.toString() });
      });

      proc.stderr.on('data', (data) => {
        server.ws.send('terminal:output', { data: data.toString() });
      });

      proc.on('close', (code, signal) => {
        // If signal is present, the process was killed manually (e.g. by us)
        if (signal) {
            server.ws.send('terminal:output', { data: `\nProcess terminated by signal: ${signal}` });
        } else {
            server.ws.send('terminal:exit', { code });
        }
        
        filesToCleanup.forEach(f => {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
        });
        currentProcess = null;
      });

      proc.on('error', (err) => {
        server.ws.send('terminal:output', { data: `Process error: ${err.message}` });
      });
    };

    server.ws.on('terminal:run', (data) => {
      const { code, language } = data;
      if (currentProcess) {
        currentProcess.kill();
      }

      const tmpDir = os.tmpdir();
      const uniqueId = Date.now();
      let cmd, args, filename;

      if (language === 'javascript') {
        filename = path.join(tmpDir, `script_${uniqueId}.js`);
        fs.writeFileSync(filename, code);
        cmd = 'node';
        args = [filename];
      } else if (language === 'python') {
        filename = path.join(tmpDir, `script_${uniqueId}.py`);
        fs.writeFileSync(filename, code);
        cmd = 'python';
        args = ['-u', filename]; // -u for unbuffered output
      } else if (language === 'cpp') {
        const srcFile = path.join(tmpDir, `prog_${uniqueId}.cpp`);
        const exeFile = path.join(tmpDir, `prog_${uniqueId}.exe`);
        fs.writeFileSync(srcFile, code);
        
        exec(`g++ "${srcFile}" -o "${exeFile}"`, (error, stdout, stderr) => {
          if (error) {
            server.ws.send('terminal:output', { data: stderr || error.message });
            server.ws.send('terminal:exit', { code: 1 });
            return;
          }
          currentProcess = spawn(exeFile);
          setupProcessListeners(currentProcess, server, [srcFile, exeFile]);
        });
        return;
      } else if (language === 'java') {
        filename = path.join(tmpDir, `Main_${uniqueId}.java`);
        fs.writeFileSync(filename, code);
        cmd = 'java';
        args = [filename];
      } else {
        server.ws.send('terminal:output', { data: 'Unsupported language' });
        return;
      }

      currentProcess = spawn(cmd, args);
      setupProcessListeners(currentProcess, server, [filename]);
    });

    server.ws.on('terminal:input', (data) => {
      if (currentProcess && !currentProcess.killed) {
        currentProcess.stdin.write(data.input + '\n');
      }
    });

    server.ws.on('terminal:execute-command', (data) => {
      const { command } = data;
      if (currentProcess) {
        currentProcess.kill();
      }

      currentProcess = spawn(command, { shell: true, cwd: process.cwd() });
      setupProcessListeners(currentProcess, server, []);
    });

    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { code, language } = JSON.parse(body);
            const tmpDir = os.tmpdir();
            
            let filename, cmd;
            const uniqueId = Date.now() + Math.floor(Math.random() * 100000);
            
            if (language === 'javascript') {
              filename = path.join(tmpDir, `script_${uniqueId}.js`);
              fs.writeFileSync(filename, code);
              cmd = `node "${filename}"`;
            } else if (language === 'python') {
              filename = path.join(tmpDir, `script_${uniqueId}.py`);
              fs.writeFileSync(filename, code);
              cmd = `python "${filename}"`;
            } else if (language === 'cpp') {
              const srcFile = path.join(tmpDir, `prog_${uniqueId}.cpp`);
              const exeFile = path.join(tmpDir, `prog_${uniqueId}.exe`);
              fs.writeFileSync(srcFile, code);
              cmd = `g++ "${srcFile}" -o "${exeFile}" && "${exeFile}"`;
            } else if (language === 'java') {
              // Assume public class Main or similar, but simpler to just use java 11+ single file run
              filename = path.join(tmpDir, `Main_${uniqueId}.java`);
              fs.writeFileSync(filename, code);
              cmd = `java "${filename}"`;
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Unsupported language' }));
            }

            exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
               const output = stdout || stderr || (error ? error.message : '');
               res.writeHead(200, { 'Content-Type': 'application/json' });
               res.end(JSON.stringify({ output: output.trim() }));
               
               // Cleanup
               try { fs.unlinkSync(filename); } catch (e) {}
               if (language === 'cpp') {
                 try { fs.unlinkSync(path.join(tmpDir, `prog_${uniqueId}.cpp`)); } catch(e){}
                 try { fs.unlinkSync(path.join(tmpDir, `prog_${uniqueId}.exe`)); } catch(e){}
               }
            });
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.url === '/api/ai-analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          if (!ai) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set in .env file' }));
          }
          try {
            const { code, language } = JSON.parse(body);
            const prompt = `Analyze this ${language} algorithm.\n\nCode:\n${code}\n\nRespond strictly with JSON in this format, and nothing else (no markdown block backticks):\n{ "summary": "brief summary of what it does", "timeComplexity": "e.g., O(N^2)", "spaceComplexity": "e.g., O(1)", "chartData": [{"inputSize": 10, "operations": 100}, {"inputSize": 50, "operations": 2500}, {"inputSize": 100, "operations": 10000}] }`;
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            let textOutput = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(textOutput);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.url === '/api/ai-visualize' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          if (!ai) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set in .env file' }));
          }
          try {
            const { code, language } = JSON.parse(body);
            const prompt = `Act as an algorithm visualizer engine. Read this ${language} algorithm code.\n\nCode:\n${code}\n\nTrace the execution of this code. 
Return strictly a JSON array of objects. Each object represents a "frame" (a step in the algorithm like a swap, comparison, or loop update).
Each frame must have:
1. "array": The current state of the main array being sorted/processed. Formatted as an array of { "id": string, "value": number }.
2. "variables": An object containing the values of important loop variables or indices (e.g., { "i": 0, "j": 1, "minIndex": 0 }).

Example output:
[
  { 
    "array": [{"id":"v0","value":50},{"id":"v1","value":20}], 
    "variables": {"i":0, "j":1} 
  }
]

Only output valid JSON array with no markdown backticks.`;
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            let textOutput = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(textOutput);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    executeCodePlugin()
  ],
  optimizeDeps: {
    include: ['react-is', 'recharts']
  }
})
