const mongoose = require('mongoose');

const DIAS_SEMANA = require('./Diet').DIAS_SEMANA;

/** Comida concreta de la semana en la que aparece un ingrediente. */
const aparicionSchema = new mongoose.Schema(
  {
    dia: { type: String, enum: DIAS_SEMANA, required: true },
    comida: { type: String, enum: ['comida', 'cena'], required: true },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    categoria: {
      type: String,
      enum: ['verdura_fruta', 'carne_pescado', 'legumbre_cereal', 'lacteos', 'otros'],
      default: 'otros',
    },
    cantidad: { type: String, default: null },
    comprado: { type: Boolean, default: false },
    apariciones: { type: [aparicionSchema], default: [] },
  },
  { _id: true }
);

const shoppingListSchema = new mongoose.Schema(
  {
    monthPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthPlan', required: true },
    fechaInicioSemana: { type: Date, required: true },
    dietId: { type: mongoose.Schema.Types.ObjectId, ref: 'Diet', required: true },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
