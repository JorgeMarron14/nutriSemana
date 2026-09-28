# NutriSemana

Gestor personal de dietas semanales. Permite subir los PDF de dieta de mi
nutricionista, planificar qué semana de dieta aplicar a cada semana del mes,
y genera automáticamente la lista de la compra excluyendo las comidas que
no necesito comprar (viernes cena, fin de semana). Incluye un chat rápido
para preguntar qué toca comer o cenar un día concreto.

## Funcionalidades
- 📄 **Carga de dietas por PDF**: parsing automático (vía Claude API) de los
  PDF de dieta a un formato estructurado, con previsualización y edición
  antes de guardar.
- 🗓️ **Planificador mensual**: asigna una dieta guardada a cada semana natural
  del mes.
- 🛒 **Lista de la compra semanal**: generada a partir de la dieta asignada,
  agrupada por categorías, con la lógica de compra los lunes por la tarde
  (excluye lo ya consumido y los días sin necesidad de compra).
- 💬 **Chat de consulta rápida**: pregunta en lenguaje natural qué comer o
  cenar un día y obtén la respuesta directamente desde tus datos.

## Stack
- **Frontend**: Ionic + Angular (standalone components)
- **Backend**: Node.js + Express
- **Base de datos**: MongoDB
- **IA**: Claude API (parsing de PDF y comprensión de lenguaje natural en el chat)

## Estructura del proyecto
```
backend/   API REST (Express + Mongoose), parser de PDF, tests (Jest)
frontend/  App Ionic/Angular (standalone)
```

## Puesta en marcha

### Backend
```
cd backend
npm install
cp .env.example .env   # completa MONGODB_URI, JWT_SECRET, AUTH_EMAIL/AUTH_PASSWORD_HASH y ANTHROPIC_API_KEY
npm run dev             # http://localhost:3000, docs en /api/docs
npm test                # tests del modelo de datos y el parser de PDF
```

Genera el hash de tu contraseña para `AUTH_PASSWORD_HASH` con:
```
node -e "console.log(require('bcryptjs').hashSync('tu-password', 10))"
```

### Frontend
```
cd frontend
npm install
npm start   # http://localhost:4200 (o ng serve --port 8100)
```

La URL de la API se configura en `frontend/src/environments/environment.ts` (por defecto `http://localhost:3000/api`).

> Proyecto personal, uso individual.