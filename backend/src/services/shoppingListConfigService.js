const ShoppingListConfig = require('../models/ShoppingListConfig');

async function getConfig() {
  let config = await ShoppingListConfig.findOne();
  if (!config) {
    config = await ShoppingListConfig.create({});
  }
  return config;
}

async function updateConfig(updates) {
  const config = await getConfig();
  if (updates.diaCompra) config.diaCompra = updates.diaCompra;
  if (updates.momentoCompra) config.momentoCompra = updates.momentoCompra;
  if (Array.isArray(updates.exclusionesManualesExtra)) {
    config.exclusionesManualesExtra = updates.exclusionesManualesExtra;
  }
  if (Array.isArray(updates.raciones)) {
    config.raciones = updates.raciones.filter((r) => r && r.alimento?.trim() && r.cantidad?.trim());
  }
  await config.save();
  return config;
}

module.exports = { getConfig, updateConfig };
