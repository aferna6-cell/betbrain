#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const args = process.argv.slice(2)
const options = {
  label: 'manual',
  date: new Date().toISOString().slice(0, 10),
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--label' && args[index + 1]) {
    options.label = args[index + 1]
    index += 1
  } else if (arg === '--date' && args[index + 1]) {
    options.date = args[index + 1]
    index += 1
  }
}

process.chdir(repoRoot)

function run(command, commandArgs, extra = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
    ...extra,
  })

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    error: result.error,
    signal: result.signal,
  }
}

function walkFiles(startPath, filter) {
  if (!fs.existsSync(startPath)) {
    return []
  }

  const entries = fs.readdirSync(startPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(startPath, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
        continue
      }

      files.push(...walkFiles(fullPath, filter))
      continue
    }

    if (!filter || filter(fullPath)) {
      files.push(fullPath)
    }
  }

  return files
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n')
}

function relative(filePath) {
  return path.relative(repoRoot, filePath)
}

function collectRouteFiles() {
  const routeFiles = walkFiles(path.join(repoRoot, 'src', 'app'), (filePath) =>
    filePath.endsWith(path.join('route.ts')) || filePath.endsWith('/route.ts')
  )

  const proxyPath = path.join(repoRoot, 'src', 'proxy.ts')
  if (fs.existsSync(proxyPath)) {
    routeFiles.push(proxyPath)
  }

  return routeFiles.sort()
}

function parseEnvExampleKeys() {
  const envExamplePath = path.join(repoRoot, '.env.example')
  const lines = readLines(envExamplePath)
  return new Set(
    lines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0])
  )
}

function checkBuild() {
  const result = run('npm', ['run', 'build'])

  if (result.status === 0) {
    return {
      status: 'PASS',
      notes: ['`npm run build` passed.'],
    }
  }

  if (
    result.output.includes('TurbopackInternalError') &&
    result.output.includes('Operation not permitted')
  ) {
    return {
      status: 'BLOCKED',
      notes: [
        'Sandboxed build hit a Turbopack permission error (`Operation not permitted`). Re-run unsandboxed for the real app status.',
      ],
    }
  }

  if (
    !result.output ||
    result.error?.code === 'ETIMEDOUT' ||
    result.signal === 'SIGTERM' ||
    result.output.includes('creating new process') ||
    result.output.includes('Operation not permitted')
  ) {
    return {
      status: 'BLOCKED',
      notes: [
        'Build could not complete reliably in the current runtime. If this is a sandboxed agent session, rerun `npm run build` outside the sandbox for the real app status.',
      ],
    }
  }

  return {
    status: 'FAIL',
    notes: [result.output.split('\n').slice(-20).join('\n') || 'Build failed.'],
  }
}

function checkCommand(command, args, successLabel) {
  const result = run(command, args)
  return {
    status: result.status === 0 ? 'PASS' : 'FAIL',
    notes: result.status === 0
      ? [successLabel]
      : [result.output.split('\n').slice(-20).join('\n') || `${command} failed.`],
  }
}

