const express = require('express');
const multer = require('multer');
const Diet = require('../models/Diet');
const { parseDietPdf } = require('../services/dietParser');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se admiten archivos PDF'));
    }
    return cb(null, true);
  },
});

/**
 * @openapi
 * /api/diets/parse:
 *   post:
 *     summary: Sube uno o varios PDF de dieta y devuelve las dietas detectadas (sin guardar)
 *     tags: [Diets]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Dietas detectadas, listas para previsualizar/editar antes de guardar
 */
router.post('/parse', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Sube al menos un PDF en el campo "files"' });
  }

  try {
    const resultados = [];
    for (const file of req.files) {
      const dietas = await parseDietPdf(file.buffer);
      dietas.forEach((diet) => resultados.push({ ...diet, origenPdf: file.originalname }));
    }
    res.json({ dietas: resultados });
  } catch (err) {
    res.status(422).json({ error: `No se pudo parsear el PDF: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/diets:
 *   get:
 *     summary: Lista todas las dietas guardadas
 *     tags: [Diets]
 *     responses:
 *       200:
 *         description: Listado de dietas
 *   post:
 *     summary: Guarda una o varias dietas (normalmente tras revisar/editar el resultado de /parse)
 *     tags: [Diets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dietas:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       201:
 *         description: Dietas guardadas
 */
router.get('/', async (req, res) => {
  const dietas = await Diet.find().sort({ createdAt: -1 });
  res.json(dietas);
});

router.post('/', async (req, res) => {
  const dietas = Array.isArray(req.body.dietas) ? req.body.dietas : [req.body];
  if (dietas.length === 0) {
    return res.status(400).json({ error: 'No se recibio ninguna dieta para guardar' });
  }

  try {
    const guardadas = await Diet.insertMany(dietas);
    res.status(201).json(guardadas);
  } catch (err) {
    res.status(400).json({ error: `No se pudieron guardar las dietas: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/diets/{id}:
 *   get:
 *     summary: Obtiene una dieta por id
 *     tags: [Diets]
 *   put:
 *     summary: Actualiza una dieta (edicion manual)
 *     tags: [Diets]
 *   delete:
 *     summary: Elimina una dieta
 *     tags: [Diets]
 */
router.get('/:id', async (req, res) => {
  const diet = await Diet.findById(req.params.id);
  if (!diet) return res.status(404).json({ error: 'Dieta no encontrada' });
  res.json(diet);
});

router.put('/:id', async (req, res) => {
  try {
    const diet = await Diet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!diet) return res.status(404).json({ error: 'Dieta no encontrada' });
    res.json(diet);
  } catch (err) {
    res.status(400).json({ error: `No se pudo actualizar la dieta: ${err.message}` });
  }
});

router.delete('/:id', async (req, res) => {
  const diet = await Diet.findByIdAndDelete(req.params.id);
  if (!diet) return res.status(404).json({ error: 'Dieta no encontrada' });
  res.status(204).send();
});

module.exports = router;
