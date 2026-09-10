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
    const serve = (_req, res, next) => {
      const file = path.resolve(here, '../supabase-config.js')
      if (!fs.existsSync(file)) return next()
      res.setHeader('Content-Type', 'application/javascript')
      res.setHeader('Cache-Control', 'no-store')
      res.end(fs.readFileSync(file))
    }
    // The dev server rewrites the <script src="/supabase-config.js"> tag to the
    // /draw/ base, so answer at both paths; production serves the real file at
    // the domain root and never rewrites it.
    server.middlewares.use('/supabase-config.js', serve)
    server.middlewares.use('/draw/supabase-config.js', serve)
  },
})

export default defineConfig({
  base: '/draw/',
  plugins: [react(), serveRootConfig()],
})
