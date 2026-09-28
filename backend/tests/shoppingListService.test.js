const {
  computeAutoExclusions,
  selectDishesToBuy,
  consolidateItems,
} = require('../src/services/shoppingListService');
const { DIAS_SEMANA } = require('../src/models/Diet');

function emptyWeek() {
  return DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = { comida: [{ descripcion: `comida-${dia}`, cantidad: null, libre: false }], cena: [{ descripcion: `cena-${dia}`, cantidad: null, libre: false }] };
    return acc;
  }, {});
}

describe('computeAutoExclusions', () => {
  test('lunes + tarde excluye solo lunes-comida', () => {
    const exclusions = computeAutoExclusions('lunes', 'tarde');
    expect(exclusions).toEqual([{ dia: 'lunes', comida: 'comida' }]);
  });

  test('lunes + mañana no excluye nada', () => {
    expect(computeAutoExclusions('lunes', 'mañana')).toEqual([]);
  });

  test('miercoles + tarde excluye lunes y martes completos, y miercoles-comida', () => {
    const exclusions = computeAutoExclusions('miercoles', 'tarde');
    expect(exclusions).toEqual([
      { dia: 'lunes', comida: 'comida' },
      { dia: 'lunes', comida: 'cena' },
      { dia: 'martes', comida: 'comida' },
      { dia: 'martes', comida: 'cena' },
      { dia: 'miercoles', comida: 'comida' },
    ]);
  });
});

describe('selectDishesToBuy', () => {
  test('aplica exclusiones automaticas + manuales por defecto (lunes/tarde) y descarta LIBRE', () => {
    const diet = { semana: emptyWeek() };
    diet.semana.sabado.cena = [{ descripcion: 'LIBRE', cantidad: null, libre: true }];

    const config = {
      diaCompra: 'lunes',
      momentoCompra: 'tarde',
      exclusionesManualesExtra: [
        { dia: 'viernes', comida: 'cena' },
        { dia: 'sabado', comida: 'comida' },
        { dia: 'sabado', comida: 'cena' },
        { dia: 'domingo', comida: 'comida' },
        { dia: 'domingo', comida: 'cena' },
      ],
    };

    const seleccionados = selectDishesToBuy(diet, config);
    const claves = seleccionados.map((d) => `${d.dia}-${d.comida}`);

    expect(claves).not.toContain('lunes-comida');
    expect(claves).toContain('lunes-cena');
    expect(claves).not.toContain('viernes-cena');
    expect(claves).not.toContain('sabado-comida');
    expect(claves).not.toContain('sabado-cena');
    expect(claves).not.toContain('domingo-comida');
    expect(claves).not.toContain('domingo-cena');
    expect(claves).toContain('viernes-comida');
  });
});

describe('selectDishesToBuy con documentos de Mongoose', () => {
  test('conserva descripcion y cantidad de los platos (no solo con objetos planos)', () => {
    const Diet = require('../src/models/Diet');
    const semana = emptyWeek();
    semana.lunes.cena = [{ descripcion: 'Merluza a la plancha', cantidad: '150g', libre: false }];
    const diet = new Diet({ nombre: 'Test', semana });

    const seleccionados = selectDishesToBuy(diet, { diaCompra: 'lunes', momentoCompra: 'tarde', exclusionesManualesExtra: [] });
    const lunesCena = seleccionados.find((d) => d.dia === 'lunes' && d.comida === 'cena');

    expect(lunesCena).toEqual({ dia: 'lunes', comida: 'cena', descripcion: 'Merluza a la plancha', cantidad: '150g', libre: false });
    expect(seleccionados.every((d) => typeof d.descripcion === 'string')).toBe(true);
  });
});

describe('consolidateItems', () => {
  test('suma cantidades numericas de la misma unidad a lo largo de la semana', () => {
    const items = consolidateItems([
      { nombre: 'Merluza', categoria: 'carne_pescado', cantidad: 200, unidad: 'g' },
      { nombre: 'merluza', categoria: 'carne_pescado', cantidad: 200, unidad: 'gr' },
      { nombre: 'Merluza', categoria: 'carne_pescado', cantidad: 200, unidad: 'g' },
      { nombre: 'Huevo', categoria: 'otros', cantidad: 2, unidad: 'unidades' },
      { nombre: 'Huevo', categoria: 'otros', cantidad: 2, unidad: 'unidades' },
      { nombre: 'Tomate', categoria: 'verdura_fruta', cantidad: null, unidad: null },
    ]);

    expect(items.find((i) => i.nombre === 'Merluza').cantidad).toBe('600 g');
    expect(items.find((i) => i.nombre === 'Huevo').cantidad).toBe('4 unidades');
    expect(items.find((i) => i.nombre === 'Tomate').cantidad).toBeNull();
  });

  test('registra en que comidas y cenas aparece cada ingrediente, sin duplicar la misma comida', () => {
    const items = consolidateItems([
      { nombre: 'Tomate', categoria: 'verdura_fruta', cantidad: null, unidad: null, dia: 'miercoles', comida: 'cena' },
      { nombre: 'Tomate', categoria: 'verdura_fruta', cantidad: null, unidad: null, dia: 'lunes', comida: 'cena' },
      { nombre: 'tomate', categoria: 'verdura_fruta', cantidad: null, unidad: null, dia: 'martes', comida: 'comida' },
      // mismo dia/comida en dos platos distintos (ensalada + tortilla) -> cuenta una vez
      { nombre: 'Tomate', categoria: 'verdura_fruta', cantidad: null, unidad: null, dia: 'miercoles', comida: 'cena' },
    ]);

    expect(items[0].apariciones).toEqual([
      { dia: 'lunes', comida: 'cena' },
      { dia: 'martes', comida: 'comida' },
      { dia: 'miercoles', comida: 'cena' },
    ]);
  });

  test('pasa a kg a partir de 1000 g y separa unidades distintas', () => {
    const items = consolidateItems([
      { nombre: 'Patata', categoria: 'verdura_fruta', cantidad: 250, unidad: 'g' },
      { nombre: 'Patata', categoria: 'verdura_fruta', cantidad: 1, unidad: 'kg' },
      { nombre: 'Patata', categoria: 'verdura_fruta', cantidad: 1, unidad: 'unidades' },
    ]);
    expect(items[0].cantidad).toBe('1.25 kg + 1 unidad');
  });

  test('agrupa el mismo ingrediente aunque venga con otra categoria o con/sin tilde', () => {
    const items = consolidateItems([
      { nombre: 'maíz', categoria: 'verdura_fruta', cantidad: null, unidad: null, dia: 'martes', comida: 'comida' },
      { nombre: 'Maiz', categoria: 'legumbre_cereal', cantidad: null, unidad: null, dia: 'miercoles', comida: 'cena' },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ nombre: 'maíz', categoria: 'verdura_fruta' });
    expect(items[0].apariciones).toHaveLength(2);
  });

  test('agrupa ingredientes repetidos por nombre y concatena cantidades de texto', () => {
    const items = consolidateItems([
      { nombre: 'Tomate', categoria: 'verdura_fruta', cantidad: '2 unidades' },
      { nombre: 'tomate', categoria: 'verdura_fruta', cantidad: '1 unidad' },
      { nombre: 'Pechuga de pollo', categoria: 'carne_pescado', cantidad: '180g' },
    ]);

    expect(items).toHaveLength(2);
    const tomate = items.find((i) => i.nombre.toLowerCase() === 'tomate');
    expect(tomate.cantidad).toBe('2 unidades + 1 unidad');
    expect(tomate.comprado).toBe(false);
  });
});
