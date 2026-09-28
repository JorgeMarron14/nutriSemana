const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth.routes');
const dietRoutes = require('./routes/diet.routes');
const monthPlanRoutes = require('./routes/monthPlan.routes');
const shoppingListRoutes = require('./routes/shoppingList.routes');
const settingsRoutes = require('./routes/settings.routes');
const chatRoutes = require('./routes/chat.routes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/auth', authRoutes);

  app.use('/api/diets', requireAuth, dietRoutes);
  app.use('/api/monthplans', requireAuth, monthPlanRoutes);
  app.use('/api/shopping-list', requireAuth, shoppingListRoutes);
  app.use('/api/settings', requireAuth, settingsRoutes);
  app.use('/api/chat', requireAuth, chatRoutes);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
