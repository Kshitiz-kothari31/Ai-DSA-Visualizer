# KODA: Advanced DSA Visualizer & AI Complexity Teacher 🚀

**KODA** is a high-performance, professional-grade suite designed for real-time algorithm tracing and Machine Learning driven Big-O complexity analysis. Unlike traditional visualizers, Koda uses a native execution engine to provide deep visibility into code logic, making it the ultimate tool for DSA students and competitive programmers.

---

## ✨ Key Features

### 1. Real-Time Algorithm Tracing
*   **Step-by-Step Execution**: Visualize your C++ code as it runs, with automatic state snapshots for every variable change.
*   **Memory Inspection**: Leverages a custom GDB-driven backend to track pointers, arrays, and complex data structures with frame-aware accuracy.
*   **Visual Control Flow**: Highlights active lines and control branches (loops, recursion, conditionals) in real-time.

### 2. AI Intelligence Hub (Teacher Mode)
*   **Complexity Teacher**: Not just a complexity predictor—Koda explains *why*. It breaks down your code line-by-line to identify the logic driving your Time and Space complexity.
*   **Case Comparison**: Automatically detects and compares **Best, Average, and Worst Case** scenarios for your code, providing detailed explanations for each.
*   **Performance Charting**: Visualizes theoretical performance curves (Big-O) using interactive charts, including a **Stress Test** mode to simulate high-load scenarios.

### 3. Professional IDE Experience
*   **Monaco Editor**: Integrated with the same engine as VS Code, providing full syntax highlighting, intelligent indentation, and theme support.
*   **Integrated Terminal**: Real-time terminal output for program execution, supporting standard input and shell interactions.
*   **Single-Window Fluidity**: Optimized layouts that intelligently manage screen real-estate between the editor, terminal, and visualization panels.

### 4. Mobile-First Architecture
*   **Ultra-Responsive**: Specifically engineered for mobile productivity with fixed navigation, anchored editor controls, and touch-optimized buttons.
*   **Adaptive Layouts**: Features a "Single Window Mode" on mobile that maximizes workspace by auto-toggling panels.
*   **Native Feel**: Fixed headers and footers using dynamic viewports (dvh) ensure a rock-solid experience on all mobile browsers.

---

## 🛠️ Tech Stack

### Frontend
- **React 18 & Vite**: For a lightning-fast, modern development experience.
- **TailwindCSS (v4)**: Curated design system with glassmorphic aesthetics.
- **Framer Motion**: Fluid, high-performance UI transitions and animations.
- **Recharts**: Data visualization for performance metrics.

### Backend (Microservices)
- **Auth Service (Node.js)**: Secure user management using MongoDB, JWT, and bcrypt.
- **Engine Service (Python/Flask)**: High-performance execution engine.
- **ML Engine**: Scikit-Learn based Random Forest models for predictive complexity analysis.
- **C++ Tracing**: Custom GDB/Python integration for native memory inspection.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **GCC/G++ Compiler** (with GDB support for tracing)
- **MongoDB** (Local or Atlas)

### Installation & Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kshitiz-kothari31/Koda.git
   cd Koda
   ```

2. **Frontend Setup**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Auth Service Setup**
   ```bash
   cd services/auth-service
   npm install
   node server.js
   ```

4. **Engine Service Setup**
   ```bash
   cd services/engine-service
   pip install -r requirements.txt
   python app.py
   ```

---

## 🧠 Technical Deep Dive

### The Tracing Engine
Koda doesn't just "simulate" code. It compiles your C++ code and runs it through a custom-built tracer. This tracer intercepts execution at every sequence point, capturing the state of the stack and heap. This data is then serialized and streamed to the frontend via WebSockets for real-time visualization.

### Predictive Complexity
The AI Hub uses Abstract Syntax Tree (AST) feature extraction. It analyzes nested loop depths, recursive branching factors, and data structure usage patterns. These features are processed by a Random Forest model trained on thousands of algorithm samples, allowing it to predict complexities with high ML confidence.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with ❤️ for the DSA Community.**
