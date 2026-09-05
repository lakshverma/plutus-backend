/*
 * Deterministic pseudo-random helpers.
 *
 * The seed must produce the same database every time it runs. A dataset that changes
 * shape on every reset makes behaviour impossible to compare between runs, and
 * reproducibility is what turns "it works on a fresh clone" into a claim that can
 * actually be checked. Math.random would defeat both, so everything derives from an
 * explicit seed.
 */

// mulberry32. Small, fast, and good enough for placing generated data. It is defined
// in terms of 32-bit integer operations, so the bitwise rule is off for this function.
/* eslint-disable no-bitwise */
const createRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/* eslint-enable no-bitwise */

const makeHelpers = (rng) => {
  // Integer in [min, max].
  const int = (min, max) => min + Math.floor(rng() * (max - min + 1));

  const pick = (items) => items[Math.floor(rng() * items.length)];

  // n distinct members of items, or all of them when n is larger.
  const sample = (items, n) => {
    const pool = [...items];
    const out = [];
    while (out.length < n && pool.length > 0) {
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return out;
  };

  const bool = (trueProbability = 0.5) => rng() < trueProbability;

  // A date between two Date bounds, inclusive.
  const dateBetween = (start, end) => new Date(
    start.getTime() + Math.floor(rng() * (end.getTime() - start.getTime())),
  );

  // YYYY-MM-DD, which is what every date column here wants.
  const isoDate = (date) => date.toISOString().slice(0, 10);

  // Weighted pick. Entries are [value, weight]; heavier values come up more often,
  // which is what keeps generated data from looking uniformly synthetic.
  const weighted = (entries) => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rng() * total;
    for (let i = 0; i < entries.length; i += 1) {
      roll -= entries[i][1];
      if (roll <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  };

  return {
    rng, int, pick, sample, bool, dateBetween, isoDate, weighted,
  };
};

module.exports = { createRng, makeHelpers };
