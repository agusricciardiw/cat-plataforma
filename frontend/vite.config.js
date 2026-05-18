import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Lee variables VITE_* desde el .env de la raiz del repo (un solo lugar
  // compartido entre front y back), no desde frontend/.env.
  envDir: '..',
})
