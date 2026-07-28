# Pebble Interpreter

A sleek, interactive web-based playground and interpreter for the Pebble programming language. Built entirely in the browser, it features a custom lexer, parser, and interpreter with real-time execution tracing.

## Features

*   **Custom Interpreter:** Built from scratch with a custom lexer, parser (generating an Abstract Syntax Tree), and evaluator.
*   **Interactive Editor:** Web-based code editor with syntax highlighting, automatic indentation, and line numbering.
*   **Execution Trace:** Step-by-step visibility into the interpreter's state, variable assignments, and statement execution.
*   **Live Output Console:** Real-time standard output and error reporting.
*   **Built-in Examples:** Pre-loaded templates including Fibonacci Sequence, FizzBuzz, and Factorial.
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
   git clone https://github.com/yourusername/pebble-interpreter.git
   cd pebble-interpreter
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

Pebble is a simple, dynamically typed language. It supports basic arithmetic, variables, `while` loops, `if/else` conditionals, and a built-in `print` function.

```javascript
// Fibonacci sequence in Pebble
let n = 10;
let a = 0;
let b = 1;
let count = 0;

while (count < n) {
  print(a);
  let temp = a + b;
  a = b;
  b = temp;
  count = count + 1;
}
```
