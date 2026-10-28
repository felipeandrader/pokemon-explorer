'use strict'
const http           = require('http')
const fs             = require('fs')
const path           = require('path')
const { exec }       = require('child_process')

const PORT = 3000
const DIST = path.join(__dirname, 'dist')

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.webp':  'image/webp',
  '.ogg':   'audio/ogg',
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0]
  let filePath = path.join(DIST, url === '/' ? 'index.html' : url)

  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
  } catch {
    // file not found → SPA fallback
    filePath = path.join(DIST, 'index.html')
  }

  const ext         = path.extname(filePath).toLowerCase()
  const contentType = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
})

server.on('error', err => {
  console.error('Error:', err.message)
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Pokemon Space Explorer running at http://localhost:${PORT}`)
  exec(`start http://localhost:${PORT}`)
})
