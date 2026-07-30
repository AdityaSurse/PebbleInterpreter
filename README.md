# Pebble VM

A sleek, interactive web-based playground, interpreter, and bytecode virtual machine for the Pebble programming language. Built entirely in the browser, it features a custom lexer, parser, bytecode compiler, and a stack-based VM with real-time execution tracing and bytecode disassembly.

## Features

*   **Dual Execution Modes:**
    *   **AST Walk:** Evaluates the Abstract Syntax Tree directly.
    *   **VM Compile:** Compiles the AST into bytecode and executes it on a custom stack-based Virtual Machine.
*   **Compiler & Bytecode VM:** Features a single-pass compiler that generates instructions for a stack machine, supporting jump offsets, closures, and variable scope resolution.
*   **Interactive Editor:** Web-based code editor with syntax highlighting, automatic indentation, line numbering, and a cheat sheet.
*   **Execution Trace & Disassembly:** Step-by-step visibility into the interpreter's AST state, as well as a dedicated panel to view the compiled bytecode instructions.
*   **File Import/Export:** Seamlessly download your code as `.pebble` files or upload existing `.pebble` scripts to continue editing.
*   **Live Output Console & Benchmarking:** Real-time standard output, error reporting, and execution time measurement to compare AST vs. VM performance.
*   **Modern UI:** Clean, responsive interface with a seamless Dark/Light mode toggle, crafted with Tailwind CSS.

## Tech Stack

*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Vite](https://vitejs.dev/)
*   [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pebble-vm.git
   cd pebble-vm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:3000`.

## Language Syntax

Pebble is a simple, dynamically typed language. It supports basic arithmetic, variables, `while` loops, `for` loops, `if/else` conditionals, arrays, objects, functions with closures, and built-in native functions (like `print`, `len`, `abs`, etc.).

```javascript
// Fibonacci sequence in Pebble
let a = 0;
let b = 1;

for (let i = 0; i < 15; i = i + 1) {
  print("Fib " + i + ": " + a);
  let temp = a + b;
  a = b;
  b = temp;
}
```
