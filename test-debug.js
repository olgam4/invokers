// Quick debug test to check if commands work
import { InvokerManager } from './src/compatible.js';

// Enable debug mode
if (typeof window !== 'undefined') {
  window.Invoker = window.Invoker || {};
  window.Invoker.debug = true;
}

const manager = InvokerManager.getInstance();
console.log('Available commands:', Array.from(manager.commands?.keys() || []));

// Try to execute a simple command
document.body.innerHTML = `
  <button id="test-btn" command="--text:set:Hello World" commandfor="target">Test</button>
  <div id="target">Initial</div>
`;

const button = document.getElementById('test-btn');
const target = document.getElementById('target');

console.log('Before click:', target.textContent);
button.click();

setTimeout(() => {
  console.log('After click:', target.textContent);
}, 100);
