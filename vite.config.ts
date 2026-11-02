import { defineConfig } from 'vite';

// base './' keeps asset paths relative, so the build folder works as an itch.io HTML5 upload.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
