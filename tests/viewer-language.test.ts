import { describe, expect, it } from 'vitest'

import { detectViewerLanguage } from '../lib/viewer/language'

describe('viewer language detection', () => {
  it.each([
    ['src/app/page.tsx', 'tsx'],
    ['components/Button.jsx', 'jsx'],
    ['lib/client.ts', 'typescript'],
    ['scripts/build.py', 'python'],
    ['cmd/server.go', 'go'],
    ['src/main.rs', 'rust'],
    ['src/Main.java', 'java'],
    ['app/Main.kt', 'kotlin'],
    ['Sources/App.swift', 'swift'],
    ['lib/task.rb', 'ruby'],
    ['public/index.php', 'php'],
    ['native/widget.cs', 'csharp'],
    ['src/main.cpp', 'cpp'],
    ['include/main.h', 'c'],
    ['styles/site.scss', 'scss'],
    ['templates/index.html', 'html'],
    ['components/Card.vue', 'vue'],
    ['components/Card.svelte', 'svelte'],
    ['db/schema.sql', 'sql'],
    ['config/settings.yaml', 'yaml'],
    ['package.json', 'json'],
    ['config.toml', 'toml'],
    ['scripts/deploy.zsh', 'shellscript'],
    ['README.md', 'markdown'],
  ])('maps %s to %s', (filename, language) => {
    expect(detectViewerLanguage(filename)).toBe(language)
  })

  it('uses basename rules before extensions', () => {
    expect(detectViewerLanguage('Dockerfile')).toBe('docker')
    expect(detectViewerLanguage('infra/Containerfile')).toBe('docker')
    expect(detectViewerLanguage('Makefile')).toBe('make')
    expect(detectViewerLanguage('Gemfile')).toBe('ruby')
    expect(detectViewerLanguage('.env.example')).toBe('dotenv')
  })

  it('falls back to text for unknown or empty filenames', () => {
    expect(detectViewerLanguage('notes.custom')).toBe('text')
    expect(detectViewerLanguage('LICENSE')).toBe('text')
    expect(detectViewerLanguage('')).toBe('text')
  })
})
