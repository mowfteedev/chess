import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const cli = 'node_modules/.bin/supabase'
const run = (args) =>
  execFileSync(cli, ['--agent', 'no', '--output-format', 'text', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
try {
  try {
    run(['status', '--output', 'json'])
  } catch {
    run([
      'start',
      '-x',
      'studio,postgres-meta,storage-api,imgproxy,mailpit,logflare,vector,supavisor',
    ])
  }
  run(['migration', 'up', '--local'])
  const values = JSON.parse(run(['status', '--output', 'json']))
  const url = values.API_URL ?? values.api_url
  const key = values.PUBLISHABLE_KEY ?? values.ANON_KEY ?? values.anon_key
  if (!url || !key || !url.startsWith('http://127.0.0.1:56321'))
    throw new Error('Expected the dedicated local test stack on port 56321')
  writeFileSync(
    '.env.test.local',
    `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
  )
  console.log(
    'Local Supabase test stack ready; public client configuration saved to ignored .env.test.local',
  )
} catch (error) {
  console.error('Could not prepare the isolated local Supabase test stack:', error.message)
  process.exit(1)
}
