const express = require('express');
const shoppingListConfigService = require('../services/shoppingListConfigService');

const router = express.Router();

/**
 * @openapi
 * /api/settings/shopping-list:
 *   get:
 *     summary: Obtiene la configuracion de la lista de la compra (dia/momento de compra, exclusiones)
 *     tags: [Settings]
 *   put:
 *     summary: Actualiza la configuracion de la lista de la compra
 *     tags: [Settings]
 */
router.get('/shopping-list', async (req, res) => {
  const config = await shoppingListConfigService.getConfig();
  res.json(config);
});

router.put('/shopping-list', async (req, res) => {
  try {
    const config = await shoppingListConfigService.updateConfig(req.body || {});
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
