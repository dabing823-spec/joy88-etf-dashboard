import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use('/joy88-etf-dashboard/data', (req, res, next) => {
          const filePath = resolve(__dirname, 'data', req.url!.split('?')[0].replace(/^\//, ''))
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/json')
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
  ],
  base: '/joy88-etf-dashboard/',
  build: {
    outDir: 'dist',
  },
})
