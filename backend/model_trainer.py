import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib 

# Features: [Loops, Nesting, Recursion, Sorting, Halving, Structures]
# Classes: O(1), O(log n), O(n), O(n log n), O(n²), O(n³), O(2^n)

def generate_synthetic_data():
    X = []
    y = []

    # --- O(1) Constant ---
    for _ in range(10):
        X.append([0, 0, 0, 0, 0, 0])
        y.append("O(1)")
    X.append([0, 0, 0, 0, 1, 0]) # e.g. single mid point calc
    y.append("O(1)")

    # --- O(log n) Logarithmic ---
    for _ in range(5):
        X.append([1, 1, 0, 0, 1, 0]) # while n > 0: n /= 2
        y.append("O(log n)")
    X.append([0, 0, 1, 0, 1, 0]) # Recursive Binary Search
    y.append("O(log n)")
    X.append([1, 1, 1, 0, 1, 1]) # Loop + Binary search helper
    y.append("O(log n)")

    # --- O(n) Linear ---
    for _ in range(10):
        X.append([1, 1, 0, 0, 0, 1]) # Standard for-loop
        y.append("O(n)")
    X.append([2, 1, 0, 0, 0, 1]) # Two sequential loops
    y.append("O(n)")
    X.append([3, 1, 0, 0, 0, 1]) # Three sequential loops
    y.append("O(n)")

    # --- O(n log n) Log-linear ---
    for _ in range(5):
        X.append([1, 1, 0, 1, 0, 1]) # Loop with sort inside
        y.append("O(n log n)")
    X.append([1, 1, 1, 1, 0, 1]) # Merge sort signature
    y.append("O(n log n)")

    # --- O(n²) Quadratic ---
    for _ in range(10):
        X.append([2, 2, 0, 0, 0, 1]) # Double nested loop
        y.append("O(n²)")
    X.append([2, 2, 0, 1, 0, 2]) # Nested with some sorting
    y.append("O(n²)")
    X.append([3, 2, 0, 0, 0, 2]) # Sequential and nested mix
    y.append("O(n²)")

    # --- O(n³) Cubic ---
    for _ in range(5):
        X.append([3, 3, 0, 0, 0, 1]) # Triple nested loop
        y.append("O(n³)")

    # --- O(2^n) Exponential ---
    for _ in range(10):
        X.append([0, 0, 2, 0, 0, 1]) # Double recursion (fibonacci)
        y.append("O(2^n)")
    X.append([1, 1, 2, 0, 0, 1]) # Loop with double recursion
    y.append("O(2^n)")

    return np.array(X), np.array(y)

X_train, y_train = generate_synthetic_data()

# Build and train the Random Forest
model = RandomForestClassifier(
    n_estimators=200, 
    max_depth=10,
    random_state=42
)
model.fit(X_train, y_train)

# Save the trained model
joblib.dump(model, 'complexity_model.pkl')
print(f"Model trained on {len(X_train)} synthetic samples and saved as complexity_model.pkl")