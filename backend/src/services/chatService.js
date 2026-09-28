const Diet = require('../models/Diet');
const { DIAS_SEMANA } = require('../models/Diet');
const monthPlanService = require('./monthPlanService');
const claudeClient = require('./claudeClient');
const shoppingListConfigService = require('./shoppingListConfigService');

function dishesToText(dishes) {
  return dishes.map((d) => (d.cantidad ? `${d.descripcion} (${d.cantidad})` : d.descripcion)).join(' + ');
}

const DIA_POR_GETDAY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const COMIDAS_VALIDAS = ['comida', 'cena', 'ambas'];

/** "YYYY-MM-DD" -> Date a medianoche local (new Date('YYYY-MM-DD') seria medianoche UTC). */
function parseLocalDate(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function toLocalISO(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeDia(value) {
  if (typeof value !== 'string') return null;
  const dia = value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return DIAS_SEMANA.includes(dia) ? dia : null;
}

/** Acepta un array, un dia suelto o un array serializado como texto (el modelo a veces devuelve "null" o '["lunes"]'). */
function parseDias(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = parsed.split(/[\s,]+/);
    }
  }
  if (typeof parsed === 'string') parsed = [parsed];
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeDia).filter(Boolean);
}

/**
 * Valida la salida del modelo antes de usarla: dias siempre es un array de dias validos,
 * y si no viene ninguno pero hay fecha resuelta (p. ej. "hoy"), se deduce el dia de la fecha.
 */
function normalizeInterpretation(raw) {
  const input = raw || {};
  const fechaResuelta =
    typeof input.fechaResuelta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.fechaResuelta) ? input.fechaResuelta : null;

  let dias = parseDias(input.dias);
  if (dias.length === 0) dias = parseDias(input.dia);
  if (dias.length === 0 && fechaResuelta) dias = [DIA_POR_GETDAY[parseLocalDate(fechaResuelta).getDay()]];

  return {
    dias: [...new Set(dias)],
    comida: COMIDAS_VALIDAS.includes(input.comida) ? input.comida : 'ambas',
    fechaResuelta,
  };
}

function resolveTargetDate(dia, fechaResuelta, singleDay, monday) {
  if (fechaResuelta && singleDay) {
    return parseLocalDate(fechaResuelta);
  }
  const idx = DIAS_SEMANA.indexOf(dia);
  const date = new Date(monday);
  date.setDate(monday.getDate() + idx);
  return date;
}

const MAX_HISTORIAL = 10;
const MAX_TEXTO_HISTORIAL = 2000;

/** Se queda con los ultimos mensajes validos del historial que envia el cliente. */
function normalizeHistorial(historial) {
  if (!Array.isArray(historial)) return [];
  return historial
    .filter((m) => m && (m.autor === 'usuario' || m.autor === 'app') && typeof m.texto === 'string' && m.texto.trim())
    .slice(-MAX_HISTORIAL)
    .map((m) => ({ autor: m.autor, texto: m.texto.trim().slice(0, MAX_TEXTO_HISTORIAL) }));
}

/** Menu resuelto como texto para el modelo que redacta la respuesta. */
function detallesToText(detalles) {
  return detalles
    .map((d) => {
      const cuando = d.fecha ? `${d.dia} ${d.fecha}` : d.dia;
      if (d.estado === 'sin_dieta') return `- ${cuando}: no hay ninguna dieta asignada esa semana.`;
      if (d.estado === 'dieta_borrada') return `- ${cuando}: la dieta asignada esa semana ya no existe.`;
      if (d.estado === 'vacio') return `- ${cuando}, ${d.comida}: no hay nada apuntado.`;
      if (d.estado === 'libre') return `- ${cuando}, ${d.comida}: comida LIBRE (sin dieta pautada).`;
      const platos = d.dishes.map((x) => (x.cantidad ? `${x.descripcion} (${x.cantidad})` : x.descripcion));
      return `- ${cuando}, ${d.comida}: ${platos.join('; ')}`;
    })
    .join('\n');
}

/**
 * Responde en lenguaje natural preguntas sobre la dieta (que toca, ingredientes, como cocinarlo).
 * Claude interpreta la pregunta (dia + comida/cena), el menu real se lee de MongoDB y Claude
 * redacta la respuesta solo con esos datos (nunca se inventa el menu).
 */
async function answerMealQuestion(pregunta, fechaActual, historialRaw = []) {
  const fechaActualISO = toLocalISO(fechaActual);
  const historial = normalizeHistorial(historialRaw);
  const interpretation = normalizeInterpretation(
    await claudeClient.interpretMealQuestion(pregunta, fechaActualISO, historial)
  );
  const detalles = await resolveMenu(interpretation, fechaActual);

  const config = await shoppingListConfigService.getConfig();
  const respuesta = await claudeClient.composeChatAnswer({
    pregunta,
    historial,
    fechaActualISO,
    menuConsultado: detallesToText(detalles),
    raciones: config.raciones,
  });

  return { respuesta, detalles };
}

async function resolveMenu(interpretation, fechaActual) {
  const { dias } = interpretation;
  if (dias.length === 0) return [];

  const comidas = interpretation.comida === 'ambas' ? ['comida', 'cena'] : [interpretation.comida];
  const monday = monthPlanService.mondayOf(fechaActual);
  const detalles = [];

  for (const dia of dias) {
    const targetDate = resolveTargetDate(dia, interpretation.fechaResuelta, dias.length === 1, monday);
    const fecha = toLocalISO(targetDate);
    const semanaAsignada = await monthPlanService.findWeekForDate(targetDate);

    if (!semanaAsignada || !semanaAsignada.dietId) {
      detalles.push({ dia, fecha, estado: 'sin_dieta', mensaje: `No tienes ninguna dieta asignada esa semana (${dia}).` });
      continue;
    }

    const diet = await Diet.findById(semanaAsignada.dietId);
    if (!diet) {
      detalles.push({ dia, fecha, estado: 'dieta_borrada', mensaje: `La dieta asignada esa semana ya no existe (${dia}).` });
      continue;
    }

    const dayPlan = diet.semana[dia];
    for (const comida of comidas) {
      const dishes = ((dayPlan && dayPlan[comida]) || []).map(({ descripcion, cantidad, libre }) => ({ descripcion, cantidad, libre }));
      if (dishes.length === 0) {
        detalles.push({ dia, fecha, comida, estado: 'vacio', mensaje: `No hay nada apuntado para ${comida} el ${dia}.` });
      } else if (dishes.some((d) => d.libre)) {
        detalles.push({ dia, fecha, comida, estado: 'libre', mensaje: `El ${dia} tienes ${comida} libre.` });
      } else {
        detalles.push({ dia, fecha, comida, estado: 'menu', mensaje: `Para ${comida} el ${dia}: ${dishesToText(dishes)}`, dishes });
      }
    }
  }

  return detalles;
}

module.exports = { answerMealQuestion, normalizeInterpretation, normalizeHistorial, detallesToText };
