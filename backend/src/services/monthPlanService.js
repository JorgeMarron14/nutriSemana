const MonthPlan = require('../models/MonthPlan');

function toUtcMidnight(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function mondayOf(date) {
  const day = date.getDay(); // 0=domingo ... 6=sabado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return toUtcMidnight(monday);
}

/** Devuelve el lunes de cada semana natural que solapa con el mes (mes: 1-12). */
function getNaturalWeeksOfMonth(anio, mes) {
  const firstDay = new Date(anio, mes - 1, 1);
  const lastDay = new Date(anio, mes, 0);

  const weeks = [];
  let cursor = mondayOf(firstDay);
  const lastMonday = mondayOf(lastDay);

  while (cursor.getTime() <= lastMonday.getTime()) {
    weeks.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

/**
 * Meses ({ anio, mes }) que toca la semana natural que empieza en `monday` (UTC medianoche).
 * Una semana que cruza fin de mes aparece en el plan de ambos meses.
 */
function monthsOfWeek(monday) {
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const months = [{ anio: monday.getUTCFullYear(), mes: monday.getUTCMonth() + 1 }];
  if (sunday.getUTCMonth() !== monday.getUTCMonth()) {
    months.push({ anio: sunday.getUTCFullYear(), mes: sunday.getUTCMonth() + 1 });
  }
  return months;
}

/** Busca la dieta asignada a una semana compartida en el plan del otro mes que la contiene. */
async function dietIdFromOtherMonth(anio, mes, fechaInicioSemana) {
  for (const other of monthsOfWeek(fechaInicioSemana)) {
    if (other.anio === anio && other.mes === mes) continue;
    const plan = await MonthPlan.findOne({ anio: other.anio, mes: other.mes });
    const semana = plan?.semanas.find((s) => s.fechaInicioSemana.getTime() === fechaInicioSemana.getTime());
    if (semana?.dietId) return semana.dietId;
  }
  return null;
}

/** Obtiene el MonthPlan de anio/mes, creando/rellenando huecos de semanas naturales si hace falta. */
async function ensureMonthPlan(anio, mes) {
  const weeks = getNaturalWeeksOfMonth(anio, mes);
  let monthPlan = await MonthPlan.findOne({ anio, mes });

  if (!monthPlan) {
    monthPlan = new MonthPlan({ anio, mes, semanas: [] });
  }

  const existingByTime = new Map(
    monthPlan.semanas.map((semana) => [semana.fechaInicioSemana.getTime(), semana])
  );
  const merged = [];
  for (const fechaInicioSemana of weeks) {
    const existing = existingByTime.get(fechaInicioSemana.getTime());
    let dietId = existing?.dietId ?? null;
    // Semanas que cruzan de mes: si aqui esta vacia pero el otro mes la tiene asignada, la heredamos.
    if (!dietId && monthsOfWeek(fechaInicioSemana).length > 1) {
      dietId = await dietIdFromOtherMonth(anio, mes, fechaInicioSemana);
    }
    merged.push({ fechaInicioSemana, dietId });
  }

  monthPlan.semanas = merged;
  await monthPlan.save();
  return monthPlan;
}

async function setWeekDiet(anio, mes, target, dietId) {
  const monthPlan = await ensureMonthPlan(anio, mes);
  const semana = monthPlan.semanas.find((s) => s.fechaInicioSemana.getTime() === target.getTime());
  if (!semana) return null;
  semana.dietId = dietId;
  await monthPlan.save();
  return monthPlan;
}

/** Asigna la dieta a la semana en el plan de anio/mes y, si la semana cruza de mes, tambien en el del otro mes. */
async function assignWeek(anio, mes, fechaInicioSemana, dietId) {
  const target = toUtcMidnight(new Date(fechaInicioSemana));
  const requested = await setWeekDiet(anio, mes, target, dietId || null);
  if (!requested) {
    throw new Error('La fecha de inicio de semana no pertenece a ninguna semana natural de ese mes');
  }

  for (const other of monthsOfWeek(target)) {
    if (other.anio === anio && other.mes === mes) continue;
    await setWeekDiet(other.anio, other.mes, target, dietId || null);
  }
  return requested;
}

/** Encuentra la semana (y su dieta) del MonthPlan para una fecha concreta. */
async function findWeekForDate(date) {
  const anio = date.getFullYear();
  const mes = date.getMonth() + 1;
  const monthPlan = await ensureMonthPlan(anio, mes);
  const monday = mondayOf(date).getTime();
  return monthPlan.semanas.find((s) => s.fechaInicioSemana.getTime() === monday) || null;
}

module.exports = {
  getNaturalWeeksOfMonth,
  monthsOfWeek,
  ensureMonthPlan,
  assignWeek,
  findWeekForDate,
  mondayOf,
};
