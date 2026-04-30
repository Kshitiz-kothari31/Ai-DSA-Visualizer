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
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
CORS(app)

# Initialize Complexity Analyzer
engine = MLComplexityAnalyzer()

# Process management
active_processes = {}

def get_chart_data(tc, is_stress=False):
    steps = [1000, 3000, 5000, 7500, 10000] if is_stress else [1, 50, 100, 150, 200, 250]
    points = []
    for n in steps:
        try:
            if "n log n" in tc: val = n * math.log2(n) if n > 0 else 0
            elif "n²" in tc or "n^2" in tc: val = n**2
            elif "n³" in tc or "n^3" in tc: val = n**3
            elif "log n" in tc: val = math.log2(n) if n > 0 else 0
            elif "2^n" in tc: val = 2**(n/20) if not is_stress else 2**(n/500)
            elif "n" in tc: val = n
            else: val = 1
            
            if val > 1e12: val = 1e12 # Cap at 1 Trillion to prevent UI crash
        except OverflowError:
            val = 1e12
            
        points.append({"n": n, "time": round(val, 2)})
    return points

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'cpp')
    print(f"Analyzing {language} code...")
    
    tc, tc_reason = engine.predict(code)
    sc, sc_reason = engine.predict_space(code)
    print(f"Prediction: Time={tc}, Space={sc}")
    
    if "n³" in tc or "2^n" in tc or "n^3" in tc:
        insight = f"CRITICAL WARNING: At n=10,000, {tc} requires an astronomical number of operations. It will cause severe lag or crashes on large datasets."
    elif "n²" in tc or "n^2" in tc:
        insight = f"WARNING: At n=10,000, {tc} requires ~100,000,000 operations. It will cause noticeable lag on large datasets."
    elif "n log n" in tc:
        insight = f"GOOD: At n=10,000, {tc} scales efficiently with only ~130,000 operations. Safe for large datasets."
    elif "n" in tc:
        insight = f"EXCELLENT: At n=10,000, {tc} requires exactly 10,000 operations. Highly optimized for massive datasets."
    else:
        insight = f"PERFECT: {tc} executes in constant or logarithmic time regardless of dataset size."

    return jsonify({
        "timeComplexity": tc,
        "spaceComplexity": sc,
        "summary": f"Analyzed {language} code: {tc_reason} {sc_reason}",
        "insight": insight,
        "chartData": get_chart_data(tc, is_stress=False),
        "stressChartData": get_chart_data(tc, is_stress=True)
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
                    except Exception as e:
                        print(f"JSON Parse Error: {str(e)}")
                        socketio.emit('terminal:output', {'data': buffer}, room=sid)
                else:
                    if buffer:
                        socketio.emit('terminal:output', {'data': buffer}, room=sid)
                buffer = ""
            else:
                # HARD LOCK: If we are building a visualization frame, DO NOT flush to terminal.
                # Wait until the newline flushes it to the correct 'visualize-frame' channel.
                if "__VISUALIZE__" in buffer or "__VISUALIZE__".startswith(buffer):
                    continue
                
                if buffer:
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
    
    print(f"[HEARTBEAT] Received run request. SID: {sid}, Mode: {mode}, Lang: {language}")
    socketio.emit('terminal:output', {'data': f"System: Initializing {mode} mode...\n"}, room=sid)
    
    # Kill any existing process for this session
    if sid in active_processes:
        try:
            active_processes[sid].terminate()
        except: pass

    temp_dir = tempfile.gettempdir()
    unique_id = int(time.time())
    files_to_cleanup = []
    
    try:
        src_file = os.path.join(temp_dir, f'prog_{unique_id}.cpp')
        exe_file = os.path.join(temp_dir, f'prog_{unique_id}.exe')
        files_to_cleanup.extend([src_file, exe_file])
        
        with open(src_file, 'w') as f: f.write(code)
        
        # Compile with debug symbols (-g) for C++
        compile_res = subprocess.run(['g++', '-g', src_file, '-o', exe_file], capture_output=True, text=True)
        if compile_res.returncode != 0:
            emit('terminal:output', {'data': compile_res.stderr})
            emit('terminal:exit', {'code': 1})
            return
        
        if mode == 'visualize':
            tracer_path = os.path.join(os.path.dirname(__file__), 'scripts', 'cpp_tracer.py')
            import sys
            cmd = [sys.executable, tracer_path, exe_file]
        else:
            cmd = [exe_file]

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
    port = int(os.environ.get("PORT", 5001))
    # In production, host must be 0.0.0.0 to be accessible externally
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)