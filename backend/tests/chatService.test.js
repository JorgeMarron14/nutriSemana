jest.mock('../src/services/claudeClient');
jest.mock('../src/services/monthPlanService', () => ({
  ...jest.requireActual('../src/services/monthPlanService'),
  findWeekForDate: jest.fn(),
}));
jest.mock('../src/services/shoppingListConfigService');
jest.mock('../src/models/Diet', () => {
  const actual = jest.requireActual('../src/models/Diet');
  actual.findById = jest.fn();
  return actual;
});

const claudeClient = require('../src/services/claudeClient');
const monthPlanService = require('../src/services/monthPlanService');
const shoppingListConfigService = require('../src/services/shoppingListConfigService');
const Diet = require('../src/models/Diet');
const { normalizeInterpretation, normalizeHistorial, answerMealQuestion } = require('../src/services/chatService');

describe('normalizeInterpretation', () => {
  test('dias como texto "null" no se recorre letra a letra; se deduce el dia de la fecha resuelta', () => {
    // 2026-09-28 es lunes
    const result = normalizeInterpretation({ dia: null, dias: 'null', comida: 'cena', fechaResuelta: '2026-09-28' });
    expect(result).toEqual({ dias: ['lunes'], comida: 'cena', fechaResuelta: '2026-09-28' });
  });

  test('acepta un array serializado como texto', () => {
    const result = normalizeInterpretation({ dias: '["sabado", "domingo"]', comida: 'ambas', fechaResuelta: null });
    expect(result.dias).toEqual(['sabado', 'domingo']);
  });

  test('usa "dia" si "dias" viene vacio y normaliza tildes', () => {
    const result = normalizeInterpretation({ dia: 'Miércoles', dias: [], comida: 'comida', fechaResuelta: null });
    expect(result.dias).toEqual(['miercoles']);
  });

  test('descarta valores no validos', () => {
    const result = normalizeInterpretation({ dia: 'null', dias: ['n', 'u'], comida: 'merienda', fechaResuelta: 'null' });
    expect(result).toEqual({ dias: [], comida: 'ambas', fechaResuelta: null });
  });
});

describe('normalizeHistorial', () => {
  test('se queda con los ultimos mensajes validos y descarta basura', () => {
    const historial = [
      { autor: 'sistema', texto: 'no vale' },
      { autor: 'usuario', texto: '   ' },
      ...Array.from({ length: 12 }, (_, i) => ({ autor: i % 2 ? 'app' : 'usuario', texto: `m${i}` })),
    ];
    const result = normalizeHistorial(historial);
    expect(result).toHaveLength(10);
    expect(result[0].texto).toBe('m2');
    expect(normalizeHistorial('no es un array')).toEqual([]);
  });
});

describe('answerMealQuestion', () => {
  afterEach(() => jest.clearAllMocks());

  test('pasa el menu real y las raciones al redactor y devuelve su respuesta', async () => {
    claudeClient.interpretMealQuestion.mockResolvedValue({ dia: 'lunes', dias: ['lunes'], comida: 'cena', fechaResuelta: '2026-09-28' });
    monthPlanService.findWeekForDate.mockResolvedValue({ dietId: 'diet1' });
    Diet.findById.mockResolvedValue({
      semana: {
        lunes: {
          comida: [],
          cena: [
            { descripcion: 'Ensalada de tomate', cantidad: null, libre: false },
            { descripcion: 'Merluza a la plancha', cantidad: null, libre: false },
          ],
        },
      },
    });
    const raciones = [{ alimento: 'Pescado', cantidad: '200 g' }];
    shoppingListConfigService.getConfig.mockResolvedValue({ raciones });
    claudeClient.composeChatAnswer.mockResolvedValue('Para la cena de hoy necesitas:\n- Tomate\n- Merluza (200 g)');

    const historial = [{ autor: 'usuario', texto: '¿que ceno hoy?' }, { autor: 'app', texto: 'Ensalada y merluza' }];
    const result = await answerMealQuestion('¿Que ingredientes necesito para la cena de hoy?', new Date(2026, 8, 28, 12), historial);

    expect(claudeClient.interpretMealQuestion).toHaveBeenCalledWith(expect.any(String), '2026-09-28', historial);
    const args = claudeClient.composeChatAnswer.mock.calls[0][0];
    expect(args.menuConsultado).toBe('- lunes 2026-09-28, cena: Ensalada de tomate; Merluza a la plancha');
    expect(args.raciones).toBe(raciones);
    expect(result.respuesta).toContain('Merluza (200 g)');
  });

  test('sin dia concreto no consulta la base de datos pero responde igualmente', async () => {
    claudeClient.interpretMealQuestion.mockResolvedValue({ dia: null, dias: [], comida: 'ambas', fechaResuelta: null });
    shoppingListConfigService.getConfig.mockResolvedValue({ raciones: [] });
    claudeClient.composeChatAnswer.mockResolvedValue('¡Hola! ¿Para que dia quieres saber el menu?');

    const result = await answerMealQuestion('hola', new Date(2026, 8, 28));

    expect(monthPlanService.findWeekForDate).not.toHaveBeenCalled();
    expect(claudeClient.composeChatAnswer.mock.calls[0][0].menuConsultado).toBe('');
    expect(result).toEqual({ respuesta: '¡Hola! ¿Para que dia quieres saber el menu?', detalles: [] });
  });
});
