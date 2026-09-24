export type ViewerLanguage =
  | 'bash'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'css'
  | 'docker'
  | 'dotenv'
  | 'go'
  | 'html'
  | 'java'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'kotlin'
  | 'make'
  | 'markdown'
  | 'php'
  | 'python'
  | 'ruby'
  | 'rust'
  | 'scss'
  | 'shellscript'
  | 'sql'
  | 'svelte'
  | 'swift'
  | 'text'
  | 'toml'
  | 'tsx'
  | 'typescript'
  | 'vue'
  | 'xml'
  | 'yaml'

const BASENAME_LANGUAGE_MAP: Record<string, ViewerLanguage> = {
  '.env': 'dotenv',
  '.env.example': 'dotenv',
  '.env.local': 'dotenv',
  '.env.production': 'dotenv',
  'cargo.toml': 'toml',
  'cmakelists.txt': 'text',
  'containerfile': 'docker',
  'dockerfile': 'docker',
  'gemfile': 'ruby',
  'gnu makefile': 'make',
  'makefile': 'make',
  'rakefile': 'ruby',
  'vagrantfile': 'ruby',
}

const EXTENSION_LANGUAGE_MAP: Record<string, ViewerLanguage> = {
  bash: 'bash',
  bat: 'shellscript',
  cc: 'cpp',
  cjs: 'javascript',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  go: 'go',
  h: 'c',
  hpp: 'cpp',
  htm: 'html',
  html: 'html',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsonc: 'json',
  jsx: 'jsx',
  kt: 'kotlin',
  kts: 'kotlin',
  less: 'css',
  markdown: 'markdown',
  md: 'markdown',
  mdx: 'markdown',
  mjs: 'javascript',
  php: 'php',
  pl: 'text',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  scss: 'scss',
  sh: 'shellscript',
  sql: 'sql',
  svelte: 'svelte',
  svg: 'xml',
  swift: 'swift',
  t: 'text',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  vue: 'vue',
  xml: 'xml',
  xsl: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'shellscript',
}

export function detectViewerLanguage(filename: string): ViewerLanguage {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1)?.toLocaleLowerCase() ?? ''
  if (!basename) {
    return 'text'
  }

  const basenameLanguage = BASENAME_LANGUAGE_MAP[basename]
  if (basenameLanguage) {
    return basenameLanguage
  }

  if (/^\.env(?:\.[a-z0-9_-]+)?$/i.test(basename)) {
    return 'dotenv'
  }

  const extension = basename.split('.').at(-1)
  return extension ? EXTENSION_LANGUAGE_MAP[extension] ?? 'text' : 'text'
}
