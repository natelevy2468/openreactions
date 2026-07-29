import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// The backend keys live in one file at the repo root (supabase-config.js) so the
// homepage and this app can't drift apart. In production it sits next to
// index.html at the domain root; in dev this app is served on its own port, so
// hand the same file out there too and /supabase-config.js resolves in both.
const serveRootConfig = () => ({
  name: 'openreactions-serve-root-config',
  configureServer(server) {
    server.middlewares.use('/supabase-config.js', (_req, res, next) => {
      const file = path.resolve(here, '../supabase-config.js')
      if (!fs.existsSync(file)) return next()
      res.setHeader('Content-Type', 'application/javascript')
      res.setHeader('Cache-Control', 'no-store')
      res.end(fs.readFileSync(file))
    })
  },
})

export default defineConfig({
  base: '/draw/',
  plugins: [react(), serveRootConfig()],
})
