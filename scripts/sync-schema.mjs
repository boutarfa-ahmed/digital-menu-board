#!/usr/bin/env node
// Recopie shared/menu-schema.js (l'original) dans les trois projets.
//
//   node scripts/sync-schema.mjs           écrit les copies
//   node scripts/sync-schema.mjs --check   ne touche à rien, sort en 1 si une
//                                          copie a dérivé de l'original
//
// Les frontends reçoivent une copie mot pour mot (ils sont en ESM). Le backend
// est en CommonJS : les `export` sont retirés et un `module.exports` listant
// tous les noms exportés est ajouté à la fin. La conversion est purement
// textuelle — d'où les contraintes d'écriture rappelées en tête de l'original.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'shared/menu-schema.js')

const TARGETS = [
  { path: 'backend/src/shared/menuSchema.js', format: 'cjs' },
  { path: 'frontend/src/shared/menuSchema.js', format: 'esm' },
  { path: 'frontend-tv/src/shared/menuSchema.js', format: 'esm' },
]

function banner(format) {
  return [
    '// ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.',
    '//',
    '// Original : shared/menu-schema.js',
    `// Regénérer : npm run sync:schema   (format : ${format})`,
    '//',
    '// Toute modification faite ici sera écrasée à la prochaine synchro.',
    '',
    '',
  ].join('\n')
}

// `export const X = ...` / `export function X(...)` en début de ligne. Les
// mentions du mot « export » dans les commentaires commencent par `//`, elles
// ne peuvent donc pas correspondre.
const EXPORT_RE = /^export\s+(?:const|function)\s+([A-Za-z_$][\w$]*)/gm

function toCjs(source) {
  const names = [...source.matchAll(EXPORT_RE)].map((m) => m[1])
  if (names.length === 0) throw new Error('aucun export trouvé dans shared/menu-schema.js')
  const body = source.replace(/^export\s+(const|function)\s/gm, '$1 ')
  const exports = ['', '', 'module.exports = {', ...names.map((n) => `  ${n},`), '};', ''].join('\n')
  return banner('CommonJS') + body.trimEnd() + exports
}

function toEsm(source) {
  return banner('ESM') + source
}

function render(source, format) {
  return format === 'cjs' ? toCjs(source) : toEsm(source)
}

function main() {
  const check = process.argv.includes('--check')
  const source = readFileSync(SOURCE, 'utf8')
  const stale = []

  for (const target of TARGETS) {
    const full = join(ROOT, target.path)
    const next = render(source, target.format)
    const current = existsSync(full) ? readFileSync(full, 'utf8') : null

    if (current === next) continue

    if (check) {
      stale.push(target.path + (current === null ? ' (manquant)' : ''))
      continue
    }

    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, next)
    console.log(`  écrit  ${relative(ROOT, full)}`)
  }

  if (check) {
    if (stale.length > 0) {
      console.error('Copies du schéma désynchronisées :')
      for (const s of stale) console.error(`  - ${s}`)
      console.error('\nLance `npm run sync:schema` puis committe les fichiers générés.')
      process.exit(1)
    }
    console.log('Schéma synchronisé.')
    return
  }

  console.log('Schéma synchronisé dans les 3 projets.')
}

main()
