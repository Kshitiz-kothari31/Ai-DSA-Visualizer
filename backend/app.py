from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from analyzer import MLComplexityAnalyzer
import math
import subprocess
import os
import tempfile
import threading
import json
import time
import signal

app = Flask(__name__)
# In production, set cors_allowed_origins to your frontend URL
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
CORS(app)

# Initialize Complexity Analyzer
engine = MLComplexityAnalyzer()

# Process management
active_processes = {}

def get_chart_data(tc):
    steps = [1, 50, 100, 150, 200, 250]
    points = []
    for n in steps:
        if "n log n" in tc: val = n * math.log2(n) if n > 0 else 0
        elif "n²" in tc or "n^2" in tc: val = n**2
        elif "n³" in tc or "n^3" in tc: val = n**3
        elif "log n" in tc: val = math.log2(n) if n > 0 else 0
        elif "2^n" in tc: val = 2**(n/20)
        elif "n" in tc: val = n
        else: val = 1
        points.append({"n": n, "time": round(val, 2)})
    return points

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'javascript')
    tc, tc_reason = engine.predict(code)
    sc, sc_reason = engine.predict_space(code)
    return jsonify({
        "timeComplexity": tc,
        "spaceComplexity": sc,
        "summary": f"Analyzed {language} code: {tc_reason} {sc_reason}",
        "chartData": get_chart_data(tc)
    })

# --- WebSocket Execution Engine ---

def stream_output(sid, process, files_to_cleanup):
    try:
        buffer = ""
        while True:
            # Read one byte at a time to handle prompts without newlines (like input("Prompt: "))
            char_bytes = process.stdout.read(1)
            
            if not char_bytes:
                if process.poll() is not None:
                    break
                socketio.sleep(0.01) # Use socketio.sleep for better async compatibility
                continue
            
            char_text = char_bytes.decode('utf-8', errors='replace')
            buffer += char_text
            
            if char_text == '\n':
                # Check if this full line was a visualization frame
                if '__VISUALIZE__:' in buffer:
                    try:
                        json_str = buffer.split('__VISUALIZE__:')[1].strip()
                        frame_data = json.loads(json_str)
                        socketio.emit('terminal:visualize-frame', frame_data, room=sid)
                    except:
                        # Fallback: display as text if JSON parsing fails
                        socketio.emit('terminal:output', {'data': buffer}, room=sid)
                else:
                    # Flush any remaining buffer as normal text
                    if buffer:
                        socketio.emit('terminal:output', {'data': buffer}, room=sid)
                buffer = ""
            else:
                # If the current buffer definitely isn't the start of a visualization tag,
                # send the characters immediately to the UI for "live" interaction.
                if not "__VISUALIZE__".startswith(buffer):
                    socketio.emit('terminal:output', {'data': buffer}, room=sid)
                    buffer = ""
        
        # Final stderr capture
        stderr = process.stderr.read().decode('utf-8', errors='replace')
        if stderr:
            socketio.emit('terminal:output', {'data': stderr}, room=sid)
            
        return_code = process.wait()
        socketio.emit('terminal:exit', {'code': return_code}, room=sid)

        
    except Exception as e:
        socketio.emit('terminal:output', {'data': f"\nInternal Server Error: {str(e)}\n"}, room=sid)
    finally:
        # Cleanup
        for f in files_to_cleanup:
            try:
                if os.path.exists(f): os.remove(f)
            except: pass
        if sid in active_processes:
            del active_processes[sid]

@socketio.on('terminal:run')
def handle_run(data):
    sid = request.sid
    code = data.get('code')
    language = data.get('language')
    mode = data.get('mode', 'run')
    
    # Kill any existing process for this session
    if sid in active_processes:
        try:
            active_processes[sid].terminate()
        except: pass

    temp_dir = tempfile.gettempdir()
    unique_id = int(time.time())
    files_to_cleanup = []
    
    try:
        if language == 'javascript':
            fd, path = tempfile.mkstemp(suffix='.js', prefix=f'script_{unique_id}_')
            os.write(fd, code.encode())
            os.close(fd)
            files_to_cleanup.append(path)
            cmd = ['node', path]
            
        elif language == 'python':
            fd, path = tempfile.mkstemp(suffix='.py', prefix=f'script_{unique_id}_')
            os.write(fd, code.encode())
            os.close(fd)
            files_to_cleanup.append(path)
            
            if mode == 'visualize':
                tracer_path = os.path.join(os.getcwd(), 'scripts', 'py_tracer.py')
                cmd = ['python3', '-u', tracer_path, path]
            else:
                cmd = ['python3', '-u', path]
                
        elif language == 'cpp':
            src_file = os.path.join(temp_dir, f'prog_{unique_id}.cpp')
            exe_file = os.path.join(temp_dir, f'prog_{unique_id}.out')
            files_to_cleanup.extend([src_file, exe_file])
            
            final_code = code
            if mode == 'visualize':
                helper = '#include <iostream>\n#include <string>\n#include <vector>\n#define VISUALIZE(name, val) std::cout << "__VISUALIZE__:{\\"variables\\":{\\"" << #name << "\\":" << val << "}}" << std::endl;\n'
                final_code = helper + code
            
            with open(src_file, 'w') as f: f.write(final_code)
            
            # Compile
            compile_res = subprocess.run(['g++', src_file, '-o', exe_file], capture_output=True, text=True)
            if compile_res.returncode != 0:
                emit('terminal:output', {'data': compile_res.stderr})
                emit('terminal:exit', {'code': 1})
                return
            
            cmd = [exe_file]

        elif language == 'java':
            # Java is a bit tricky with filenames (must match class name)
            # For simplicity, we assume Main class or use a basic runner
            path = os.path.join(temp_dir, f'Main_{unique_id}.java')
            with open(path, 'w') as f: f.write(code)
            files_to_cleanup.append(path)
            cmd = ['java', path]
            
        else:
            emit('terminal:output', {'data': 'Unsupported language'})
            return

        # Spawn the process
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0 # Direct streaming
        )
        
        active_processes[sid] = process
        
        # Start a background thread to handle output
        socketio.start_background_task(stream_output, sid, process, files_to_cleanup)
        
    except Exception as e:
        emit('terminal:output', {'data': f"Backend Error: {str(e)}"})
        emit('terminal:exit', {'code': 1})

@socketio.on('terminal:input')
def handle_input(data):
    sid = request.sid
    user_input = data.get('input', '')
    if sid in active_processes:
        proc = active_processes[sid]
        if proc.poll() is None: # Process is still running
            try:
                proc.stdin.write((user_input + '\n').encode())
                proc.stdin.flush()
            except Exception as e:
                emit('terminal:output', {'data': f"\nInput Error: {str(e)}\n"})

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in active_processes:
        try:
            active_processes[sid].terminate()
            del active_processes[sid]
        except: pass

if __name__ == '__main__':
    # Get port from environment variable (required for Render/Railway)
    port = int(os.environ.get("PORT", 5000))
    # In production, host must be 0.0.0.0 to be accessible externally
    socketio.run(app, host='0.0.0.0', port=port, debug=False)