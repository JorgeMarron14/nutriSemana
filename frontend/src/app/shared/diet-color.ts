/** Colores de la paleta para distinguir de un vistazo que semanas comparten dieta. */
const COLORES_DIETA = ['#2e7d32', '#ffa726', '#ff8a65', '#7cb342', '#26a69a', '#8d6e63', '#5c6bc0', '#ec407a'];

/** Color estable para una dieta (el mismo en Plan y en Compra), derivado de su id. */
export function colorDieta(dietId: string | null | undefined): string {
  if (!dietId) return 'var(--ns-border)';
  let hash = 0;
  for (const c of dietId) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES_DIETA[hash % COLORES_DIETA.length];
}
