import { JOKES } from './config.js';

// Each pool is drawn as a shuffled bag: every line shows up once before any repeats,
// and a new bag never starts with the line that just played. Bags live for the whole
// session, so replaying a run continues the rotation instead of restarting it.
export function makePicker(pools) {
  const bags = {};
  const last = {};
  return (key) => {
    const pool = pools[key];
    if (!pool?.length) return '';
    if (!bags[key]?.length) {
      const bag = [...pool.keys()];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === last[key]) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      bags[key] = bag;
    }
    last[key] = bags[key].pop();
    return pool[last[key]];
  };
}

export const joke = makePicker(JOKES);
