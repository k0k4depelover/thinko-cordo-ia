import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ecomp-loader',
      transform(code, id) {
        if (id.endsWith('.ecomp')) {
          const json = readFileSync(id, 'utf-8');
          return {
            code: `export default ${json}`,
            map: null,
          };
        }
      },
    },
  ],
})
