const { DIAS_SEMANA } = require('../models/Diet');
const claudeClient = require('./claudeClient');

const MEALS = ['comida', 'cena'];

/**
 * Exclusiones automaticas: cualquier dia/comida que ya haya "pasado" para cuando
 * se hace la compra (dias antes de diaCompra completos, y si momentoCompra es
 * "tarde" tambien la comida de diaCompra, porque ya se habra comido antes de comprar).
 */
function computeAutoExclusions(diaCompra, momentoCompra) {
  const diaIndex = DIAS_SEMANA.indexOf(diaCompra);
  const exclusions = [];

  DIAS_SEMANA.forEach((dia, index) => {
    if (index < diaIndex) {
      exclusions.push({ dia, comida: 'comida' });
      exclusions.push({ dia, comida: 'cena' });
    } else if (index === diaIndex && momentoCompra === 'tarde') {
      exclusions.push({ dia, comida: 'comida' });
    }
  });

  return exclusions;
}

function exclusionKey({ dia, comida }) {
  return `${dia}:${comida}`;
}

function buildExclusionSet(config) {
  const autoExclusions = computeAutoExclusions(config.diaCompra, config.momentoCompra);
  const manualExclusions = config.exclusionesManualesExtra || [];
  return new Set([...autoExclusions, ...manualExclusions].map(exclusionKey));
}

/** Devuelve los dishes de la dieta que hay que comprar (excluye LIBRE y las exclusiones configuradas). */
function selectDishesToBuy(diet, config) {
  const excluded = buildExclusionSet(config);
  const seleccionados = [];

  DIAS_SEMANA.forEach((dia) => {
    MEALS.forEach((comida) => {
      if (excluded.has(exclusionKey({ dia, comida }))) return;
      const dishes = (diet.semana[dia] && diet.semana[dia][comida]) || [];
      dishes.forEach((dish) => {
        if (dish.libre) return;
        // Con documentos de Mongoose el spread copia los internos ($__, _doc...), no los campos del plato.
        const { descripcion, cantidad, libre } = dish;
        seleccionados.push({ dia, comida, descripcion, cantidad, libre });
      });
    });
  });

  return seleccionados;
}

async function ingredientsForDishes(dishes, raciones) {
  const cache = new Map();
  const items = [];

  for (const dish of dishes) {
    const cacheKey = `${dish.descripcion}::${dish.cantidad || ''}`;
    let ingredientes = cache.get(cacheKey);
    if (!ingredientes) {
      ingredientes = await claudeClient.extractIngredientsFromDish(dish.descripcion, dish.cantidad, raciones);
      cache.set(cacheKey, ingredientes);
    }
    ingredientes.forEach((ing) => items.push({ ...ing, dia: dish.dia, comida: dish.comida }));
  }

  return items;
}

const UNIDADES = {
  g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  unidad: 'unidades', unidades: 'unidades', ud: 'unidades', uds: 'unidades', u: 'unidades',
};

function normalizeUnit(unidad) {
  if (!unidad) return null;
  const u = String(unidad).trim().toLowerCase().replace(/\.$/, '');
  if (u === 'kg') return { unidad: 'g', factor: 1000 };
  if (u === 'l') return { unidad: 'ml', factor: 1000 };
  return { unidad: UNIDADES[u] || u, factor: 1 };
}

function formatCantidad(valor, unidad) {
  const redondeado = Math.round(valor * 100) / 100;
  if (unidad === 'g' && redondeado >= 1000) return `${Math.round(redondeado / 10) / 100} kg`;
  if (unidad === 'ml' && redondeado >= 1000) return `${Math.round(redondeado / 10) / 100} l`;
  if (unidad === 'unidades' && redondeado === 1) return '1 unidad';
  return unidad ? `${redondeado} ${unidad}` : `${redondeado}`;
}

/**
 * Consolida ingredientes repetidos (mismo nombre) en un unico item.
 * Las cantidades numericas se suman por unidad (3 x 200 g -> 600 g); las de texto se concatenan.
 */
function consolidateItems(rawItems) {
  const byKey = new Map();

  rawItems.forEach(({ nombre, categoria, cantidad, unidad, dia, comida }) => {
    // Solo por nombre (sin mayusculas ni tildes): la IA puede clasificar el mismo ingrediente en
    // categorias distintas segun el plato (ej. "maiz" como verdura o como cereal); se queda la primera.
    const key = nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!byKey.has(key)) {
      byKey.set(key, { nombre: nombre.trim(), categoria, totales: new Map(), textos: [], apariciones: new Map() });
    }
    const entry = byKey.get(key);
    // Una misma comida cuenta una vez aunque el ingrediente salga en varios de sus platos.
    if (dia && comida) entry.apariciones.set(`${dia}:${comida}`, { dia, comida });

    if (typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad > 0) {
      const norm = normalizeUnit(unidad) || { unidad: null, factor: 1 };
      entry.totales.set(norm.unidad, (entry.totales.get(norm.unidad) || 0) + cantidad * norm.factor);
    } else if (typeof cantidad === 'string' && cantidad.trim()) {
      entry.textos.push(cantidad.trim());
    }
  });

  return Array.from(byKey.values()).map(({ nombre, categoria, totales, textos, apariciones }) => {
    const partes = [...Array.from(totales.entries()).map(([unidad, valor]) => formatCantidad(valor, unidad)), ...textos];
    return {
      nombre,
      categoria,
      cantidad: partes.length ? partes.join(' + ') : null,
      comprado: false,
      apariciones: Array.from(apariciones.values()).sort(
        (a, b) => DIAS_SEMANA.indexOf(a.dia) - DIAS_SEMANA.indexOf(b.dia) || MEALS.indexOf(a.comida) - MEALS.indexOf(b.comida)
      ),
    };
  });
}

async function buildShoppingListItems(diet, config) {
  const dishes = selectDishesToBuy(diet, config);
  const rawItems = await ingredientsForDishes(dishes, config.raciones);
  return consolidateItems(rawItems);
}

module.exports = {
  computeAutoExclusions,
  buildExclusionSet,
  selectDishesToBuy,
  consolidateItems,
  buildShoppingListItems,
};
