from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import MLComplexityAnalyzer # Corrected class name
import math

app = Flask(__name__)
CORS(app)

# Initialize YOUR custom model
engine = MLComplexityAnalyzer()

def get_chart_data(tc):
    # Use larger steps to show the "curve" of the complexity
    steps = [1, 50, 100, 150, 200, 250]
    points = []
    for n in steps:
        if "n log n" in tc: val = n * math.log2(n) if n > 0 else 0
        elif "n²" in tc or "n^2" in tc: val = n**2
        elif "n³" in tc or "n^3" in tc: val = n**3
        elif "log n" in tc: val = math.log2(n) if n > 0 else 0
        elif "2^n" in tc: val = 2**(n/20) # Scaled so it doesn't break the UI
        elif "n" in tc: val = n
        else: val = 1 # O(1)
        
        points.append({"n": n, "time": round(val, 2)})
    return points

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'javascript')

    # Get predictions from your custom Expert System
    tc, tc_reason = engine.predict(code)
    sc, sc_reason = engine.predict_space(code)
    
    return jsonify({
        "timeComplexity": tc,
        "spaceComplexity": sc,
        "summary": f"Analyzed {language} code: {tc_reason} {sc_reason}",
        "chartData": get_chart_data(tc)
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)