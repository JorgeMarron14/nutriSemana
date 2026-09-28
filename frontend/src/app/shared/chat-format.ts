function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(texto: string): string {
  return escapeHtml(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Convierte el texto del asistente (parrafos, listas "- " / "1. " y **negrita**) en HTML.
 * Todo el texto se escapa antes de insertar etiquetas, asi que no se puede inyectar HTML.
 */
export function formatearRespuesta(texto: string): string {
  const html: string[] = [];
  let lista: 'ul' | 'ol' | null = null;

  const cerrarLista = () => {
    if (lista) html.push(`</${lista}>`);
    lista = null;
  };

  for (const linea of texto.split('\n')) {
    const vineta = linea.match(/^\s*[-*•]\s+(.*)$/);
    const numero = linea.match(/^\s*\d+[.)]\s+(.*)$/);
    const tipo = vineta ? 'ul' : numero ? 'ol' : null;

    if (tipo) {
      if (lista !== tipo) {
        cerrarLista();
        html.push(`<${tipo}>`);
        lista = tipo;
      }
      html.push(`<li>${inline((vineta ?? numero)![1])}</li>`);
    } else {
      cerrarLista();
      if (linea.trim()) html.push(`<p>${inline(linea.trim())}</p>`);
    }
  }
  cerrarLista();
  return html.join('');
}
