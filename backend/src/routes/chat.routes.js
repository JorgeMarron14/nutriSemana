const express = require('express');
const { answerMealQuestion } = require('../services/chatService');

const router = express.Router();

/**
 * @openapi
 * /api/chat:
 *   post:
 *     summary: Pregunta en lenguaje natural sobre la dieta (que toca, ingredientes, como cocinarlo)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pregunta: { type: string, example: "¿que ingredientes necesito para la cena de hoy?" }
 *               historial:
 *                 type: array
 *                 description: Ultimos mensajes de la conversacion, para preguntas de seguimiento
 *                 items:
 *                   type: object
 *                   properties:
 *                     autor: { type: string, enum: [usuario, app] }
 *                     texto: { type: string }
 */
router.post('/', async (req, res) => {
  const { pregunta, historial } = req.body || {};
  if (!pregunta || !pregunta.trim()) {
    return res.status(400).json({ error: 'Falta la pregunta' });
  }

  try {
    const resultado = await answerMealQuestion(pregunta.trim(), new Date(), historial);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: `No se pudo procesar la pregunta: ${err.message}` });
  }
});

module.exports = router;
