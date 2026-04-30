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
            print("✅ AI Models Loaded Successfully")
        except Exception as e:
            print(f"❌ AI Models Load Error: {e}")
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
        
        # 1. Count Total Loops (C++ focused: for, while, do-while)
        loops = len(re.findall(r'\b(for|while|do)\b', clean))
        
        # 2. Max Nesting Depth
        max_depth = 0
        current_nesting = 0
        lines = clean.split('\n')
        for line in lines:
            if re.search(r'\b(for|while)\b', line):
                current_nesting += 1
                max_depth = max(max_depth, current_nesting)
            closings = line.count('}')
            if closings > 0:
                current_nesting = max(0, current_nesting - closings)

        # 3. Recursion Signature (C++ focused)
        recursion = 0
        func_pattern = r'\b(?:int|void|auto|bool|long|float|double|char|string)\s+(\w+)\s*\([^)]*\)\s*\{'
        for match in re.finditer(func_pattern, clean):
            func_name = match.group(1)
            if func_name == "main": continue
            
            # Simple brace matching to extract function body
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
            calls = len(re.findall(rf'\b{func_name}\s*\(', body))
            if calls >= 2: recursion = max(recursion, 2)
            elif calls >= 1: recursion = max(recursion, 1)

        # 4. Sorting logic (STL)
        sorting = 1 if re.search(r'std::sort|std::stable_sort|qsort\(', clean) else 0
        
        # 5. Divide and Conquer / Halving
        halving = 1 if re.search(r'/= 2|>>= 1|mid\s*=|\b(low|high|mid)\b', clean) else 0
        if re.search(r'std::binary_search|std::lower_bound|std::upper_bound', clean): halving = 2

        # 6. Data Structure Complexity (C++ STL & Dynamic Arrays)
        structs_pattern = r'\b(?:vector|map|set|unordered_|stack|queue|priority_queue|list|deque)\b|new\s+\w+|\.push_back\(|\.emplace_back\(|\.insert\('
        structs = len(re.findall(structs_pattern, clean))
        
        # 7. Max Array Dimension (C++ focused)
        max_array_dim = 0
        if re.search(r'vector\s*<\s*vector|\[\w+\]\s*\[\w+\]', clean):
            max_array_dim = 2
        # Detect O(n) for declarations or dynamic allocations
        # Look for: type name[], new type[n], or vector<type>
        # We check for a type-like word before the [ to avoid matching simple access like arr[i]
        elif re.search(r'\b(?:vector|stack|queue|list|deque)\b|new\s+\w+\[|\w+\s+\w+\[[a-zA-Z_]\w*\]', clean):
            max_array_dim = 1
        
        return [loops, max_depth, recursion, sorting, halving, structs, max_array_dim]

    def predict(self, code):
        if not self.model: return "O(1)", "Model not loaded. Please train the model."
        features = self.extract_features(code)
        prediction = self.model.predict([features])[0]
        probs = self.model.predict_proba([features])
        confidence = np.max(probs) * 100
        
        # Meta-Reasoning for the summary
        reasoning = f"Analysis based on {features[0]} loops (max depth: {features[1]})."
        if features[2] > 0: reasoning += f" Recursive pattern detected."
        if features[4] > 0: reasoning += f" Logarithmic scaling detected."
        
        return prediction, f"ML Confidence: {confidence:.1f}%. {reasoning}"

    def predict_space(self, code):
        if not self.space_model: return "O(1)", "Space model not loaded. Please train the model."
        features = self.extract_features(code)
        prediction = self.space_model.predict([features])[0]
        probs = self.space_model.predict_proba([features])
        confidence = np.max(probs) * 100
        
        # Meta-Reasoning for the summary
        reasoning = f"Space analysis based on "
        if features[6] == 2: reasoning += "2D array usage detected."
        elif features[6] == 1: reasoning += "1D linear structure usage detected."
        elif features[2] > 0: reasoning += f"Recursive stack depth scaling detected."
        else: reasoning += "minimal auxiliary variable usage."
        
        return prediction, f"ML Space Confidence: {confidence:.1f}%. {reasoning}"