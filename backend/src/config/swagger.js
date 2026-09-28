const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NutriSemana API',
      version: '1.0.0',
      description: 'API REST para gestionar dietas semanales, planificacion mensual y lista de la compra',
    },
    servers: [{ url: '/api', description: 'API' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});

module.exports = swaggerSpec;
