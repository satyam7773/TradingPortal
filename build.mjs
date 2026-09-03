#!/usr/bin/env node
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🔨 Building Electron application...\n')

try {
  console.log('📦 Building React UI with Vite...')
  execSync('vite build', { stdio: 'inherit', cwd: __dirname })
  console.log('✓ React UI built successfully\n')

  // Copy electron files to dist (already compiled as .ts files won't work in production)
  console.log('📦 Preparing Electron files...')
  const electronDir = path.join(__dirname, 'electron')
  const distDir = path.join(__dirname, 'dist', 'electron')

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  // Copy and rename files
  fs.copyFileSync(path.join(electronDir, 'main.ts'), path.join(distDir, 'main.js'))
  fs.copyFileSync(path.join(electronDir, 'preload.ts'), path.join(distDir, 'preload.js'))

  console.log('✓ Electron files prepared\n')
  console.log('✅ Build complete! Ready for packaging with electron-builder\n')
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
