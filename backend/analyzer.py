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
        code = re.sub(r'//.*|/\*[\s\S]*?\*/', '', code)
        code = re.sub(r'".*?"', '""', code)
        return code

    def extract_features(self, code):
        clean = self.clean_code(code)
        
        # 1. Count loops accurately
        loops = len(re.findall(r'\b(for|while)\b', clean))
        
        # 2. Improved Nesting Depth (The most important feature)
        depth, max_depth = 0, 0
        current_nesting = 0
        
        # We look specifically for loops followed by opening braces
        lines = clean.split('\n')
        for line in lines:
            if re.search(r'\b(for|while)\b', line):
                current_nesting += 1
                max_depth = max(max_depth, current_nesting)
            if '}' in line and current_nesting > 0:
                current_nesting -= 1

        # 3. Specific Keyword Signatures
        recursion = 1 if re.search(r'(\b\w+\b).*\1\(', clean, re.DOTALL) and "main" not in clean else 0
        sorting = 1 if re.search(r'sort\(|std::sort|sorted\(', clean) else 0
        halving = 1 if re.search(r'/= 2|>>1|mid\s*=|binary', clean) else 0
        structs = len(re.findall(r'vector|\[.*\]|new|List|ArrayList|map|set', clean, re.I))
        
        return [loops, max_depth, recursion, sorting, halving, structs]

    def predict(self, code):
        if not self.model: return "O(1)", "Model not loaded."
        features = self.extract_features(code)
        prediction = self.model.predict([features])[0]
        probs = self.model.predict_proba([features])
        confidence = np.max(probs) * 100
        return prediction, f"ML Confidence: {confidence:.1f}%"

    def predict_space(self, code):
        # We still use a heuristic for space as ML needs a separate dataset for SC
        if "vector<vector" in code or "[][]" in code:
            return "O(n²)", "2D Data structure detected."
        if "vector" in code or "new" in code or "ArrayList" in code:
            return "O(n)", "Dynamic memory allocation detected."
        return "O(1)", "Static memory detected."