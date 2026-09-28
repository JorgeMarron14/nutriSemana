const { getNaturalWeeksOfMonth } = require('../src/services/monthPlanService');

describe('getNaturalWeeksOfMonth', () => {
  test('agosto 2026 (empieza en sabado) incluye la semana que arranca el lunes previo', () => {
    const weeks = getNaturalWeeksOfMonth(2026, 8);
    const isoMondays = weeks.map((d) => d.toISOString().slice(0, 10));

    // 1 de agosto de 2026 es sabado -> su semana natural empieza el lunes 27/07/2026
    expect(isoMondays[0]).toBe('2026-07-27');
    // 31 de agosto de 2026 es lunes -> ultima semana empieza ese mismo dia
    expect(isoMondays[isoMondays.length - 1]).toBe('2026-08-31');
  });

  test('las semanas son lunes consecutivos separados por 7 dias', () => {
    const weeks = getNaturalWeeksOfMonth(2026, 2);
    for (let i = 1; i < weeks.length; i += 1) {
      const diffDays = (weeks[i].getTime() - weeks[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
      expect(weeks[i - 1].getUTCDay()).toBe(1); // lunes
    }
  });
});

describe('monthsOfWeek', () => {
  const { monthsOfWeek } = require('../src/services/monthPlanService');

  test('una semana que cruza de mes pertenece a los dos meses', () => {
    // lunes 28/09/2026 -> domingo 04/10/2026
    expect(monthsOfWeek(new Date(Date.UTC(2026, 8, 28)))).toEqual([
      { anio: 2026, mes: 9 },
      { anio: 2026, mes: 10 },
    ]);
  });

  test('cruce de año', () => {
    // lunes 28/12/2026 -> domingo 03/01/2027
    expect(monthsOfWeek(new Date(Date.UTC(2026, 11, 28)))).toEqual([
      { anio: 2026, mes: 12 },
      { anio: 2027, mes: 1 },
    ]);
  });

  test('una semana dentro del mes solo pertenece a ese mes', () => {
    expect(monthsOfWeek(new Date(Date.UTC(2026, 8, 14)))).toEqual([{ anio: 2026, mes: 9 }]);
  });
});
