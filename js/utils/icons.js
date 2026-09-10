// Helper para inicializar e gerenciar ícones da biblioteca Lucide
export function initIcons() {
  if (typeof window.lucide !== 'undefined' && window.lucide.createIcons) {
    window.lucide.createIcons();
  } else {
    console.warn('Biblioteca Lucide Icons ainda não está disponível.');
  }
}

/**
 * Cria um elemento de ícone Lucide programaticamente
 */
export function createIconElement(iconName, extraClasses = '') {
  const i = document.createElement('i');
  i.setAttribute('data-lucide', iconName);
  if (extraClasses) {
    i.className = extraClasses;
  }
  return i;
}
