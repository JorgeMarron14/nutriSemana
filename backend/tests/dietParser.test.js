const fs = require('fs');
const path = require('path');

jest.mock('../src/services/claudeClient');
const claudeClient = require('../src/services/claudeClient');
const { parseDietPdf, normalizeExtractedDiets } = require('../src/services/dietParser');
const { DIAS_SEMANA } = require('../src/models/Diet');

const fixturesDir = path.join(__dirname, 'fixtures');

function emptyWeek(overrides = {}) {
  return DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = overrides[dia] || { comida: [], cena: [] };
    return acc;
  }, {});
}

describe('normalizeExtractedDiets', () => {
  test('rellena los dias que falten en la semana con arrays vacios', () => {
    const [diet] = normalizeExtractedDiets([
      {
        nombre: 'Semana de prueba',
        fechaOrigenPdf: '2026-08-03',
        reglasGenerales: null,
        semana: {
          lunes: { comida: [{ descripcion: 'Ensalada', cantidad: null, libre: false }], cena: [] },
        },
      },
    ]);

    expect(Object.keys(diet.semana).sort()).toEqual([...DIAS_SEMANA].sort());
    expect(diet.semana.martes).toEqual({ comida: [], cena: [] });
    expect(diet.semana.lunes.comida).toHaveLength(1);
  });

  test('detecta LIBRE aunque el flag libre no venga marcado', () => {
    const [diet] = normalizeExtractedDiets([
      {
        nombre: 'Semana',
        fechaOrigenPdf: null,
        reglasGenerales: null,
        semana: {
          sabado: { comida: [], cena: [{ descripcion: 'LIBRE', cantidad: null, libre: false }] },
        },
      },
    ]);

    expect(diet.semana.sabado.cena[0]).toEqual({ descripcion: 'LIBRE', cantidad: null, libre: true });
  });

  test('conserva la cantidad cuando viene separada de la descripcion', () => {
    const [diet] = normalizeExtractedDiets([
      {
        nombre: 'Semana',
        fechaOrigenPdf: null,
        reglasGenerales: null,
        semana: {
          lunes: {
            comida: [{ descripcion: 'Arroz con verduras con ternera', cantidad: '180g', libre: false }],
            cena: [],
          },
        },
      },
    ]);

    expect(diet.semana.lunes.comida[0]).toEqual({
      descripcion: 'Arroz con verduras con ternera',
      cantidad: '180g',
      libre: false,
    });
  });

  test('descarta dishes vacios y usa un nombre por defecto si falta', () => {
    const [diet] = normalizeExtractedDiets([
      {
        nombre: '   ',
        fechaOrigenPdf: 'fecha-invalida',
        reglasGenerales: '',
        semana: { lunes: { comida: [{ descripcion: '   ', cantidad: null, libre: false }], cena: [] } },
      },
    ]);

    expect(diet.nombre).toBe('Semana 1');
    expect(diet.fechaOrigenPdf).toBeNull();
    expect(diet.reglasGenerales).toBeNull();
    expect(diet.semana.lunes.comida).toEqual([]);
  });

  test('lanza un error si la respuesta no es un array', () => {
    expect(() => normalizeExtractedDiets(null)).toThrow();
    expect(() => normalizeExtractedDiets({})).toThrow();
  });
});

describe('parseDietPdf (Claude mockeado)', () => {
  afterEach(() => jest.clearAllMocks());

  test('variante A: una semana, sin reglas generales, sin cantidades', async () => {
    claudeClient.extractDietsFromPdf.mockResolvedValue([
      {
        nombre: 'Semana Jorge Marron - 03/08/2026',
        fechaOrigenPdf: '2026-08-03',
        reglasGenerales: null,
        semana: {
          ...emptyWeek(),
          lunes: {
            comida: [{ descripcion: 'Ensalada de tomate con merluza a la plancha', cantidad: null, libre: false }],
            cena: [{ descripcion: 'Tortilla francesa', cantidad: null, libre: false }],
          },
          sabado: { comida: [{ descripcion: 'Paella de marisco', cantidad: null, libre: false }], cena: [{ descripcion: 'LIBRE', cantidad: null, libre: true }] },
          domingo: { comida: [{ descripcion: 'Cocido madrileño', cantidad: null, libre: false }], cena: [{ descripcion: 'LIBRE', cantidad: null, libre: true }] },
        },
      },
    ]);

    const buffer = fs.readFileSync(path.join(fixturesDir, 'dieta-variante-a.pdf'));
    const dietas = await parseDietPdf(buffer);

    // Se envia el PDF original (no el texto extraido) para conservar la estructura de la tabla
    expect(claudeClient.extractDietsFromPdf).toHaveBeenCalledTimes(1);
    expect(claudeClient.extractDietsFromPdf).toHaveBeenCalledWith(buffer);

    expect(dietas).toHaveLength(1);
    expect(dietas[0].reglasGenerales).toBeNull();
    expect(dietas[0].semana.domingo.cena[0].libre).toBe(true);
    expect(dietas[0].fechaOrigenPdf).toBeInstanceOf(Date);
  });

  test('variante B: detecta varias semanas y conserva reglas generales y cantidades', async () => {
    claudeClient.extractDietsFromPdf.mockResolvedValue([
      {
        nombre: 'Semana 1',
        fechaOrigenPdf: '2026-08-10',
        reglasGenerales:
          'Desayuno: OPCION 1 tostada integral, OPCION 2 yogur con avena. Carne 180-250g, pescado 200-300g.',
        semana: {
          ...emptyWeek(),
          lunes: {
            comida: [{ descripcion: 'Arroz con verduras con ternera', cantidad: '180g', libre: false }],
            cena: [{ descripcion: 'Tortilla de claras', cantidad: '4 unidades', libre: false }],
          },
        },
      },
      {
        nombre: 'Semana 2 (alternativa)',
        fechaOrigenPdf: '2026-08-10',
        reglasGenerales:
          'Desayuno: OPCION 1 tostada integral, OPCION 2 yogur con avena. Carne 180-250g, pescado 200-300g.',
        semana: {
          ...emptyWeek(),
          lunes: {
            comida: [{ descripcion: 'Quinoa con verduras y pollo', cantidad: '180g', libre: false }],
            cena: [{ descripcion: 'Revuelto de champiñones', cantidad: '2 huevos', libre: false }],
          },
        },
      },
    ]);

    const buffer = fs.readFileSync(path.join(fixturesDir, 'dieta-variante-b.pdf'));
    const dietas = await parseDietPdf(buffer);

    expect(dietas).toHaveLength(2);
    expect(dietas[0].reglasGenerales).toMatch(/OPCION 1/);
    expect(dietas[0].semana.lunes.comida[0].cantidad).toBe('180g');
    expect(dietas[1].nombre).toBe('Semana 2 (alternativa)');
  });

  test('rechaza archivos que no son PDF sin llamar a Claude', async () => {
    await expect(parseDietPdf(Buffer.from(''))).rejects.toThrow();
    await expect(parseDietPdf(Buffer.from('hola, no soy un pdf'))).rejects.toThrow('no es un PDF');
    expect(claudeClient.extractDietsFromPdf).not.toHaveBeenCalled();
  });
});
