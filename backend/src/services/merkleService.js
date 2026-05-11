const { blake2b } = require('@noble/hashes/blake2.js');

function toHex(uint8arr) {
  return Array.from(uint8arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function blake2bHex(data) {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return toHex(blake2b(input, { dkLen: 32 }));
}

/**
 * Merkle Trim Tree-Based Authentication (MTTBA)
 * Unlike standard Merkle, odd leaf nodes are hashed alone (not duplicated).
 */
function buildMTTBA(hashes) {
  if (hashes.length === 0) throw new Error('Cannot build MTTBA with zero hashes');
  if (hashes.length === 1) return hashes[0];

  let nodes = [...hashes];
  while (nodes.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        // Pair: hash both together
        nextLevel.push(blake2bHex(nodes[i] + nodes[i + 1]));
      } else {
        // Odd node: hash alone (MTTBA trim — no duplication)
        nextLevel.push(blake2bHex(nodes[i]));
      }
    }
    nodes = nextLevel;
  }
  return nodes[0];
}

module.exports = { buildMTTBA };
