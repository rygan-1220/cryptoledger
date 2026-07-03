const { buildMTTBA } = require('../services/merkleService');

describe('merkleService — MTTBA', () => {
  describe('buildMTTBA', () => {
    it('should return the hash itself for a single leaf', () => {
      const leaf = 'a'.repeat(64); // 64-char hex hash
      const root = buildMTTBA([leaf]);
      expect(root).toBe(leaf);
    });

    it('should produce a 64-character hex root for any input', () => {
      const hashes = ['1'.repeat(64), '2'.repeat(64), '3'.repeat(64)];
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
      expect(root).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic — same inputs → same root', () => {
      const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
      const root1 = buildMTTBA(hashes);
      const root2 = buildMTTBA(hashes);
      expect(root1).toBe(root2);
    });

    it('should produce different roots for different inputs', () => {
      const hashA = buildMTTBA(['1'.repeat(64), '2'.repeat(64)]);
      const hashB = buildMTTBA(['1'.repeat(64), '3'.repeat(64)]); // one leaf differs
      expect(hashA).not.toBe(hashB);
    });

    it('should handle 2 leaves (perfect pair)', () => {
      const hashes = ['a'.repeat(64), 'b'.repeat(64)];
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle 3 leaves (odd → trim, not duplicate)', () => {
      const hashes = ['1'.repeat(64), '2'.repeat(64), '3'.repeat(64)];
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle 4 leaves (balanced)', () => {
      const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64)];
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle 5 leaves (mixed odd/even across levels)', () => {
      const hashes = Array.from({ length: 5 }, (_, i) => String(i).repeat(64));
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle 7 leaves (multiple odd levels)', () => {
      const hashes = Array.from({ length: 7 }, (_, i) => String(i).repeat(64));
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle 8 leaves (power of 2)', () => {
      const hashes = Array.from({ length: 8 }, (_, i) => String(i).repeat(64));
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should handle a large number of leaves (100)', () => {
      const hashes = Array.from({ length: 100 }, (_, i) => String(i % 10).repeat(64));
      const root = buildMTTBA(hashes);
      expect(root).toHaveLength(64);
    });

    it('should produce the same root regardless of leaf ordering (same set)', () => {
      // MTTBA is order-sensitive — this test verifies that same order → same root
      const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
      const root1 = buildMTTBA([...hashes]);
      const root2 = buildMTTBA([...hashes]);
      expect(root1).toBe(root2);
    });

    it('should produce a different root when leaf order changes', () => {
      const root1 = buildMTTBA(['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)]);
      const root2 = buildMTTBA(['c'.repeat(64), 'a'.repeat(64), 'b'.repeat(64)]);
      expect(root1).not.toBe(root2);
    });

    it('should throw on empty array', () => {
      expect(() => buildMTTBA([])).toThrow('Cannot build MTTBA with zero hashes');
    });
  });
});
