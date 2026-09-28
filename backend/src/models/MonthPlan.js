const mongoose = require('mongoose');

const semanaAsignadaSchema = new mongoose.Schema(
  {
    fechaInicioSemana: { type: Date, required: true },
    dietId: { type: mongoose.Schema.Types.ObjectId, ref: 'Diet', default: null },
  },
  { _id: false }
);

const monthPlanSchema = new mongoose.Schema(
  {
    mes: { type: Number, required: true, min: 1, max: 12 },
    anio: { type: Number, required: true },
    semanas: { type: [semanaAsignadaSchema], default: [] },
  },
  { timestamps: true }
);

monthPlanSchema.index({ anio: 1, mes: 1 }, { unique: true });

module.exports = mongoose.model('MonthPlan', monthPlanSchema);
