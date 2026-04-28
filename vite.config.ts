import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Actions sets GITHUB_ACTIONS=true; use repo subpath as base in that case
  base: process.env.GITHUB_ACTIONS ? '/PuzzleDog/' : '/',
})
