import subprocess
import sys
import re
import json
import os
import threading
import io
import queue

# Force UTF-8 for stdout/stderr to prevent charmap errors on Windows
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class GDBTracer:
    def __init__(self, executable):
        self.executable = executable
        try:
            # Start GDB in quiet mode, no initialization files, console interpreter
            self.process = subprocess.Popen(
                ['gdb', '--quiet', '--interpreter=console', executable],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                bufsize=1
            )
            print("System: Debugger Connected! Initializing...")
            sys.stdout.flush()
        except Exception as e:
            print(f"FATAL: GDB failed to start: {str(e)}")
            sys.stdout.flush()
            sys.stdout.flush()
            sys.exit(1)
        self.visited = {} # address -> id
        self.id_counter = 1000
        self.op_count = 0
        self.iteration_count = 0
        self.last_line = -1
        self.stdout_queue = queue.Queue()
        def _read_stdout():
            try:
                while True:
                    char = self.process.stdout.read(1)
                    if not char:
                        self.stdout_queue.put(None)
                        break
                    self.stdout_queue.put(char)
            except:
                self.stdout_queue.put(None)
                
        threading.Thread(target=_read_stdout, daemon=True).start()

        # Background thread to forward stdin to GDB (for interactive programs)
        def forward_stdin():
            try:
                while True:
                    line = sys.stdin.readline()
                    if not line: break
                    if self.process and self.process.poll() is None:
                        self.process.stdin.write(line)
                        self.process.stdin.flush()
            except: pass
        
        threading.Thread(target=forward_stdin, daemon=True).start()
        
    def is_source_line(self, line):
        # GDB source listings typically use a line number followed by a TAB.
        # This is a very safe check because most program output won't start with a number+tab.
        return re.match(r'^\d+\t', line.strip()) is not None

    def send_command(self, cmd, echo=False):
        if not self.process or self.process.poll() is not None:
            return ["Error: GDB process is not running"]

        if cmd:
            self.process.stdin.write(cmd + '\n')
            self.process.stdin.flush()
        
        output = ""
        buffer = ""
        while True:
            try:
                char = self.stdout_queue.get(timeout=0.01)
                if char is None:
                    if self.process.poll() is None: continue
                    break
            except queue.Empty:
                if echo and buffer:
                    junk_patterns = ['(gdb)', '#', '$', 'Breakpoint', 'at ', 'No such file', 'Reading symbols', 'Temporary breakpoint', 'Starting program:', '[New Thread', '[Thread', 'in _Jv_RegisterClasses', 'exited normally']
                    if not any(x in buffer for x in junk_patterns) and not re.search(r'0x[0-9a-fA-F]+\s+in\s+', buffer):
                        sys.stdout.write(buffer)
                        sys.stdout.flush()
                        buffer = ""
                continue
            
            output += char
            buffer += char
            
            if buffer.endswith('\n') or output.endswith('(gdb) '):
                line = buffer.strip()
                if output.endswith('(gdb) '):
                    line = buffer.replace('(gdb) ', '').strip()
                
                # Forward non-GDB output (program output) to stdout for the terminal
                if echo and line and not any(line.startswith(x) for x in ['(gdb)', '#', '$']):
                    # Block common GDB/MinGW junk
                    junk_patterns = ['Breakpoint', 'at ', 'No such file', 'Reading symbols', 'Temporary breakpoint', 'Starting program:', '[New Thread', '[Thread', 'in _Jv_RegisterClasses', 'exited normally']
                    if not self.is_source_line(line) and not any(x in line for x in junk_patterns):
                        # Block hex address frames like "0x00401288 in ..."
                        if not re.search(r'0x[0-9a-fA-F]+\s+in\s+', line):
                            sys.stdout.write(line + ('\n' if buffer.endswith('\n') else ''))
                            sys.stdout.flush()
                
                if buffer.endswith('\n'):
                    buffer = ""
                else:
                    # If we hit (gdb) prompt, the buffer is essentially consumed for terminal purposes
                    buffer = ""

            if output.endswith('(gdb) '):
                break
        
        return output.replace('(gdb) ', '').splitlines()

    def parse_gdb_value(self, name, val_str, depth=0, context=None):
        if depth > 20: return "<Truncated>"
        val_str = val_str.strip()

        # Handle std::string specifically
        if '_M_p' in val_str and '_M_string_length' in val_str:
            s_match = re.search(r'_M_p\s*=\s*0x[0-9a-fA-F]+\s+"(.*?)"(?:\s*,\s*|})', val_str)
            if s_match: return s_match.group(1)

        # Handle std::vector specifically by detecting its internal structure
        # Heuristic: If it contains _M_start and _M_finish, it's likely a libstdc++ vector
        if '_M_start' in val_str and '_M_finish' in val_str:
            try:
                # Attempt to get size: (_M_finish - _M_start)
                # We use 'output' to avoid the $N = prefix
                size_out = self.send_command(f'output ({name}._M_impl._M_finish - {name}._M_impl._M_start)')
                if size_out and size_out[0].strip().isdigit():
                    size = int(size_out[0].strip())
                    if size == 0: return {"__type": "array", "value": []}
                    if 0 < size <= 1000:
                        elements_out = self.send_command(f'output *({name}._M_impl._M_start)@{size}')
                        if elements_out and not "syntax error" in elements_out[0]:
                            raw_ptr_name = f"({name}._M_impl._M_start)"
                            return self.parse_value_content(raw_ptr_name, "".join(elements_out).strip(), depth + 1)
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
            
            # Improved Array/VLA Detection
            # If it looks like a pointer but we suspect it's an array (e.g. from local info)
            if ptr_match and '[' in val_str:
                 # Already handled by parse_value_content for some GDB versions
                 pass
            elif ptr_match:
                # Check if it's a VLA or if we should treat it as an array
                # If name is 'arr' or similar, try to find a size 'n' or 'size'
                detected_size = None
                for s_var in ['n', 'size', 'len', 'N', 'm']:
                    if s_var in context:
                        try:
                            # Handle "5" or "5 '\005'"
                            s_val_str = context[s_var].split()[0]
                            detected_size = int(s_val_str)
                            if detected_size > 1000: detected_size = 10 # Safety limit
                            break
                        except: pass
                
                if detected_size:
                     # It's a pointer or VLA, try to get its elements
                     try:
                         deref_out = self.send_command(f'output *({name})@{detected_size}')
                         if deref_out and not 'Error' in deref_out:
                             return self.parse_value_content(name, deref_out, depth)
                     except: pass

            # Fallback: Just print the dereferenced single object
            deref_out = self.send_command(f'print *({name})')
            if deref_out and '=' in deref_out[0]:
                content = '='.join(deref_out[0].split('=')[1:]).strip()
                res = self.parse_value_content(name, content, depth + 1, context)
                if isinstance(res, dict):
                    res['__id'] = obj_id
                    res['__type'] = 'object'
                    res['__addr'] = addr
                return res
            return {"__id": obj_id, "__type": "pointer", "address": addr}

        return self.parse_value_content(name, val_str, depth, context)

    def parse_array_elements(self, name, content, depth, context=None):
        items = []
        current_item = ""
        brace_level = 0
        in_string = False
        for char in content:
            if char == '"' and (not current_item or current_item[-1] != '\\'): in_string = not in_string
            if not in_string:
                if char == '{': brace_level += 1
                elif char == '}': brace_level -= 1
            
            if char == ',' and brace_level == 0 and not in_string:
                if current_item.strip():
                    items.append(self.parse_gdb_value(f"({name})[{len(items)}]", current_item.strip(), depth + 1, context))
                current_item = ""
            else:
                current_item += char
        if current_item.strip(): 
            items.append(self.parse_gdb_value(f"({name})[{len(items)}]", current_item.strip(), depth + 1, context))
        return {"__type": "array", "value": items}

    def parse_value_content(self, name, val_str, depth, context=None):
        # Handle Structs/Arrays (e.g. {val = 1, ...} or {1, 2, ...})
        if val_str.startswith('{') and val_str.endswith('}'):
            content = val_str[1:-1].strip()
            # Check if there's an '=' at brace_level 0
            is_struct = False
            brace_level = 0
            in_string = False
            for char in content:
                if char == '"': in_string = not in_string
                if not in_string:
                    if char == '{': brace_level += 1
                    elif char == '}': brace_level -= 1
                    elif char == '=' and brace_level == 0:
                        is_struct = True
                        break
            
            if is_struct:
                return self.parse_struct_fields(name, content, depth, context)
            else:
                return self.parse_array_elements(name, content, depth, context)

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

    def parse_struct_fields(self, parent_name, content, depth, context=None):
        res = {}
        fields = []
        current_field = ""
        brace_level = 0
        in_string = False
        for char in content:
            if char == '"' and (not current_field or current_field[-1] != '\\'): in_string = not in_string
            if not in_string:
                if char == '{': brace_level += 1
                elif char == '}': brace_level -= 1
            
            if char == ',' and brace_level == 0 and not in_string:
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
                res[k] = self.parse_gdb_value(f"({parent_name}).{k}", v, depth + 1, context)
        return res

    def detect_event(self, line_text, variables):
        line = line_text.strip()
        
        # Swap detection
        if 'swap(' in line:
            args = re.search(r'swap\((.*?)\)', line)
            if args:
                return {"type": "swap", "args": args.group(1), "description": f"Swapping: {args.group(1)}"}
        
        # Manual Swap Pattern: temp = a; a = b; b = temp;
        if 'temp' in line and '=' in line:
            return {"type": "swap", "description": "Starting swap sequence using temp"}
        if re.search(r'(\w+)\[.*\]\s*=\s*(\w+)\[.*\]', line):
            # This looks like a potential swap assignment in a sorting algorithm
            return {"type": "swap", "description": f"Moving elements: {line.strip()}"}

        if 'swap' in line.lower():
            return {"type": "swap", "description": f"Swapping: {line.strip()}"}
        
        if 'if' in line and ('<' in line or '>' in line or '==' in line or '!=' in line):
            return {"type": "compare", "description": f"Comparing: {line.strip()}"}
        
        if 'cin' in line:
            return {"type": "input", "description": "Waiting for user input in terminal... Please click the Terminal button below to enter data."}
        
        if '=' in line and not 'for' in line:
            # Exclude complex assignments in for loops
            clean_line = line.split('//')[0].strip()
            return {"type": "assign", "description": f"Assigning: {clean_line}"}

        # Loop detection
        if 'for' in line or 'while' in line:
            self.iteration_count += 1
            return {"type": "loop", "description": f"Iteration {self.iteration_count}"}

        return {"type": "step", "description": "Executing step"}

    def trace(self):
        # Consume initial prompt
        self.send_command('')
        # Initial Setup
        self.send_command('set width 0')
        self.send_command('set height 0')
        self.send_command('set pagination off')
        self.send_command('set interactive-mode on')
        self.send_command('set print address on')
        self.send_command('set print pretty off')

        funcs_out = self.send_command('info functions')
        user_funcs = set()
        parsing_user_funcs = False
        for line in funcs_out:
            if line.startswith('File ') and '.cpp' in line:
                parsing_user_funcs = True
            elif line.startswith('Non-debugging symbols:'):
                parsing_user_funcs = False
            elif parsing_user_funcs and '(' in line:
                match = re.search(r'\b([\w:]+)\s*\(', line)
                if match: user_funcs.add(match.group(1).split(':')[-1])
        
        # Workaround for MinGW GCC VLA bug: break main sometimes stops at return 0;
        first_exec_line = None
        in_main = False
        # Robust Windows path resolution for the .cpp source
        source_file = self.executable.replace('.exe', '.cpp')
        if not os.path.exists(source_file):
            # Fallback for some temp directory naming conventions
            source_file = os.path.join(os.path.dirname(self.executable), os.path.basename(self.executable).replace('.exe', '.cpp'))
            
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if re.match(r'^\s*int\s+main\s*\(', line):
                        in_main = True
                    elif in_main:
                        l = line.strip()
                        if not l or l.startswith('//') or l == '{': continue
                        # Find the first line with real executable side-effects
                        if any(x in l for x in ['cout', 'cin', '=', 'for', 'while', 'if', 'return']) or '(' in l:
                            first_exec_line = i + 1
                            break
        except:
            pass

        if first_exec_line:
            filename = os.path.basename(self.executable).replace('.exe', '.cpp')
            self.send_command(f'break {filename}:{first_exec_line}')
        else:
            self.send_command('break main')
            
        run_out = self.send_command('run', echo=True)
        
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
        limit = 1000
        last_frame_json = None
        
        print("System: Tracer active. Capturing execution frames...")
        sys.stdout.flush()
        sys.stdout.flush()
        
        while limit > 0:
            limit -= 1
            
            # 1. Get current location
            where = self.send_command('where 1')
            if not where or 'No stack' in where[0] or 'exited' in where[0]: break
            
            # Parse: #0  main () at script.cpp:10
            loc_match = re.search(r'at (.*):(\d+)', where[0])
            if not loc_match:
                self.send_command('finish')
                continue
            
            curr_file = loc_match.group(1)
            line_num = int(loc_match.group(2))
            func_name = "main"
            func_match = re.search(r'#0\s+([\w:]+)', where[0])
            if func_match: func_name = func_match.group(1)

            # 2. Get Source Line Text
            frame_out = self.send_command('frame')
            line_text = ""
            for l_str in frame_out:
                if l_str.strip().startswith(str(line_num) + '\t') or l_str.strip().startswith(str(line_num) + ' '):
                    line_text = l_str.strip()
                    break
            
            if not line_text:
                try: line_text = self.get_source_line(line_num)
                except: pass

            # 3. Collect Variables
            self.visited = {}
            locals_out = self.send_command('info locals')
            args_out = self.send_command('info args')
            
            raw_data = {}
            for l_str in (locals_out + args_out):
                if '=' in l_str:
                    parts = l_str.split('=', 1)
                    raw_data[parts[0].strip()] = parts[1].strip()

            variables = {}
            for name, val_str in raw_data.items():
                variables[name] = self.parse_gdb_value(name, val_str, context=raw_data)

            # 4. Detect Event
            event_info = self.detect_event(line_text, variables)
            
            # 5. Emit Frame (BEFORE stepping)
            frame_data = {
                "variables": variables,
                "line": line_num,
                "event": event_info["type"],
                "description": event_info["description"],
                "function": func_name,
                "opCount": self.op_count,
                "iteration": self.iteration_count,
                "stackDepth": 1
            }
            
            current_json = json.dumps({"v": variables, "l": line_num, "e": event_info["type"]}, sort_keys=True)
            if current_json != last_frame_json:
                print(f"__VISUALIZE__:{json.dumps(frame_data)}")
                sys.stdout.flush()
                last_frame_json = current_json
                self.op_count += 1

            # 6. Step
            # Decide whether to 'step' or 'next'
            use_step = False
            for func in user_funcs:
                if func != 'main' and re.search(rf'\b{func}\s*\(', line_text):
                    use_step = True
                    break
            
            if use_step:
                self.send_command('step', echo=True)
            else:
                self.send_command('next', echo=True)

        self.process.terminate()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    exe_path = sys.argv[1]
    if not os.path.exists(exe_path):
        sys.exit(1)
        
    tracer = GDBTracer(exe_path)
    tracer.trace()
