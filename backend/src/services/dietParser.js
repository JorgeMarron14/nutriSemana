const claudeClient = require('./claudeClient');
const { DIAS_SEMANA } = require('../models/Diet');

function normalizeDish(rawDish) {
  if (!rawDish || typeof rawDish !== 'object') {
    return null;
  }
  const descripcion = typeof rawDish.descripcion === 'string' ? rawDish.descripcion.trim() : '';
  const libre = Boolean(rawDish.libre) || /^libre$/i.test(descripcion);
  const cantidad =
    typeof rawDish.cantidad === 'string' && rawDish.cantidad.trim() !== '' ? rawDish.cantidad.trim() : null;

  if (!descripcion && !libre) {
    return null;
  }

  return {
    descripcion: libre ? 'LIBRE' : descripcion,
    cantidad: libre ? null : cantidad,
    libre,
  };
}

function normalizeDayPlan(rawDayPlan) {
  const source = rawDayPlan && typeof rawDayPlan === 'object' ? rawDayPlan : {};
  const normalize = (list) => (Array.isArray(list) ? list.map(normalizeDish).filter(Boolean) : []);
  return {
    comida: normalize(source.comida),
    cena: normalize(source.cena),
  };
}

function normalizeSemana(rawSemana) {
  const source = rawSemana && typeof rawSemana === 'object' ? rawSemana : {};
  return DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = normalizeDayPlan(source[dia]);
    return acc;
  }, {});
}

function parseFecha(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normalizes/validates the raw JSON a Claude extraction call returns into the
 * shape the Diet model expects. Kept independent of the Claude call itself so
 * it can be unit tested with fixed inputs.
 */
function normalizeExtractedDiets(rawDietas) {
  if (!Array.isArray(rawDietas)) {
    throw new Error('Se esperaba un array de dietas en la respuesta de extraccion');
  }

  return rawDietas.map((rawDiet, index) => {
    const nombre =
      typeof rawDiet.nombre === 'string' && rawDiet.nombre.trim() !== ''
        ? rawDiet.nombre.trim()
        : `Semana ${index + 1}`;
    const reglasGenerales =
      typeof rawDiet.reglasGenerales === 'string' && rawDiet.reglasGenerales.trim() !== ''
        ? rawDiet.reglasGenerales.trim()
        : null;

    return {
      nombre,
      fechaOrigenPdf: parseFecha(rawDiet.fechaOrigenPdf),
      reglasGenerales,
      semana: normalizeSemana(rawDiet.semana),
    };
  });
}

function isPdf(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 4 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

async function parseDietPdf(buffer) {
  if (!isPdf(buffer)) {
    throw new Error('El archivo no es un PDF valido');
  }
  const rawDietas = await claudeClient.extractDietsFromPdf(buffer);
  return normalizeExtractedDiets(rawDietas);
}

module.exports = {
  parseDietPdf,
  normalizeExtractedDiets,
  normalizeSemana,
  normalizeDayPlan,
  normalizeDish,
};