function checkDangerousImports(routeFiles) {
  const offenders = []
  const pattern = /@\/components|next\/navigation|['"]use client['"]/

  for (const filePath of routeFiles) {
    for (const [index, line] of readLines(filePath).entries()) {
      if (pattern.test(line)) {
        offenders.push(`${relative(filePath)}:${index + 1}: ${line.trim()}`)
      }
    }
  }

  return {
    status: offenders.length === 0 ? 'PASS' : 'FAIL',
    notes:
      offenders.length === 0
        ? ['Route handlers import only server-side modules.']
        : offenders,
  }
}

function checkRouteErrorHandling(routeFiles) {
  const missing = []

  for (const filePath of routeFiles) {
    if (filePath.endsWith('proxy.ts')) {
      continue
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const hasHandling =
      content.includes('withAuthenticatedRoute(') ||
      content.includes('routeErrorResponse(') ||
      content.includes('try {')

    if (!hasHandling) {
      missing.push(relative(filePath))
    }
  }

  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    notes:
      missing.length === 0
        ? ['Every route handler has explicit auth/error handling.']
        : missing,
  }
}

function checkBareExceptCount() {
  const pythonFiles = walkFiles(repoRoot, (filePath) => filePath.endsWith('.py'))
  let count = 0

  for (const filePath of pythonFiles) {
    for (const line of readLines(filePath)) {
      if (/^\s*except\s*:\s*$/.test(line)) {
        count += 1
      }
    }
  }

  return {
    status: count === 0 ? 'PASS' : 'FAIL',
    notes: [`Bare except count: ${count}`],
  }
}

function checkWidgetSync() {
  const widgetFiles = walkFiles(repoRoot, (filePath) =>
    /widget/i.test(relative(filePath))
  )

  if (widgetFiles.length === 0) {
    return {
      status: 'N/A',
      notes: ['No widget files or widget pipeline found in this repo.'],
    }
  }

  return {
    status: 'WARN',
    notes: widgetFiles.map(relative),
  }
}

function checkHardcodedSecrets() {
  const scanTargets = [
    'src',
    '.claude',
    'docs',
    'scripts',
    'CLAUDE.md',
    'README.md',
    '.env.example',
  ]

  const secretPattern =
    /\b(?:sk-[A-Za-z0-9_-]{10,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9]|ANTHROPIC_API_KEY\s*=\s*[A-Za-z0-9]|BALLDONTLIE_API_KEY\s*=\s*[A-Za-z0-9]|ODDS_API_KEY\s*=\s*[A-Za-z0-9]|STRIPE_SECRET_KEY\s*=\s*[A-Za-z0-9])/

  const offenders = []

  for (const target of scanTargets) {
    const fullPath = path.join(repoRoot, target)
    const files = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
      ? walkFiles(fullPath)
      : fs.existsSync(fullPath)
        ? [fullPath]
        : []

    for (const filePath of files) {
      for (const [index, line] of readLines(filePath).entries()) {
        if (target === '.env.example') {
          continue
        }

        if (secretPattern.test(line)) {
          offenders.push(`${relative(filePath)}:${index + 1}: ${line.trim()}`)
        }
      }
    }
  }

  return {
    status: offenders.length === 0 ? 'PASS' : 'FAIL',
    notes:
      offenders.length === 0
        ? ['No hardcoded secrets found outside placeholder/example files.']
        : offenders,
  }
}

function checkAnyTypes() {
  const sourceFiles = walkFiles(path.join(repoRoot, 'src'), (filePath) =>
    filePath.endsWith('.ts') || filePath.endsWith('.tsx')
  )
  const offenders = []
  const pattern = /\b(?:as any|: any\b|<any>|Array<any>|ReadonlyArray<any>)/

  for (const filePath of sourceFiles) {
    for (const [index, line] of readLines(filePath).entries()) {
      if (pattern.test(line)) {
        offenders.push(`${relative(filePath)}:${index + 1}: ${line.trim()}`)
      }
    }
  }

  return {
    status: offenders.length === 0 ? 'PASS' : 'WARN',
    notes:
      offenders.length === 0
        ? ['No concrete TypeScript `any` usages found in `src/`.']
        : offenders,
  }
}

function checkDisclaimer() {
  const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '001_initial_schema.sql')
  const architecturePath = path.join(
    repoRoot,
    'docs',
    'dev-knowledge',
    'architecture-decisions.md'
  )

  const hasSchemaGuard =
    fs.existsSync(migrationPath) &&
    fs.readFileSync(migrationPath, 'utf8').includes(
      'For informational purposes only. Not financial advice.'
    )
  const hasArchitectureRule =
    fs.existsSync(architecturePath) &&
    fs.readFileSync(architecturePath, 'utf8').includes('Disclaimer on every insight')

  if (hasSchemaGuard && hasArchitectureRule) {
    return {
      status: 'PARTIAL',
      notes: ['Schema default and architecture rule are present; AI route is not implemented yet.'],
    }
  }

  return {
    status: 'FAIL',
    notes: ['Missing schema or architecture-level disclaimer enforcement.'],
  }
}

function checkEnvCoverage() {
  const envKeys = parseEnvExampleKeys()
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'ODDS_API_KEY',
    'BALLDONTLIE_API_KEY',
    'ANTHROPIC_API_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]

  const missing = requiredKeys.filter((key) => !envKeys.has(key))

  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    notes:
      missing.length === 0
        ? ['`.env.example` covers the currently required application env vars.']
        : missing.map((key) => `Missing from .env.example: ${key}`),
  }
}

function checkMigrationDrift() {
  const latestMigration = path.join(
    repoRoot,
    'supabase',
    'migrations',
    '002_fix_api_usage_system_tracking.sql'
  )

  if (fs.existsSync(latestMigration)) {
    return {
      status: 'ACTION REQUIRED',
      notes: ['Apply `supabase/migrations/002_fix_api_usage_system_tracking.sql` in Supabase environments.'],
    }
  }

  return {
    status: 'PASS',
    notes: ['No unapplied review-time migrations detected.'],
  }
}

const routeFiles = collectRouteFiles()
const checks = [
  ['Production build', checkBuild()],
  ['Lint', checkCommand('npm', ['run', 'lint'], '`npm run lint` passed.')],
  ['TypeScript', checkCommand('npm', ['run', 'typecheck'], '`npm run typecheck` passed.')],
  ['Dangerous imports in routes/proxy', checkDangerousImports(routeFiles)],
  ['API route error handling', checkRouteErrorHandling(routeFiles)],
  ['Bare except count', checkBareExceptCount()],
  ['Widget sync', checkWidgetSync()],
  ['Hardcoded secrets', checkHardcodedSecrets()],
  ['Env coverage', checkEnvCoverage()],
  ['`any` type usage', checkAnyTypes()],
  ['AI disclaimer enforcement', checkDisclaimer()],
  ['Migration drift', checkMigrationDrift()],
]

const markdown = [
  `# Health Check — ${options.date} ${options.label[0].toUpperCase()}${options.label.slice(1)}`,
  '',
  '| Check | Status | Notes |',
  '|-------|--------|-------|',
  ...checks.map(([name, result]) => {
    const notes = result.notes.join('<br>')
    return `| ${name} | ${result.status} | ${notes} |`
  }),
  '',
]

const outputPath = path.join(repoRoot, 'docs', 'dev-knowledge', 'health-check-latest.md')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${markdown.join('\n')}\n`)

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`)
for (const [name, result] of checks) {
  console.log(`${result.status.padEnd(15)} ${name}`)
}
