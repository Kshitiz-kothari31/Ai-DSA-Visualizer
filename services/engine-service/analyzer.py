import re
import joblib
import numpy as np
import os

class MLComplexityAnalyzer:
    def __init__(self):
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.model = joblib.load(os.path.join(base_dir, 'complexity_model.pkl'))
            self.space_model = joblib.load(os.path.join(base_dir, 'space_model.pkl'))
            self.rank_map = {
                "O(2^n)": 6, "O(n³)": 5, "O(n²)": 4, 
                "O(n log n)": 3, "O(n)": 2, "O(log n)": 1, "O(1)": 0
            }
            print("AI Models Loaded Successfully")
        except Exception as e:
            print(f"AI Models Load Error: {e}")
            self.model = None
            self.space_model = None

    def clean_code(self, code):
        # Remove comments
        code = re.sub(r'//.*|/\*[\s\S]*?\*/', '', code)
        # Simplify strings
        code = re.sub(r'".*?"', '""', code)
        return code

    def extract_features(self, code):
        clean = self.clean_code(code)
        lines = clean.split('\n')
        
        # 1. Count Total Loops (C++ focused: for, while, do-while)
        loops = 0
        loop_lines = []
        for i, line in enumerate(lines):
            if re.search(r'\b(for|while|do)\b', line):
                loops += 1
                loop_lines.append(i + 1)
        
        # 2. Max Nesting Depth
        max_depth = 0
        current_nesting = 0
        depth_lines = []
        for i, line in enumerate(lines):
            if re.search(r'\b(for|while)\b', line):
                current_nesting += 1
                if current_nesting > max_depth:
                    max_depth = current_nesting
                    depth_lines.append(i + 1)
            closings = line.count('}')
            if closings > 0:
                current_nesting = max(0, current_nesting - closings)

        # 3. Recursion Signature
        recursion = 0
        recursion_lines = []
        func_pattern = r'\b(?:int|void|auto|bool|long|float|double|char|string)\s+(\w+)\s*\([^)]*\)\s*\{'
        for match in re.finditer(func_pattern, clean):
            func_name = match.group(1)
            if func_name == "main": continue
            
            body_start = match.end()
            brace_count = 1
            body_end = body_start
            for i in range(body_start, len(clean)):
                if clean[i] == '{': brace_count += 1
                elif clean[i] == '}': brace_count -= 1
                if brace_count == 0:
                    body_end = i
                    break
            
            body = clean[body_start:body_end]
            if re.search(rf'\b{func_name}\s*\(', body):
                recursion = 1
                # Find line number of the function definition
                line_no = clean[:match.start()].count('\n') + 1
                recursion_lines.append(line_no)

        # 4. Sorting logic
        sorting = 0
        sorting_lines = []
        for i, line in enumerate(lines):
            if re.search(r'std::sort|std::stable_sort|qsort\(', line):
                sorting = 1
                sorting_lines.append(i + 1)
        
        # 5. Divide and Conquer / Halving
        halving = 0
        halving_lines = []
        for i, line in enumerate(lines):
            if re.search(r'/= 2|>>= 1|mid\s*=|\b(low|high|mid)\b', line):
                halving = 1
                halving_lines.append(i + 1)
            if re.search(r'std::binary_search|std::lower_bound|std::upper_bound', line):
                halving = 2
                halving_lines.append(i + 1)

        # 6. Data Structure Complexity
        structs = 0
        structs_lines = []
        structs_pattern = r'\b(?:vector|map|set|unordered_|stack|queue|priority_queue|list|deque)\b|new\s+\w+|\.push_back\(|\.emplace_back\(|\.insert\('
        for i, line in enumerate(lines):
            if re.search(structs_pattern, line):
                structs += 1
                structs_lines.append(i + 1)
        
        # 7. Max Array Dimension
        max_array_dim = 0
        dim_lines = []
        for i, line in enumerate(lines):
            if re.search(r'vector\s*<\s*vector|\[\w+\]\s*\[\w+\]', line):
                max_array_dim = 2
                dim_lines.append(i + 1)
            elif re.search(r'\b(?:vector|stack|queue|list|deque)\b|new\s+\w+\[|\w+\s+\w+\[[a-zA-Z_]\w*\]', line):
                if max_array_dim < 1:
                    max_array_dim = 1
                    dim_lines.append(i + 1)
        
        return {
            "features": [loops, max_depth, recursion, sorting, halving, structs, max_array_dim],
            "lines": {
                "loops": loop_lines,
                "depth": depth_lines,
                "recursion": recursion_lines,
                "sorting": sorting_lines,
                "halving": halving_lines,
                "structs": structs_lines,
                "dims": dim_lines
            }
        }

    def predict(self, code):
        if not self.model: return "O(1)", "Model not loaded.", []
        data = self.extract_features(code)
        features = data["features"]
        lines = data["lines"]
        
        prediction = self.model.predict([features])[0]
        probs = self.model.predict_proba([features])
        confidence = np.max(probs) * 100
        
        # Build Breakdown
        breakdown = []
        heuristic_tc = "O(1)"
        
        if features[0] > 0:
            breakdown.append({
                "line": lines["loops"][0] if lines["loops"] else None,
                "step": "Loop Detection",
                "desc": f"Found {features[0]} loop(s). Loops typically indicate O(N) scaling.",
                "impact": "O(N)"
            })
            heuristic_tc = "O(N)"
            
        if features[1] > 1:
            impact = f"O(N^{features[1]})" if features[1] <= 3 else "O(N^k)"
            breakdown.append({
                "line": lines["depth"][0] if lines["depth"] else None,
                "step": "Nesting Analysis",
                "desc": f"Detected {features[1]} levels of nested loops, increasing complexity exponentially.",
                "impact": impact
            })
            heuristic_tc = impact.replace("^", "²") if "^2" in impact else impact.replace("^3", "³")
            
        if features[2] > 0:
            breakdown.append({
                "line": lines["recursion"][0] if lines["recursion"] else None,
                "step": "Recursion Check",
                "desc": "Function calls itself. Recursion can lead to O(2^N) or O(N) depending on branching.",
                "impact": "Recursive"
            })
            if heuristic_tc == "O(1)": heuristic_tc = "O(2^n)"

        if features[4] > 0:
            breakdown.append({
                "line": lines["halving"][0] if lines["halving"] else None,
                "step": "Divide & Conquer",
                "desc": "Input is being halved or binary searched. This significantly reduces complexity.",
                "impact": "O(log N)"
            })
            if heuristic_tc == "O(N)": heuristic_tc = "O(n log n)"
            elif heuristic_tc == "O(1)": heuristic_tc = "O(log n)"

        if features[3] > 0:
            breakdown.append({
                "line": lines["sorting"][0] if lines["sorting"] else None,
                "step": "Sorting Operation",
                "desc": "Standard library sorting detected. Typically uses Heapsort or Timsort.",
                "impact": "O(N log N)"
            })
            heuristic_tc = "O(n log n)"

        # Logic for Case Detection
        has_early_exit = re.search(r'\b(break|return)\b', code)
        
        best_case = heuristic_tc
        avg_case = heuristic_tc
        worst_case = heuristic_tc
        
        explanations = {
            "best": "No early exits found; complexity remains constant.",
            "avg": "Standard execution path follows predicted complexity.",
            "worst": "Max depth and full loop iterations reached."
        }

        if has_early_exit:
            best_case = "O(1)"
            explanations["best"] = "Early exit (break/return) detected. In the best case, the algorithm terminates instantly."
            explanations["worst"] = f"Worst case occurs when early exit conditions are never met, reaching {worst_case}."

        # Hybrid Decision: If ML confidence is low, trust the Heuristic Breakdown
        final_prediction = prediction
        if confidence < 50:
            final_prediction = heuristic_tc
            summary = f"Rule-based Analysis: Highly confident in {final_prediction}. (ML was uncertain at {confidence:.1f}%)"
        else:
            summary = f"ML Confidence: {confidence:.1f}%. Analysis based on {features[0]} loops and {features[1]} depth."
            
        return {
            "prediction": final_prediction,
            "summary": summary,
            "breakdown": breakdown,
            "cases": {
                "best": {"tc": best_case, "desc": explanations["best"]},
                "avg": {"tc": avg_case, "desc": explanations["avg"]},
                "worst": {"tc": worst_case, "desc": explanations["worst"]}
            }
        }

    def predict_space(self, code):
        if not self.space_model: return "O(1)", "Space model not loaded.", []
        data = self.extract_features(code)
        features = data["features"]
        lines = data["lines"]
        
        prediction = self.space_model.predict([features])[0]
        probs = self.space_model.predict_proba([features])
        confidence = np.max(probs) * 100
        
        breakdown = []
        heuristic_sc = "O(1)"
        
        if features[6] == 2:
            breakdown.append({
                "line": lines["dims"][0] if lines["dims"] else None,
                "step": "Matrix Allocation",
                "desc": "2D array or vector of vectors detected. Each dimension scales with N.",
                "impact": "O(N²)"
            })
            heuristic_sc = "O(n²)"
        elif features[6] == 1:
            breakdown.append({
                "line": lines["dims"][0] if lines["dims"] else None,
                "step": "Linear Allocation",
                "desc": "1D array or dynamic vector detected.",
                "impact": "O(N)"
            })
            heuristic_sc = "O(n)"
        elif features[2] > 0:
            breakdown.append({
                "line": lines["recursion"][0] if lines["recursion"] else None,
                "step": "Stack Depth",
                "desc": "Recursive calls consume memory on the call stack.",
                "impact": "O(N) Stack"
            })
            heuristic_sc = "O(n)"
        else:
            breakdown.append({
                "step": "Minimal Usage",
                "desc": "Only a few auxiliary variables used.",
                "impact": "O(1)"
            })
            heuristic_sc = "O(1)"

        # Hybrid Decision for Space
        final_prediction = prediction
        if confidence < 50:
            final_prediction = heuristic_sc
            summary = f"Rule-based Space Analysis: {final_prediction}. (ML Confidence: {confidence:.1f}%)"
        else:
            summary = f"ML Space Confidence: {confidence:.1f}%."
            
        return final_prediction, summary, breakdown
