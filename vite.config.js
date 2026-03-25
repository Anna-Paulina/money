import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change '/stock-tracker/' to match your GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/stock-tracker/',
})
