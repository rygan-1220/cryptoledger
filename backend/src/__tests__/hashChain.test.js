const crypto = require('crypto');
const {
  GENESIS_HASH,
  calculateExpenseHash,
  calculateAuditHash,
  getPrevExpenseHash,
  getPrevAuditHash,
} = require('../services/hashChain');

// Mock the db module
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../config/db');

describe('hashChain', () => {
  // ── Pure function tests (no DB) ──────────────────────────────────────

  describe('GENESIS_HASH', () => {
    it('should be 64 zeros', () => {
      expect(GENESIS_HASH).toBe('0'.repeat(64));
      expect(GENESIS_HASH).toHaveLength(64);
    });
  });

  describe('calculateExpenseHash', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = calculateExpenseHash(
        1, GENESIS_HASH, '150.00', 2, new Date('2025-01-15T10:00:00Z'),
      );
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic — same inputs → same hash', () => {
      const date = new Date('2025-06-01T08:30:00Z');
      expect(calculateExpenseHash(42, GENESIS_HASH, '99.99', 3, date))
        .toBe(calculateExpenseHash(42, GENESIS_HASH, '99.99', 3, date));
    });

    it('should produce different hashes when expenseId differs', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      expect(calculateExpenseHash(1, GENESIS_HASH, '100', 1, date))
        .not.toBe(calculateExpenseHash(2, GENESIS_HASH, '100', 1, date));
    });

    it('should produce different hashes when amount differs', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      expect(calculateExpenseHash(1, GENESIS_HASH, '100.00', 1, date))
        .not.toBe(calculateExpenseHash(1, GENESIS_HASH, '200.00', 1, date));
    });

    it('should produce different hashes when deptId differs', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      expect(calculateExpenseHash(1, GENESIS_HASH, '100', 1, date))
        .not.toBe(calculateExpenseHash(1, GENESIS_HASH, '100', 2, date));
    });

    it('should chain — hash depends on previous hash', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const hash1 = calculateExpenseHash(1, GENESIS_HASH, '100', 1, date);
      const hash2 = calculateExpenseHash(2, hash1, '100', 1, date);
      expect(hash1).not.toBe(hash2);
    });

    it('should break the chain if prevHash is tampered with', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const hash1 = calculateExpenseHash(1, GENESIS_HASH, '100', 1, date);
      // Simulate tampering: use GENESIS_HASH instead of hash1 for the next link
      const tamperedLink = calculateExpenseHash(2, GENESIS_HASH, '100', 1, date);
      const correctLink = calculateExpenseHash(2, hash1, '100', 1, date);
      expect(tamperedLink).not.toBe(correctLink);
    });
  });

  describe('calculateAuditHash', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = calculateAuditHash(10, GENESIS_HASH, 'EXPENSE_CREATED', 5,
        new Date('2025-03-20T14:00:00Z'));
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const ts = new Date('2025-04-10T09:00:00Z');
      expect(calculateAuditHash(7, GENESIS_HASH, 'APPROVED', 2, ts))
        .toBe(calculateAuditHash(7, GENESIS_HASH, 'APPROVED', 2, ts));
    });

    it('should produce different hashes for different actions', () => {
      const ts = new Date('2025-04-10T09:00:00Z');
      expect(calculateAuditHash(1, GENESIS_HASH, 'EXPENSE_CREATED', 5, ts))
        .not.toBe(calculateAuditHash(1, GENESIS_HASH, 'EXPENSE_REJECTED', 5, ts));
    });
  });

  // ── DB-dependent function tests ─────────────────────────────────────

  describe('getPrevExpenseHash', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return GENESIS_HASH when the expenses table is empty', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const client = { query: db.query };
      const hash = await getPrevExpenseHash(client);

      expect(hash).toBe(GENESIS_HASH);
    });

    it('should return the last hash when expenses exist', async () => {
      const lastHash = 'a'.repeat(64);
      db.query.mockResolvedValueOnce({ rows: [{ hash: lastHash }] });

      const client = { query: db.query };
      const hash = await getPrevExpenseHash(client);

      expect(hash).toBe(lastHash);
    });

    it('should query expenses ordered by created_at DESC', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const client = { query: db.query };
      await getPrevExpenseHash(client);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT hash FROM expenses ORDER BY created_at DESC LIMIT 1'
      );
    });
  });

  describe('getPrevAuditHash', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return GENESIS_HASH when audit log is empty', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const client = { query: db.query };
      const hash = await getPrevAuditHash(client);

      expect(hash).toBe(GENESIS_HASH);
    });

    it('should return the last hash when audit log has entries', async () => {
      const lastHash = 'f'.repeat(64);
      db.query.mockResolvedValueOnce({ rows: [{ hash: lastHash }] });

      const client = { query: db.query };
      const hash = await getPrevAuditHash(client);

      expect(hash).toBe(lastHash);
    });

    it('should query expense_audit_log ordered by timestamp DESC', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const client = { query: db.query };
      await getPrevAuditHash(client);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT hash FROM expense_audit_log ORDER BY timestamp DESC LIMIT 1'
      );
    });
  });

  // ── Hash chain integrity simulation ─────────────────────────────────

  describe('chain integrity', () => {
    it('should maintain a verifiable chain: each hash depends on the previous', () => {
      const date1 = new Date('2025-01-01T00:00:00Z');
      const date2 = new Date('2025-01-02T00:00:00Z');
      const date3 = new Date('2025-01-03T00:00:00Z');

      const h1 = calculateExpenseHash(1, GENESIS_HASH, '100.00', 1, date1);
      const h2 = calculateExpenseHash(2, h1, '200.00', 1, date2);
      const h3 = calculateExpenseHash(3, h2, '300.00', 1, date3);

      // All hashes should be unique
      expect(h1).not.toBe(h2);
      expect(h2).not.toBe(h3);
      expect(h1).not.toBe(h3);
    });
  });
});
