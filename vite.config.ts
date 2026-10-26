import { defineConfig, type Plugin } from 'vite'
import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

let revision = process.env.GITHUB_SHA?.slice(0, 7) || 'local'
if (revision === 'local') {
  try {
    revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    /* Source archives may omit Git. */
  }
}
const release = {
  version: `${revision}-${Date.now().toString(36)}`,
  revision,
  builtAt: new Date().toISOString(),
}
function releaseInfo(): Plugin {
  return {
    name: 'gambit-release',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(release) })
    },
    configureServer(server) {
      server.middlewares.use('/version.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(release))
      })
    },
  }
}
export default defineConfig({
  plugins: [react(), tailwindcss(), releaseInfo()],
  define: { __APP_RELEASE__: JSON.stringify(release) },
  base: './',
})
