/**
 * A seeded pseudo-random number generator (Mulberry32).
 * Returns a function that generates numbers between 0 and 1.
 */
export function createSeededRandom(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  let a = hash;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic simulated price history that walks backward
 * from the live current probability. The returned array is ordered from 
 * oldest to newest (index length-1 is the current probability).
 */
export function generateSimulatedPath(
  seed: string,
  currentProb: number,
  numPoints: number
): number[] {
  const prng = createSeededRandom(seed);
  const path: number[] = [];
  let val = currentProb;
  let trend = (prng() - 0.5) * 0.5;

  for (let i = 0; i < numPoints; i++) {
    path.unshift(Math.round(val * 10) / 10);
    
    if (prng() < 0.05) trend = (prng() - 0.5) * 0.8;
    const volatility = 1.0 + prng() * 2.5;
    const jumpChance = prng();
    
    let delta = 0;
    if (jumpChance > 0.98) delta = (prng() * 15 + 5); 
    else if (jumpChance < 0.02) delta = -(prng() * 15 + 5); 
    else delta = -trend + (prng() - 0.5) * volatility;
    
    val = Math.max(2, Math.min(97, val + delta));
  }
  return path;
}
