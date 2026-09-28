const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

class PageWriter {
  constructor(doc, font) {
    this.doc = doc;
    this.font = font;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  line(text = '') {
    if (this.y < MARGIN) {
      this.newPage();
    }
    this.page.drawText(text, { x: MARGIN, y: this.y, size: FONT_SIZE, font: this.font });
    this.y -= LINE_HEIGHT;
  }

  blank() {
    this.y -= LINE_HEIGHT / 2;
  }
}

// Variante A: cabecera simple + una tabla semanal, texto libre sin cantidades.
function renderVariantA(w) {
  w.line('NOMBRE: Jorge Marron');
  w.line('FECHA: 03/08/2026');
  w.line('KCAL: 1800');
  w.line('% H/P/G: 45/30/25');
  w.line('PATOLOGIA: -');
  w.blank();
  w.line('LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO | DOMINGO');
  w.blank();
  w.line('COMIDA');
  w.line('Ensalada de tomate');
  w.line('Merluza a la plancha');
  w.line('---');
  w.line('Lentejas estofadas');
  w.line('---');
  w.line('Crema de calabacin');
  w.line('Pollo al horno');
  w.line('---');
  w.line('Arroz con verduras');
  w.line('---');
  w.line('Garbanzos con espinacas');
  w.line('---');
  w.line('Paella de marisco');
  w.line('---');
  w.line('Cocido madrileno');
  w.blank();
  w.line('CENA');
  w.line('Tortilla francesa');
  w.line('---');
  w.line('Pescado blanco al vapor');
  w.line('---');
  w.line('Pavo a la plancha con ensalada');
  w.line('---');
  w.line('Sopa de verduras');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');
}

// Variante B: cabecera + normas generales (desayuno, entre horas, gramajes) +
// tabla semanal con cantidades entre parentesis, y dos semanas seguidas.
function renderVariantB(w) {
  w.line('NOMBRE: Jorge Marron');
  w.line('FECHA: 10/08/2026');
  w.line('KCAL: 2000');
  w.line('% H/P/G: 40/30/30');
  w.line('PATOLOGIA: -');
  w.blank();

  w.line('DESAYUNO / MEDIA MANANA');
  w.line('OPCION 1: Tostada integral con aceite y tomate + cafe con leche');
  w.line('OPCION 2: Yogur natural con avena y fruta');
  w.blank();

  w.line('ENTRE HORAS / POR LA TARDE');
  w.line('OPCION 1: Punado de frutos secos');
  w.line('OPCION 2: Pieza de fruta');
  w.blank();

  w.line('NORMAS GENERALES DE COMIDAS Y CENAS');
  w.line('Carne: 180-250g. Pescado: 200-300g. Huevos: 2 unidades. Legumbre: 60-80g en seco.');
  w.line('Dias de ejercicio intenso: aumentar arroz/pasta/patata a 80-100g en seco.');
  w.blank();

  w.newPage();
  w.line('SEMANA 1');
  w.blank();
  w.line('LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO | DOMINGO');
  w.line('COMIDA');
  w.line('Arroz (60g) con verduras con ternera (180g)');
  w.line('---');
  w.line('Lentejas (80g) estofadas con pavo (150g)');
  w.line('---');
  w.line('Pollo asado (300g) con patata (250g)');
  w.line('---');
  w.line('Merluza (250g) a la plancha con ensalada');
  w.line('---');
  w.line('Pasta (70g) con salsa de tomate y atun (150g)');
  w.line('---');
  w.line('Paella de marisco (300g)');
  w.line('---');
  w.line('Cocido madrileno');
  w.blank();
  w.line('CENA');
  w.line('Tortilla de claras (4 unidades)');
  w.line('---');
  w.line('Pescado blanco (200g) al vapor');
  w.line('---');
  w.line('Pavo a la plancha (180g) con ensalada');
  w.line('---');
  w.line('Crema de verduras con huevo (2 unidades)');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');

  w.newPage();
  w.line('SEMANA 2 (ALTERNATIVA)');
  w.blank();
  w.line('LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO | DOMINGO');
  w.line('COMIDA');
  w.line('Quinoa (60g) con verduras y pollo (180g)');
  w.line('---');
  w.line('Garbanzos (80g) con espinacas y bacalao (150g)');
  w.line('---');
  w.line('Ternera (200g) con patata asada (200g)');
  w.line('---');
  w.line('Salmon (200g) al horno con ensalada');
  w.line('---');
  w.line('Arroz (70g) tres delicias con gambas (150g)');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('Fabada asturiana');
  w.blank();
  w.line('CENA');
  w.line('Revuelto de champinones (2 huevos)');
  w.line('---');
  w.line('Merluza (200g) a la plancha');
  w.line('---');
  w.line('Pechuga de pollo (180g) con verduras salteadas');
  w.line('---');
  w.line('Sopa de pescado');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');
  w.line('---');
  w.line('LIBRE');
}

async function buildPdf(renderFn) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const writer = new PageWriter(doc, font);
  renderFn(writer);
  return doc.save();
}

async function main() {
  const outDir = __dirname;

  const bytesA = await buildPdf(renderVariantA);
  fs.writeFileSync(path.join(outDir, 'dieta-variante-a.pdf'), bytesA);

  const bytesB = await buildPdf(renderVariantB);
  fs.writeFileSync(path.join(outDir, 'dieta-variante-b.pdf'), bytesB);

  console.log('Fixtures generadas en', outDir);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
