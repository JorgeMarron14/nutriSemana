const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/claude');

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: config.apiKey });
  }
  return client;
}

const DIA_ENUM = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const dishInputSchema = {
  type: 'object',
  properties: {
    descripcion: { type: 'string', description: 'Texto del plato tal cual aparece, sin la cantidad entre parentesis' },
    cantidad: { type: ['string', 'null'], description: 'Cantidad/gramaje si se especifica, ej "180g". null si no aparece' },
    libre: { type: 'boolean', description: 'true si la celda indica "LIBRE" (sin dieta pautada ese dia/comida)' },
  },
  required: ['descripcion', 'cantidad', 'libre'],
};

const dayPlanInputSchema = {
  type: 'object',
  properties: {
    comida: { type: 'array', items: dishInputSchema },
    cena: { type: 'array', items: dishInputSchema },
  },
  required: ['comida', 'cena'],
};

const semanaInputSchema = {
  type: 'object',
  properties: DIA_ENUM.reduce((acc, dia) => {
    acc[dia] = dayPlanInputSchema;
    return acc;
  }, {}),
  required: DIA_ENUM,
};

const EXTRACT_DIETS_TOOL = {
  name: 'extraer_dietas',
  description:
    'Registra una o mas dietas semanales extraidas del texto de un PDF de nutricion, ya estructuradas en JSON.',
  input_schema: {
    type: 'object',
    properties: {
      dietas: {
        type: 'array',
        description: 'Una entrada por cada semana/tabla semanal detectada en el documento',
        items: {
          type: 'object',
          properties: {
            nombre: {
              type: 'string',
              description:
                'Nombre descriptivo para esta semana, ej "Semana 1 - 08/08/2026". Si hay varias semanas en el PDF, numeralas',
            },
            fechaOrigenPdf: {
              type: ['string', 'null'],
              description: 'Fecha que aparece en la cabecera del PDF para esta semana, formato YYYY-MM-DD, null si no se encuentra',
            },
            reglasGenerales: {
              type: ['string', 'null'],
              description:
                'Texto libre con las normas generales que no van por dia (desayuno/media manana con sus OPCIONes, entre horas, normas de gramajes de carne/pescado/huevos/legumbre, dias de ejercicio intenso). null si el documento no incluye esta seccion (variante simple)',
            },
            semana: semanaInputSchema,
          },
          required: ['nombre', 'fechaOrigenPdf', 'reglasGenerales', 'semana'],
        },
      },
    },
    required: ['dietas'],
  },
};

const SYSTEM_PROMPT = `Eres un asistente que extrae informacion estructurada de PDFs de dietas semanales en español, escritos por un nutricionista humano.

El formato de estos PDFs varia. Puede haber dos variantes:
- Variante simple: cabecera (NOMBRE, FECHA, KCAL, %H/P/G, PATOLOGIA) + una o varias tablas semanales (LUNES a DOMINGO, filas COMIDA y CENA). Celdas de texto libre, sin cantidades.
- Variante completa: ademas de lo anterior, incluye paginas previas con reglas generales (desayuno/media mañana con OPCION 1/OPCION 2, entre horas, normas de gramajes de carne/pescado/huevos/legumbre, dias de ejercicio intenso). En las celdas de la tabla semanal a veces aparecen cantidades entre parentesis, ej "Arroz (60g) con verduras con ternera (180g)".

Como leer la tabla semanal (MUY IMPORTANTE):
- Las columnas son los dias (LUNES a DOMINGO) y las filas COMIDA y CENA. Asigna cada plato al dia de la columna en la que esta visualmente, bajo su cabecera.
- Una celda puede ocupar varias lineas y las celdas vecinas pueden tener distinto numero de lineas: nunca muevas un plato a la columna de al lado para "cuadrar" la tabla.
- Cada linea (o grupo de lineas que forman una frase) dentro de una celda suele ser un plato distinto: "Ensalada de tomate" y "Merluza a la plancha" en la misma celda son dos dishes.

Un mismo documento puede contener VARIAS tablas semanales seguidas (varias semanas o alternativas). Debes detectarlas TODAS y devolver una entrada por cada una en el array "dietas", nunca solo la primera.

Reglas de extraccion:
- Para cada celda dia/comida, puede haber uno o mas platos (dishes). Si el texto de la celda tiene varias lineas o esta separado por "+" o similar, sepáralos en varios dishes.
- Si un dish tiene una cantidad entre parentesis (ej "(180g)", "(60g)"), extraela al campo "cantidad" SIN los parentesis, y deja la "descripcion" sin esa cantidad incrustada.
- Si la celda dice "LIBRE" (o equivalente, dia libre sin dieta pautada), crea un dish con libre=true, descripcion="LIBRE", cantidad=null.
- Si una celda esta vacia o no se menciona, deja el array de esa comida vacio ([]).
- El campo "reglasGenerales" solo aplica a la variante completa; ponlo a null si el documento es variante simple o si esa semana no trae paginas de normas propias (puedes repetir el mismo texto de reglas generales en cada semana detectada si aplica a todas).
- No inventes informacion que no este en el documento. Si un dato no aparece, usa null.
- Responde exclusivamente llamando a la herramienta "extraer_dietas" con el JSON solicitado.`;

