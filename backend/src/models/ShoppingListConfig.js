const mongoose = require('mongoose');

const DIAS_SEMANA = require('./Diet').DIAS_SEMANA;

const exclusionSchema = new mongoose.Schema(
  {
    dia: { type: String, enum: DIAS_SEMANA, required: true },
    comida: { type: String, enum: ['comida', 'cena'], required: true },
  },
  { _id: false }
);

const racionSchema = new mongoose.Schema(
  {
    alimento: { type: String, required: true, trim: true },
    cantidad: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/** Cantidades que el usuario suele tomar por comida; la IA las usa cuando el plato no trae cantidad. */
const DEFAULT_RACIONES = [
  { alimento: 'Pescado', cantidad: '200 g' },
  { alimento: 'Carne', cantidad: '150 g' },
  { alimento: 'Legumbre', cantidad: '60 g en crudo (280 g cocida)' },
  { alimento: 'Huevos', cantidad: '2 unidades' },
  { alimento: 'Arroz, pasta, quinoa', cantidad: '60 g en crudo (150 g cocido)' },
  { alimento: 'Patata', cantidad: '250 g' },
];

const DEFAULT_EXCLUSIONES_MANUALES = [
  { dia: 'viernes', comida: 'cena' },
  { dia: 'sabado', comida: 'comida' },
  { dia: 'sabado', comida: 'cena' },
  { dia: 'domingo', comida: 'comida' },
  { dia: 'domingo', comida: 'cena' },
];

const shoppingListConfigSchema = new mongoose.Schema(
  {
    diaCompra: { type: String, enum: DIAS_SEMANA, default: 'lunes' },
    momentoCompra: { type: String, enum: ['mañana', 'tarde'], default: 'tarde' },
    exclusionesManualesExtra: { type: [exclusionSchema], default: () => DEFAULT_EXCLUSIONES_MANUALES },
    raciones: { type: [racionSchema], default: () => DEFAULT_RACIONES },
  },
  { timestamps: true }
);

shoppingListConfigSchema.statics.DEFAULT_EXCLUSIONES_MANUALES = DEFAULT_EXCLUSIONES_MANUALES;
shoppingListConfigSchema.statics.DEFAULT_RACIONES = DEFAULT_RACIONES;

module.exports = mongoose.model('ShoppingListConfig', shoppingListConfigSchema);
