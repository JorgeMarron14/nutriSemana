const express = require('express');
const MonthPlan = require('../models/MonthPlan');
const Diet = require('../models/Diet');
const ShoppingList = require('../models/ShoppingList');
const shoppingListConfigService = require('../services/shoppingListConfigService');
const { buildShoppingListItems } = require('../services/shoppingListService');

const router = express.Router();

/**
 * @openapi
 * /api/shopping-list/generate:
 *   post:
 *     summary: Genera (o regenera) la lista de la compra para una semana de un MonthPlan
 *     tags: [ShoppingList]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthPlanId: { type: string }
 *               fechaInicioSemana: { type: string, format: date }
 */
router.post('/generate', async (req, res) => {
  const { monthPlanId, fechaInicioSemana } = req.body || {};
  if (!monthPlanId || !fechaInicioSemana) {
    return res.status(400).json({ error: 'Faltan monthPlanId / fechaInicioSemana' });
  }

  const monthPlan = await MonthPlan.findById(monthPlanId);
  if (!monthPlan) return res.status(404).json({ error: 'MonthPlan no encontrado' });

  const target = new Date(fechaInicioSemana).getTime();
  const semana = monthPlan.semanas.find((s) => s.fechaInicioSemana.getTime() === target);
  if (!semana || !semana.dietId) {
    return res.status(422).json({ error: 'Esa semana no tiene ninguna dieta asignada todavia' });
  }

  const diet = await Diet.findById(semana.dietId);
  if (!diet) return res.status(404).json({ error: 'La dieta asignada a esa semana ya no existe' });

  try {
    const config = await shoppingListConfigService.getConfig();
    const items = await buildShoppingListItems(diet, config);

    const shoppingList = await ShoppingList.findOneAndUpdate(
      { monthPlanId, fechaInicioSemana: semana.fechaInicioSemana },
      { monthPlanId, fechaInicioSemana: semana.fechaInicioSemana, dietId: diet._id, items },
      { new: true, upsert: true }
    );

    res.json(shoppingList);
  } catch (err) {
    res.status(500).json({ error: `No se pudo generar la lista de la compra: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/shopping-list/{id}:
 *   get:
 *     summary: Obtiene una lista de la compra guardada
 *     tags: [ShoppingList]
 */
router.get('/:id', async (req, res) => {
  const list = await ShoppingList.findById(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista de la compra no encontrada' });
  res.json(list);
});

/**
 * @openapi
 * /api/shopping-list/{id}/items/{itemId}:
 *   patch:
 *     summary: Marca/desmarca un ingrediente como comprado
 *     tags: [ShoppingList]
 */
router.patch('/:id/items/:itemId', async (req, res) => {
  const { comprado } = req.body || {};
  const list = await ShoppingList.findById(req.params.id);
  if (!list) return res.status(404).json({ error: 'Lista de la compra no encontrada' });

  const item = list.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item no encontrado en la lista' });

  item.comprado = Boolean(comprado);
  await list.save();
  res.json(list);
});

module.exports = router;
