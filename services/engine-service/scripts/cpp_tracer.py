import subprocess
import sys
import re
import json
import os

class GDBTracer:
    def __init__(self, executable):
        self.executable = executable
        try:
            # Start GDB in quiet mode, no initialization files, console interpreter
            self.process = subprocess.Popen(
                ['gdb', '-q', '-nx', '--interpreter=console', executable],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
        except Exception as e:
            print(f"FATAL: GDB failed to start: {str(e)}")
            sys.stdout.flush()
            sys.exit(1)
        self.visited = {} # address -> id
        self.id_counter = 1000

    def send_command(self, cmd):
        if not self.process or self.process.poll() is not None:
            return ["Error: GDB process is not running"]

        if cmd:
            self.process.stdin.write(cmd + '\n')
            self.process.stdin.flush()
        
        output = ""
        while True:
            char = self.process.stdout.read(1)
            if not char: 
                # If we get no char but process is alive, wait a bit
                if self.process.poll() is None:
                    continue
                break
            output += char
            if output.endswith('(gdb) '):
                break
        
        return output.replace('(gdb) ', '').splitlines()

    def parse_gdb_value(self, name, val_str, depth=0, context=None):
        if depth > 5: return "<Truncated>"
        val_str = val_str.strip()

        # Handle std::vector specifically by detecting its internal structure
        # Heuristic: If it contains _M_start and _M_finish, it's likely a libstdc++ vector
        if '_M_start' in val_str and '_M_finish' in val_str:
            try:
                # Attempt to get size: (_M_finish - _M_start)
                # We use 'output' to avoid the $N = prefix
                size_out = self.send_command(f'output ({name}._M_impl._M_finish - {name}._M_impl._M_start)')
                if size_out and size_out[0].strip().isdigit():
                    size = int(size_out[0].strip())
                    if 0 < size <= 100:
                        elements_out = self.send_command(f'output *({name}._M_impl._M_start)@{size}')
                        if elements_out and elements_out[0].strip().startswith('{'):
                            return self.parse_value_content(name, elements_out[0].strip(), depth + 1)
            except:
                pass # Fallback to normal struct parsing

        # Handle Pointers (e.g. 0x123456)
        ptr_match = re.search(r'0x[0-9a-fA-F]+', val_str)
        if ptr_match:
            addr = ptr_match.group(0)
            if addr == '0x0' or addr == '0': return None
            
            if addr in self.visited:
                return {"__ref": self.visited[addr]}
            
            # New address found!
            obj_id = str(self.id_counter)
            self.id_counter += 1
            self.visited[addr] = obj_id
            
            # HEURISTIC: Is this pointer actually an array?
            # Check context for variables like 'n', 'size', 'len'
            detected_size = None
            if context:
                for s_name in ['n', 'size', 'len', 'length', 'N', 'SIZE', 'count']:
                    if s_name in context:
                        try:
                            s_val = context[s_name].split()[0] # Handle "10" or "10 ..."
                            if s_val.isdigit():
                                detected_size = int(s_val)
                                break
                        except: pass
            
            if detected_size and 0 < detected_size <= 100:
                # Try to print as array
                deref_out = self.send_command(f'output *({name})@{detected_size}')
                if deref_out and deref_out[0].strip().startswith('{'):
                    res = self.parse_value_content(name, deref_out[0].strip(), depth + 1)
                    if isinstance(res, dict):
                        res['__id'] = obj_id
                        res['__type'] = 'array'
                    return res

            # Fallback: Just print the dereferenced single object
            deref_out = self.send_command(f'print *({name})')
            if deref_out and '=' in deref_out[0]:
                content = '='.join(deref_out[0].split('=')[1:]).strip()
                res = self.parse_value_content(name, content, depth + 1)
                if isinstance(res, dict):
                    res['__id'] = obj_id
                    res['__type'] = 'object'
                return res
            return {"__id": obj_id, "__type": "pointer", "address": addr}

        return self.parse_value_content(name, val_str, depth)

    def parse_value_content(self, name, val_str, depth):
        # Handle Structs/Arrays (e.g. {val = 1, ...} or {1, 2, ...})
        if val_str.startswith('{') and val_str.endswith('}'):
            content = val_str[1:-1].strip()
            # Heuristic: if contains '=', it's a struct/object. Otherwise array.
            if '=' in content:
                return self.parse_struct_fields(name, content, depth)
            else:
                # Handle Array: {1, 2, 3}
                items = []
                # Simple split by comma for now (doesn't handle nested commas well)
                raw_items = content.split(',')
                for i, item in enumerate(raw_items):
                    items.append(self.parse_gdb_value(f"({name})[{i}]", item.strip(), depth + 1))
                return {"__type": "array", "value": items}

        # Handle Primitives
        if val_str.isdigit() or (val_str.startswith('-') and val_str[1:].isdigit()):
            val = int(val_str)
            # Heuristic: Uninitialized C++ memory often contains massive random numbers.
            # In a DSA visualizer context, values > 1,000,000 or < -10,000 are almost certainly garbage.
            if val > 9999999 or val < -9999:
                return 0
            return val
        try:
            if '.' in val_str: return float(val_str)
        except: pass
        
        if val_str in ['true', 'false']: return val_str == 'true'
        
        # Strings/Chars
        if val_str.startswith('"'):
            # GDB sometimes adds extra info like 0x... "string"
            s_match = re.search(r'"(.*)"', val_str)
            if s_match: return s_match.group(1)
            return val_str.strip('"')
            
        if val_str.startswith("'"):
            c_match = re.search(r"'(.*)'", val_str)
            if c_match: return c_match.group(1)
            return val_str.strip("'")
            
        return val_str

    def parse_struct_fields(self, parent_name, content, depth):
        res = {}
        fields = []
        current_field = ""
        brace_level = 0
        for char in content:
            if char == '{': brace_level += 1
            elif char == '}': brace_level -= 1
            
            if char == ',' and brace_level == 0:
                fields.append(current_field.strip())
                current_field = ""
            else:
                current_field += char
        if current_field: fields.append(current_field.strip())

        for field in fields:
            if '=' in field:
                k, v = field.split('=', 1)
                k = k.strip()
                v = v.strip()
                res[k] = self.parse_gdb_value(f"({parent_name}).{k}", v, depth + 1)
        return res

    def trace(self):
        # Consume initial prompt
        self.send_command('')
        # Initial Setup
        self.send_command('set width 0')
        self.send_command('set height 0')
        self.send_command('set print address on')
        self.send_command('set print pretty off')
        self.send_command('break main')
        run_out = self.send_command('run')
        
        if any("Operation not permitted" in l for l in run_out):
            # This is the common 'ptrace' restriction on cloud providers
            error_msg = "Visualization Failed: Cloud provider restricted debugger permissions (ptrace). Try a different host like Railway or a local environment."
            frame_data = {
                "variables": {"Error": error_msg},
                "line": 1,
                "event": "error"
            }
            print(f"__VISUALIZE__:{json.dumps(frame_data)}")
            sys.stdout.flush()
            return
        
        # Main Loop
        limit = 300 # Step limit
        last_frame_json = None
        
        while limit > 0:
            limit -= 1
            
            # Get current location
            where = self.send_command('where 1')
            if not where or 'No stack' in where[0] or 'exited' in where[0]: break
            
            # Parse line number: #0  main () at script.cpp:10
            loc_match = re.search(r'at (.*):(\d+)', where[0])
            if not loc_match: 
                # Might be in a function without line info (libc)
                self.send_command('finish')
                continue
            
            line = int(loc_match.group(2))
            func_name = "main"
            func_match = re.search(r'#0\s+([\w:]+)', where[0])
            if func_match: func_name = func_match.group(1)

            # Collect Variables with context awareness
            self.visited = {} 
            locals_out = self.send_command('info locals')
            args_out = self.send_command('info args')
            
            # Pre-parse to get all raw values (context for pointer-to-array heuristics)
            raw_context = {}
            for line_str in (locals_out + args_out):
                if '=' in line_str:
                    parts = line_str.split('=', 1)
                    raw_context[parts[0].strip()] = parts[1].strip()

            variables = {}
            for v_name, v_val in raw_context.items():
                variables[v_name] = self.parse_gdb_value(v_name, v_val, context=raw_context)

            # DE-DUPLICATION: Only emit if the state or line has changed
            current_frame_json = json.dumps({"v": variables, "l": line}, sort_keys=True)
            if current_frame_json == last_frame_json:
                # Move to next line
                step_out = self.send_command('next')
                if any("exited" in l for l in step_out): break
                continue
            
            last_frame_json = current_frame_json
            
            frame_data = {
                "variables": variables,
                "line": line,
                "event": "line",
                "function": func_name,
                "stackDepth": 1 
            }
            print(f"__VISUALIZE__:{json.dumps(frame_data)}")
            sys.stdout.flush()

            # Move to next line
            step_out = self.send_command('next')
            if any("exited" in l for l in step_out): break

        self.process.terminate()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    exe_path = sys.argv[1]
    if not os.path.exists(exe_path):
        sys.exit(1)
        
    tracer = GDBTracer(exe_path)
    tracer.trace()
