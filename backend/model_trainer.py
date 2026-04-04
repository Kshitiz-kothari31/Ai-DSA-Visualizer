import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib # Used to save the trained model

# [LoopCount, NestingDepth, HasRecursion, HasSorting, HasHalving, DataStructs]
# [Loops, Nesting, Recursion, Sorting, Halving, Structures]
# [Loops, Nesting, Recursion, Sorting, Halving, Structures]
X_train = np.array([
    [0, 0, 0, 0, 0, 0], # O(1) - Constant
    [1, 1, 0, 0, 0, 0], # O(n) - Simple loop
    [1, 1, 0, 0, 0, 1], # O(n) - Loop with array
    [2, 1, 0, 0, 0, 1], # O(n) - Two separate loops (Sequential)
    [1, 1, 0, 1, 0, 1], # O(n log n) - std::sort or .sort()
    [2, 2, 0, 0, 0, 0], # O(n²) - Nested loops
    [2, 2, 0, 0, 0, 1], # O(n²) - Bubble Sort style
    [3, 3, 0, 0, 0, 1], # O(n³) - Triple Nested
    [0, 0, 1, 0, 1, 0], # O(log n) - Binary Search pattern
    [1, 1, 1, 0, 0, 0], # O(2^n) - Recursive (Fibonacci)
])

y_train = np.array(["O(1)", "O(n)", "O(n)", "O(n)", "O(n log n)", "O(n²)", "O(n²)", "O(n³)", "O(log n)", "O(2^n)"])

# Build the Random Forest
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Save it to a file so app.py can use it
joblib.dump(model, 'complexity_model.pkl')
print("Model trained and saved as complexity_model.pkl")