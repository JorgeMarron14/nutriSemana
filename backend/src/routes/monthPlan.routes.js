const express = require('express');
const monthPlanService = require('../services/monthPlanService');

const router = express.Router();

/**
 * @openapi
 * /api/monthplans/{anio}/{mes}:
 *   get:
 *     summary: Obtiene (o inicializa) el plan mensual, con una entrada por cada semana natural del mes
 *     tags: [MonthPlans]
 *   put:
 *     summary: Asigna una dieta guardada a una semana natural del mes
 *     tags: [MonthPlans]
 */
router.get('/:anio/:mes', async (req, res) => {
  const anio = Number(req.params.anio);
  const mes = Number(req.params.mes);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'anio/mes invalidos' });
  }

  const monthPlan = await monthPlanService.ensureMonthPlan(anio, mes);
  res.json(monthPlan);
});

router.put('/:anio/:mes', async (req, res) => {
  const anio = Number(req.params.anio);
  const mes = Number(req.params.mes);
  const { fechaInicioSemana, dietId } = req.body || {};

  if (!fechaInicioSemana) {
    return res.status(400).json({ error: 'Falta fechaInicioSemana en el body' });
  }

  try {
    const monthPlan = await monthPlanService.assignWeek(anio, mes, fechaInicioSemana, dietId);
    res.json(monthPlan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
