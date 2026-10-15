// Self-check for the joke picker: no immediate repeats, every line used once per bag.
// Run: npm run check
import { JOKES } from '../src/config.js';
import { joke } from '../src/jokes.js';

for (const key of Object.keys(JOKES)) {
  const n = JOKES[key].length;
  let prev = null;
  const firstBag = new Set();
  for (let i = 0; i < 200; i++) {
    const line = JSON.stringify(joke(key));
    if (n > 1 && line === prev) throw new Error(`immediate repeat in "${key}"`);
    if (i < n) firstBag.add(line);
    prev = line;
  }
  if (firstBag.size !== n) throw new Error(`"${key}": first bag did not cover every line`);
}
console.log(`jokes ok: ${Object.keys(JOKES).length} pools`);
