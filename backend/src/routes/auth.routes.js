const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, authEmail, authPasswordHash } = require('../config/env');

const router = express.Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login del unico usuario de la app
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login correcto, devuelve un JWT
 *       401:
 *         description: Credenciales invalidas
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!authEmail || !authPasswordHash) {
    return res.status(500).json({
      error: 'AUTH_EMAIL / AUTH_PASSWORD_HASH no configurados en el servidor (ver .env.example)',
    });
  }

  if (email !== authEmail) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const passwordOk = await bcrypt.compare(password || '', authPasswordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const token = jwt.sign({ email }, jwtSecret, { expiresIn: '30d' });
  res.json({ token });
});

module.exports = router;
