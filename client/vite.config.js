import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Execute Code Plugin
 * Handles local execution of snippets and captures output for terminal and visualization.
 */
const executeCodePlugin = () => ({
  name: 'execute-code-plugin',
  configureServer(server) {
    let currentProcess = null;

    const setupProcessListeners = (proc, server, filesToCleanup) => {
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        
        // Detect Visualization Frames
        if (text.includes('__VISUALIZE__:')) {
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('__VISUALIZE__:')) {
              try {
                const frameData = JSON.parse(line.replace('__VISUALIZE__:', '').trim());
                server.ws.send('terminal:visualize-frame', frameData);
              } catch (e) {
                console.error("Failed to parse visualizer frame:", e);
              }
            } else if (line.trim()) {
              server.ws.send('terminal:output', { data: line + '\n' });
            }
          }
        } else {
          server.ws.send('terminal:output', { data: text });
        }
      });

      proc.stderr.on('data', (data) => {
        server.ws.send('terminal:output', { data: data.toString() });
      });

      proc.on('close', (code, signal) => {
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
      const { code, language, mode } = data;
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
        
        if (mode === 'visualize') {
            // Use our local tracer script
            const tracerPath = path.resolve(process.cwd(), 'scripts', 'py_tracer.py');
            cmd = 'python';
            args = ['-u', tracerPath, filename];
        } else {
            cmd = 'python';
            args = ['-u', filename];
        }
      } else if (language === 'cpp') {
        const srcFile = path.join(tmpDir, `prog_${uniqueId}.cpp`);
        const exeFile = path.join(tmpDir, `prog_${uniqueId}.exe`);
        
        // Auto-inject C++ helper if in visualize mode
        let finalCode = code;
        if (mode === 'visualize') {
            const helper = `
#include <iostream>
#include <string>
#include <vector>
#define VISUALIZE(name, val) std::cout << "__VISUALIZE__:{\\"variables\\":{\\"" << #name << "\\":" << val << "}}" << std::endl;
`;
            finalCode = helper + code;
        }

        fs.writeFileSync(srcFile, finalCode);
        
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
               
               // Cleanup handlers
               try { fs.unlinkSync(filename); } catch (e) {}
            });
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
