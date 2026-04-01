/**
 * Minimal static file server for production (Railway).
 * Serves the Vite build output in `dist/` with SPA fallback to index.html.
 * No external dependencies — pure Node.js built-ins only.
 */
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname, resolve, normalize } from 'path'
import { fileURLToPath } from 'url'

const PORT = parseInt(process.env.PORT ?? '4173')
const dist = fileURLToPath(new URL('dist', import.meta.url))

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
}

const indexHtml = readFileSync(join(dist, 'index.html'))

createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0]
  const safePath = normalize(url).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = resolve(dist, '.' + safePath)

  // Prevent path traversal attacks
  if (!filePath.startsWith(dist)) {
    res.writeHead(403)
    res.end()
    return
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const mime = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime })
    res.end(readFileSync(filePath))
  } else {
    // SPA fallback — let the client-side router handle the route
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(indexHtml)
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[web] Listening on http://0.0.0.0:${PORT}`)
})
