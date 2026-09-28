const mongoose = require('mongoose');

const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

const dishSchema = new mongoose.Schema(
  {
    descripcion: { type: String, required: true, trim: true },
    cantidad: { type: String, default: null, trim: true },
    libre: { type: Boolean, default: false },
  },
  { _id: false }
);

const dayPlanSchema = new mongoose.Schema(
  {
    comida: { type: [dishSchema], default: [] },
    cena: { type: [dishSchema], default: [] },
  },
  { _id: false }
);

const semanaSchema = new mongoose.Schema(
  DIAS_SEMANA.reduce((shape, dia) => {
    shape[dia] = { type: dayPlanSchema, default: () => ({ comida: [], cena: [] }) };
    return shape;
  }, {}),
  { _id: false }
);

const dietSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    fechaOrigenPdf: { type: Date, default: null },
    reglasGenerales: { type: String, default: null },
    semana: { type: semanaSchema, required: true },
    origenPdf: { type: String, default: null },
  },
  { timestamps: true }
);

dietSchema.statics.DIAS_SEMANA = DIAS_SEMANA;

module.exports = mongoose.model('Diet', dietSchema);
module.exports.DIAS_SEMANA = DIAS_SEMANA;
