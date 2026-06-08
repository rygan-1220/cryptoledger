const crypto = require('crypto');
const db = require('../config/db');
const redis = require('../config/redis');
const { decryptSystem } = require('../services/cryptoService');

// POST /api/session-keys/request
exports.requestSessionKey = async (req, res) => {
  const { target_dept_id, public_key_pem } = req.body;
  const requester = req.session.user;

  if (!target_dept_id) return res.status(400).json({ error: 'target_dept_id required' });

  try {
    // 1. Get dept's wrapped K_real
    const deptRes = await db.query('SELECT wrapped_kreal FROM departments WHERE dept_id = $1', [target_dept_id]);
    if (deptRes.rows.length === 0) return res.status(404).json({ error: 'Department not found' });

    // 2. Decrypt K_real using K_system
    const kRealHex = decryptSystem(deptRes.rows[0].wrapped_kreal); // returns hex string

    // 3. Use the requesting device's public key (sent by client), fallback to users table
    let devicePublicKey = public_key_pem || null;
    if (!devicePublicKey) {
      const userRes = await db.query('SELECT public_key_pem FROM users WHERE user_id = $1', [requester.user_id]);
      if (userRes.rows.length > 0) devicePublicKey = userRes.rows[0].public_key_pem;
    }
    if (!devicePublicKey) return res.status(404).json({ error: 'No public key available for this device' });

    // 4. Re-wrap K_real with the requesting device's RSA public key (RSA-OAEP)
    const kRealBuffer = Buffer.from(kRealHex, 'hex');
    const wrappedKRealForRequester = crypto.publicEncrypt(
      { key: devicePublicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      kRealBuffer
    ).toString('base64');

    // 5. Store in Redis with TTL
    const sessionId = crypto.randomUUID();
    const ttl = parseInt(process.env.K_SESSION_TTL || 3600);
    const sessionData = {
      session_id: sessionId,
      requester_user_id: requester.user_id,
      target_dept_id,
      wrapped_kreal_for_requester: wrappedKRealForRequester,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttl * 1000).toISOString()
    };
    await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));

    res.json({
      session_id: sessionId,
      wrapped_kreal_for_requester: wrappedKRealForRequester,
      expires_at: sessionData.expires_at
    });
  } catch (err) {
    console.error('K_session request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/session-keys/:session_id
exports.revokeSessionKey = async (req, res) => {
  const { session_id } = req.params;
  const requester = req.session.user;
  try {
    const raw = await redis.get(`session:${session_id}`);
    if (!raw) return res.status(404).json({ error: 'Session not found or already expired' });
    const session = JSON.parse(raw);
    if (session.requester_user_id !== requester.user_id && !['admin'].includes(requester.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await redis.del(`session:${session_id}`);
    res.json({ message: 'Session revoked' });
  } catch (err) {
    console.error('K_session revoke error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
