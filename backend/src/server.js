const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { port } = require('./config/env');

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(port, () => {
    console.log(`NutriSemana API escuchando en http://localhost:${port}`);
    console.log(`Documentacion Swagger en http://localhost:${port}/api/docs`);
  });
}

main().catch((err) => {
  console.error('Error arrancando el servidor:', err);
  process.exit(1);
});