/**
 * Envia el PDF original (no su texto) para que el modelo vea la tabla con sus columnas:
 * extraer el texto linea a linea pierde los limites de las celdas y desplaza los platos de dia.
 */
async function extractDietsFromPdf(pdfBuffer) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: config.dietParsingModel,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
          },
          { type: 'text', text: 'Extrae todas las dietas semanales de este PDF.' },
        ],
      },
    ],
    tools: [EXTRACT_DIETS_TOOL],
    tool_choice: { type: 'tool', name: 'extraer_dietas' },
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use' && block.name === 'extraer_dietas');
  if (!toolUse) {
    throw new Error('Claude no devolvio una respuesta con la herramienta extraer_dietas');
  }
  return toolUse.input.dietas;
}

const INTERPRET_QUESTION_TOOL = {
  name: 'interpretar_pregunta',
  description: 'Extrae de la pregunta del usuario a que dia y comida se refiere, sin inventar el menu.',
  input_schema: {
    type: 'object',
    properties: {
      dia: {
        type: ['string', 'null'],
        enum: [...DIA_ENUM, null],
        description: 'Dia de la semana al que se refiere la pregunta, resuelto a partir de la fecha actual si es relativo (ej "mañana", "el finde")',
      },
      dias: {
        type: 'array',
        items: { type: 'string', enum: DIA_ENUM },
        description: 'Lista (array JSON, nunca texto) con todos los dias a los que se refiere la pregunta. Un solo dia -> ["jueves"]; "el finde" -> ["sabado", "domingo"]. Si no se puede saber el dia, []',
      },
      comida: {
        type: 'string',
        enum: ['comida', 'cena', 'ambas'],
        description: 'Que momento del dia pregunta el usuario',
      },
      fechaResuelta: {
        type: ['string', 'null'],
        description: 'Si la pregunta menciona o se puede resolver a una fecha concreta, formato YYYY-MM-DD, si no null',
      },
    },
    required: ['dia', 'dias', 'comida', 'fechaResuelta'],
  },
};

/** Conversacion previa como texto, para dar contexto a preguntas de seguimiento ("¿y como la preparo?"). */
function historialToText(historial) {
  if (!historial || historial.length === 0) return '';
  const lineas = historial.map((m) => `${m.autor === 'usuario' ? 'Usuario' : 'Asistente'}: ${m.texto}`);
  return `Conversacion previa (de la mas antigua a la mas reciente):\n${lineas.join('\n')}\n\n`;
}

async function interpretMealQuestion(question, currentDateISO, historial = []) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: config.chatModel,
    max_tokens: 512,
    system:
      'Interpretas preguntas en español sobre la dieta semanal del usuario. NUNCA inventes el menu ni respondas con comida: solo identifica a que dia(s) y momento (comida/cena/ambas) se refiere la pregunta, usando la fecha actual proporcionada para resolver referencias relativas como "mañana", "hoy", "el finde", "pasado mañana". Si la pregunta es una continuacion de la conversacion previa y no menciona dia (ej "¿y como la preparo?", "¿que ingredientes lleva?"), usa el dia y momento de lo ultimo que se hablo. Si la pregunta no tiene que ver con ningun dia concreto (saludo, duda general), devuelve dias []. Responde solo llamando a la herramienta interpretar_pregunta.',
    messages: [
      {
        role: 'user',
        content: `${historialToText(historial)}Fecha actual: ${currentDateISO} (formato YYYY-MM-DD).\nPregunta del usuario: "${question}"`,
      },
    ],
    tools: [INTERPRET_QUESTION_TOOL],
    tool_choice: { type: 'tool', name: 'interpretar_pregunta' },
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use' && block.name === 'interpretar_pregunta');
  if (!toolUse) {
    throw new Error('Claude no devolvio una respuesta con la herramienta interpretar_pregunta');
  }
  return toolUse.input;
}

const CHAT_SYSTEM_PROMPT = `Eres el asistente de NutriSemana, una app personal para seguir la dieta semanal que pauta la nutricionista del usuario. Hablas en español de España, con un tono cercano y natural (tutea), como un amigo que sabe de cocina. Se breve y ve al grano.

Reglas:
- Lo que toca comer sale SOLO de "MENU CONSULTADO". Nunca inventes, cambies ni añadas platos del menu. Si falta informacion (sin dieta asignada, comida libre, nada apuntado), dilo con naturalidad.
- Si piden los ingredientes: da una lista con guiones, un ingrediente por linea. Pon cantidad solo si el plato la trae o si el alimento tiene racion habitual del usuario; el resto sin cantidad o "al gusto". Agrupa por plato si hay varios.
- Si piden como cocinarlo o una receta: propone una preparacion sencilla y saludable acorde a una dieta (plancha, horno, vapor, poco aceite), con pasos numerados cortos y el tiempo aproximado. Puedes dar algun truco o variante de preparacion, pero sin cambiar los platos.
- Si solo preguntan que toca, responde en una o dos frases naturales mencionando los platos.
- Si la pregunta no va sobre un dia concreto, responde de forma util y breve; si hace falta, pregunta a que dia se refiere.
- Formato: texto plano con listas ("- " o "1. ") y **negrita** para destacar; sin tablas ni titulos con #.`;

