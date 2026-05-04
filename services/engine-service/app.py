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
import sys
import io

# Enforce UTF-8 for Windows console and suppress encoding errors globally
import sys
import io

# Force UTF-8 for all standard streams
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

app = Flask(__name__)
# Disable internal logging that clutters the Windows console and causes charmap crashes
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=False, engineio_logger=False)
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

@app.route('/')
def home():
    return "Koda Engine Service is Live!", 200

@app.route('/health')
def health():
    return {'status': 'ok'}

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'cpp')
    print(f"Analyzing {language} code...")
    
    res_tc = engine.predict(code)
    tc = res_tc["prediction"]
    tc_reason = res_tc["summary"]
    tc_breakdown = res_tc["breakdown"]
    tc_cases = res_tc["cases"]
    
    sc, sc_reason, sc_breakdown = engine.predict_space(code)
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
        "timeBreakdown": tc_breakdown,
        "spaceBreakdown": sc_breakdown,
        "cases": tc_cases,
        "chartData": get_chart_data(tc, is_stress=False),
        "stressChartData": get_chart_data(tc, is_stress=True)
    })

# --- WebSocket Execution Engine ---

def stream_output(sid, process, files_to_cleanup, mode='run'):
    try:
        buffer = ""
        while True:
            # Read one byte at a time to handle prompts without newlines
            char_bytes = process.stdout.read(1)
            
            if not char_bytes:
                if process.poll() is not None:
                    break
                socketio.sleep(0.01)
                continue
            
            if active_processes.get(sid) != process:
                return # Silently die if we are a zombie thread replaced by a new run
            
            char_text = char_bytes.decode('utf-8', errors='replace')
            
            if mode == 'run':
                # In run mode, emit every character instantly for interactive feel
                socketio.emit('terminal:output', {'data': char_text}, room=sid)
            else:
                buffer += char_text
                
                # Check if buffer could be a tag
                if '__VISUALIZE__:'.startswith(buffer):
                    # It's matching the prefix, keep buffering
                    pass
                elif buffer.startswith('__VISUALIZE__:'):
                    # We are inside a tag, buffer until newline
                    if char_text == '\n':
                        try:
                            parts = buffer.split('__VISUALIZE__:', 1)
                            if parts[0]: socketio.emit('terminal:output', {'data': parts[0]}, room=sid)
                            socketio.emit('terminal:visualize-frame', json.loads(parts[1]), room=sid)
                        except:
                            socketio.emit('terminal:output', {'data': buffer}, room=sid)
                        buffer = ""
                else:
                    # It's definitely not a tag. Emit everything instantly!
                    socketio.emit('terminal:output', {'data': buffer}, room=sid)
                    buffer = ""
        
        # Return code handling
        if active_processes.get(sid) == process:
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
    mode = data.get('mode', 'run')
    language = data.get('language', 'cpp')
    code = data.get('code', '')
    
    # Professional Handshake & Command Feed
    socketio.sleep(0.05)
    socketio.emit('terminal:output', {'data': f"KODA ~ $ g++ -g prog.cpp -o prog.exe\n"}, room=sid)
    socketio.emit('terminal:output', {'data': f"KODA ~ $ .\\prog.exe\n"}, room=sid)
    
    # Kill any existing process for this session
    if sid in active_processes:
        try:
            active_processes[sid].terminate()
            del active_processes[sid]
        except: pass

    temp_dir = tempfile.gettempdir()
    unique_id = int(time.time())
    files_to_cleanup = []
    
    try:
        src_file = os.path.join(temp_dir, f'prog_{unique_id}.cpp')
        exe_file = os.path.join(temp_dir, f'prog_{unique_id}.exe')
        files_to_cleanup.extend([src_file, exe_file])
        
        with open(src_file, 'w', encoding='utf-8') as f: f.write(code)
        
        # Compile with debug symbols (-g) for C++
        try:
            # Use raw bytes to avoid charmap issues with ASCII art in warnings
            compile_res = subprocess.run(['g++', '-g', src_file, '-o', exe_file], capture_output=True, timeout=15)
        except subprocess.TimeoutExpired:
            socketio.emit('terminal:output', {'data': "\nCompilation Error: Timeout.\n"}, room=sid)
            socketio.emit('terminal:exit', {'code': 1}, room=sid)
            return

        if compile_res.returncode != 0:
            err_text = compile_res.stderr.decode('utf-8', errors='replace')
            socketio.emit('terminal:output', {'data': f"\nCompilation Error:\n{err_text}\n"}, room=sid)
            socketio.emit('terminal:exit', {'code': 1}, room=sid)
            return
        
        if mode == 'visualize':
            # VISUALIZER PATH: Uses the Python tracer with GDB
            tracer_path = os.path.join(os.path.dirname(__file__), 'scripts', 'cpp_tracer.py')
            import sys
            cmd = [sys.executable, '-u', tracer_path, exe_file]
            socketio.emit('terminal:output', {'data': "System: Starting Code Visualizer...\n"}, room=sid)
        else:
            # RUN PATH: Direct execution (Don't touch this!)
            cmd = [exe_file]

        # Spawn the process
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0 # Direct streaming
        )
        
        active_processes[sid] = process
        
        # Start a background thread to handle output
        socketio.start_background_task(stream_output, sid, process, files_to_cleanup, mode)
        
    except Exception as e:
        # Final safety catch for encoding errors
        error_msg = str(e)
        if 'charmap' in error_msg:
             error_msg = "Encoding Error: Please avoid non-ASCII characters in code if possible, or restart the backend."
        socketio.emit('terminal:output', {'data': f"Backend Error: {error_msg}\n"}, room=sid)
        socketio.emit('terminal:exit', {'code': 1}, room=sid)

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