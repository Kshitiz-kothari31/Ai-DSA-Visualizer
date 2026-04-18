# Ai-DSA-Visualizer 🚀

A high-performance, local Data Structures and Algorithms (DSA) visualizer with integrated Machine Learning for complexity analysis. Unlike traditional visualizers that rely on external APIs, this project uses a native execution engine to trace and visualize your code in real-time.

## ✨ Key Features

- **Local Code Tracing**: Execute and trace JavaScript/Python/C++ code locally without external dependencies.
- **ML Complexity Analysis**: Integrated Random Forest model to predict Time and Space complexity based on code structure.
- **Interactive Visualizer**: Steppable execution with variable tracking and state snapshots.
- **Multi-Language Support**: Support for JS, Python (transpiled), and C++.
- **Modern UI**: Sleek, dark-mode first design with glassmorphic elements.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS (v4), Framer Motion, Lucide Icons.
- **Backend**: Python (Flask), Scikit-Learn, Joblib.
- **Tracing**: Custom AST-based instrumentation (Acorn).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kshitiz-kothari31/Ai-DSA-Visualizer.git
   cd Ai-DSA-Visualizer
   ```

2. **Frontend Setup**
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

## 🧠 How it Works

1. **Instrumentation**: The frontend uses `acorn` to parse your JavaScript code into an AST and injects `__report` calls at every state-changing line.
2. **Execution**: The instrumented code runs in a sandboxed `AsyncFunction` that captures logs and variable states.
3. **ML Prediction**: The backend analyzer extracts structural features (loop depth, sorting patterns, recursion) and passes them to a pre-trained Random Forest model to determine Big-O complexity.

## 📄 License

MIT