/**
 * Redacta la respuesta del chat a partir de los datos reales (menu de la base de datos y raciones),
 * adaptandose a lo que se pide: que toca, ingredientes o como cocinarlo.
 */
async function composeChatAnswer({ pregunta, historial = [], fechaActualISO, menuConsultado, raciones = [] }) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: config.chatModel,
    max_tokens: 1024,
    system: CHAT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${historialToText(historial)}Fecha actual: ${fechaActualISO}

MENU CONSULTADO (datos reales de la dieta del usuario):
${menuConsultado || 'La pregunta no se refiere a ningun dia concreto.'}

Raciones habituales del usuario por comida:
${racionesToText(raciones)}

Pregunta del usuario: "${pregunta}"`,
      },
    ],
  });

  const texto = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!texto) {
    throw new Error('Claude no devolvio texto para la respuesta del chat');
  }
  return texto;
}

const EXTRACT_INGREDIENTS_TOOL = {
  name: 'extraer_ingredientes',
  description: 'Descompone la descripcion de un plato en ingredientes individuales, categorizados.',
  input_schema: {
    type: 'object',
    properties: {
      ingredientes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string', description: 'Nombre del ingrediente en singular, ej "tomate", "pechuga de pollo"' },
            categoria: {
              type: 'string',
              enum: ['verdura_fruta', 'carne_pescado', 'legumbre_cereal', 'lacteos', 'otros'],
            },
            cantidad: {
              type: ['number', 'null'],
              description: 'Cantidad numerica para UNA comida (ej 200). null si el plato no trae cantidad y el alimento no tiene racion habitual',
            },
            unidad: {
              type: ['string', 'null'],
              enum: ['g', 'ml', 'unidades', null],
              description: 'Unidad de la cantidad. null si cantidad es null',
            },
          },
          required: ['nombre', 'categoria', 'cantidad', 'unidad'],
        },
      },
    },
    required: ['ingredientes'],
  },
};

function racionesToText(raciones) {
  if (!raciones || raciones.length === 0) return 'Sin raciones habituales definidas.';
  return raciones.map((r) => `- ${r.alimento}: ${r.cantidad}`).join('\n');
}

async function extractIngredientsFromDish(descripcion, cantidad, raciones = []) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: config.ingredientModel,
    max_tokens: 1024,
    system: `Descompones un plato de comida español en sus ingredientes individuales basicos para hacer la lista de la compra de UNA persona. Usa nombres de ingrediente genericos y en singular.

Cantidades (por ingrediente, para esa unica comida):
1. Si el plato trae cantidad, repartela entre sus ingredientes.
2. Si no trae cantidad, usa la racion habitual del usuario segun el tipo de alimento:
${racionesToText(raciones)}
3. Para legumbre, arroz, pasta, quinoa y similares usa la cantidad en crudo (es como se compran), salvo que el plato diga expresamente cocido o de bote: entonces usa la cantidad cocida.
4. Si el ingrediente no encaja en ninguna racion habitual (verduras, frutas, aliños, especias...), cantidad y unidad null. NUNCA inventes ni estimes cantidades fuera de estas reglas.

Responde solo llamando a la herramienta extraer_ingredientes.`,
    messages: [
      {
        role: 'user',
        content: `Plato: "${descripcion}"${cantidad ? ` (cantidad total: ${cantidad})` : ''}`,
      },
    ],
    tools: [EXTRACT_INGREDIENTS_TOOL],
    tool_choice: { type: 'tool', name: 'extraer_ingredientes' },
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use' && block.name === 'extraer_ingredientes');
  if (!toolUse) {
    throw new Error('Claude no devolvio una respuesta con la herramienta extraer_ingredientes');
  }
  // El modelo a veces devuelve el array serializado como texto.
  let ingredientes = toolUse.input.ingredientes;
  if (typeof ingredientes === 'string') {
    try {
      ingredientes = JSON.parse(ingredientes);
    } catch {
      ingredientes = [];
    }
  }
  return Array.isArray(ingredientes) ? ingredientes.filter((ing) => ing && typeof ing.nombre === 'string') : [];
}

module.exports = {
  extractDietsFromPdf,
  interpretMealQuestion,
  composeChatAnswer,
  extractIngredientsFromDish,
  DIA_ENUM,
};
