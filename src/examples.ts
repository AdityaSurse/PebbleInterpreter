export const EXAMPLES = [
  {
    name: 'Greeting (Input)',
    code: `// Ask user for their name and greet them
let name = input("What is your name?");
print("Hello, " + name + "!");

// You can also ask for numbers (they return as strings)
let age = input("How old are you?");
print("You are " + age + " years old.");`
  },
  {
    name: 'Fibonacci',
    code: `// Fibonacci sequence up to 100
let a = 0;
let b = 1;
print(a);
while (b < 100) {
  print(b);
  let temp = a + b;
  a = b;
  b = temp;
}`
  },
  {
    name: 'FizzBuzz',
    code: `// FizzBuzz 1 to 20
let i = 1;
while (i <= 20) {
  if (i % 15 == 0) {
    print(1515); // Represents FizzBuzz
  } else {
    if (i % 3 == 0) {
      print(333); // Represents Fizz
    } else {
      if (i % 5 == 0) {
        print(555); // Represents Buzz
      } else {
        print(i);
      }
    }
  }
  i = i + 1;
}`
  },
  {
    name: 'Sum of Numbers',
    code: `// Sum of numbers 1 to N
let limit = 10;
let sum = 0;
let i = 1;

while (i <= limit) {
  sum = sum + i;
  i = i + 1;
}

print(sum);`
  },
  {
    name: 'Factorial',
    code: `// Factorial of 5
let n = 5;
let result = 1;

while (n > 0) {
  result = result * n;
  n = n - 1;
}

print(result);`
  }
];
