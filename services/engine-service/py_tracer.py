import sys
import json
import os

def trace_calls(frame, event, arg):
    if event != 'line':
        return trace_calls
    
    # Get local variables from the current frame
    local_vars = frame.f_locals.copy()
    
    # Filter out internal/module variables and functions
    clean_vars = {}
    for k, v in local_vars.items():
        if k.startswith('__') or hasattr(v, '__call__'):
            continue
        
        # Serialize only basic types and lists for visualization
        if isinstance(v, (int, float, str, bool, list, dict)) or v is None:
            # For lists, convert to the format the visualizer expects if needed
            # but usually the visualizer handles raw arrays too.
            clean_vars[k] = v
            
    if clean_vars:
        # Emit a frame
        print(f"__VISUALIZE__:{json.dumps({'variables': clean_vars, 'line': frame.f_lineno})}")
        sys.stdout.flush()
        
    return trace_calls

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: py_tracer.py <script_to_trace>")
        sys.exit(1)
        
    script_to_run = sys.argv[1]
    
    with open(script_to_run, "r") as f:
        code = f.read()
        
    # Start tracing
    sys.settrace(trace_calls)
    
    try:
        # Execute the user code in a controlled namespace
        exec(code, {"__name__": "__main__"})
    except Exception as e:
        print(f"Execution Error: {e}")
    finally:
        sys.settrace(None)
