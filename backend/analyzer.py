import re
import joblib
import numpy as np

class MLComplexityAnalyzer:
    def __init__(self):
        try:
            self.model = joblib.load('complexity_model.pkl')
            self.rank_map = {
                "O(2^n)": 6, "O(n³)": 5, "O(n²)": 4, 
                "O(n log n)": 3, "O(n)": 2, "O(log n)": 1, "O(1)": 0
            }
        except:
            self.model = None

    def clean_code(self, code):
        # Remove comments
        code = re.sub(r'//.*|/\*[\s\S]*?\*/', '', code)
        # Simplify strings
        code = re.sub(r'".*?"', '""', code)
        return code

    def extract_features(self, code):
        clean = self.clean_code(code)
        
        # 1. Count Total Loops
        loops = len(re.findall(r'\b(for|while)\b', clean))
        
        # 2. Max Nesting Depth
        max_depth = 0
        current_nesting = 0
        
        # Improved nesting detection using brace counting and loop keywords
        lines = clean.split('\n')
        for line in lines:
            if re.search(r'\b(for|while)\b', line):
                current_nesting += 1
                max_depth = max(max_depth, current_nesting)
            
            # Count closing braces in this line
            closings = line.count('}')
            if closings > 0:
                current_nesting = max(0, current_nesting - closings)

        # 3. Recursion Signature
        # Basic check: does the function call itself?
        # We look for a word followed by ( that is actually the name of the function
        # This is a heuristic for a "hand-written ML" feature
        recursion = 0
        func_match = re.search(r'(?:def|function|int|void)\s+(\w+)\s*\(', clean)
        if func_match:
            func_name = func_match.group(1)
            # Find the body of the function and look for the name
            if re.search(rf'{func_name}\s*\(', clean[func_match.end():]):
                recursion = 1
                # Double recursion check (O(2^n) signature)
                if len(re.findall(rf'{func_name}\s*\(', clean[func_match.end():])) >= 2:
                    recursion = 2 # Multi-recursion

        # 4. Sorting logic
        sorting = 1 if re.search(r'\.sort\(|std::sort|sorted\(|qsort\(', clean) else 0
        
        # 5. Divide and Conquer / Halving
        halving = 1 if re.search(r'/= 2|>>1|mid\s*=|\b(low|high|mid)\b', clean) else 0
        if re.search(r'binary_search|bisect', clean): halving = 2

        # 6. Data Structure Complexity
        # Count allocations or usage of complex structures
        structs = len(re.findall(r'vector|\[\]|new|List|ArrayList|map|set|dict|unordered_', clean, re.I))
        
        return [loops, max_depth, recursion, sorting, halving, structs]

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
        clean = self.clean_code(code)
        if re.search(r'vector<vector|\[\]\[\]|new\W+\w+\[\w+\]\[\w+\]', clean):
            return "O(n²)", "2D Data structure detected (Matrix/Grid)."
        if re.search(r'vector|new\W+|\[\w+\]|ArrayList|stack|queue|push_back', clean):
            return "O(n)", "Linear data structure usage detected."
        return "O(1)", "Minimal auxiliary space detected."