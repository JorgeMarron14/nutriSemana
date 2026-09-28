import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.nutrisemana.app',
  appName: 'NutriSemana',
  // Salida de `ng build` (builder application de Angular).
  webDir: 'dist/frontend/browser',
  android: {
    // El backend va por HTTPS (Render); no se permite trafico HTTP sin cifrar.
    allowMixedContent: false,
  },
};

export default config;
