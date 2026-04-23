import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib 

# Unified Features: [Loops, Nesting, Recursion, Sorting, Halving, Structures, MaxArrayDim]

def generate_synthetic_data():
    X = []
    y_time = []
    y_space = []

    # --- O(1) Time, O(1) Space ---
    for _ in range(15):
        X.append([0, 0, 0, 0, 0, 0, 0])
        y_time.append("O(1)")
        y_space.append("O(1)")
        
    X.append([0, 0, 0, 0, 1, 0, 0]) # e.g. single mid point calc
    y_time.append("O(1)")
    y_space.append("O(1)")

    # --- O(log n) Time, O(1) Space (Iterative Binary Search) ---
    for _ in range(5):
        X.append([1, 1, 0, 0, 1, 0, 0]) 
        y_time.append("O(log n)")
        y_space.append("O(1)")

    # --- O(log n) Time, O(log n) Space (Recursive Binary Search) ---
    for _ in range(5):
        X.append([0, 0, 1, 0, 1, 0, 0])
        y_time.append("O(log n)")
        y_space.append("O(log n)")

    # --- O(n) Time, O(1) Space (Iterative loop) ---
    for _ in range(10):
        X.append([1, 1, 0, 0, 0, 0, 0])
        y_time.append("O(n)")
        y_space.append("O(1)")

    # --- O(n) Time, O(n) Space (1D Array or Recursion) ---
    for _ in range(10):
        X.append([1, 1, 0, 0, 0, 1, 1]) # Loop filling an array
        y_time.append("O(n)")
        y_space.append("O(n)")
    
    for _ in range(5):
        X.append([0, 0, 1, 0, 0, 0, 0]) # Simple recursion O(n) depth
        y_time.append("O(n)")
        y_space.append("O(n)")

    # --- O(n log n) Time, O(n) Space (Merge Sort signature) ---
    for _ in range(8):
        X.append([1, 1, 1, 1, 1, 1, 1]) 
        y_time.append("O(n log n)")
        y_space.append("O(n)")

    # --- O(n log n) Time, O(1) Space (In-place sort) ---
    for _ in range(5):
        X.append([1, 1, 0, 1, 0, 0, 0]) 
        y_time.append("O(n log n)")
        y_space.append("O(1)")

    # --- O(n²) Time, O(1) Space (Nested loops, no array) ---
    for _ in range(10):
        X.append([2, 2, 0, 0, 0, 0, 0])
        y_time.append("O(n²)")
        y_space.append("O(1)")

    # --- O(n²) Time, O(n²) Space (2D Matrix processing) ---
    for _ in range(10):
        X.append([2, 2, 0, 0, 0, 1, 2])
        y_time.append("O(n²)")
        y_space.append("O(n²)")

    # --- O(n³) Time, O(n²) Space (Floyd Warshall style) ---
    for _ in range(5):
        X.append([3, 3, 0, 0, 0, 1, 2])
        y_time.append("O(n³)")
        y_space.append("O(n²)")

    # --- O(2^n) Time, O(n) Space (Recursive Fibonacci) ---
    for _ in range(8):
        X.append([0, 0, 2, 0, 0, 0, 0])
        y_time.append("O(2^n)")
        y_space.append("O(n)") # Max stack depth is O(n)

    # --- Special Space Cases ---
    X.append([0, 0, 0, 0, 0, 1, 2]) # Just declaring 2D matrix
    y_time.append("O(1)")
    y_space.append("O(n²)")
    
    X.append([0, 0, 0, 0, 0, 1, 1]) # Just declaring 1D array
    y_time.append("O(1)")
    y_space.append("O(n)")

    return np.array(X), np.array(y_time), np.array(y_space)

print("Generating synthetic data...")
X_train, y_time_train, y_space_train = generate_synthetic_data()

# Build and train the Time Complexity Random Forest
print("Training Time Complexity Model...")
time_model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
time_model.fit(X_train, y_time_train)

# Build and train the Space Complexity Random Forest
print("Training Space Complexity Model...")
space_model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
space_model.fit(X_train, y_space_train)

# Save the trained models
joblib.dump(time_model, 'complexity_model.pkl')
joblib.dump(space_model, 'space_model.pkl')

print(f"Models trained successfully on {len(X_train)} synthetic samples.")
print("- Saved complexity_model.pkl")
print("- Saved space_model.pkl")