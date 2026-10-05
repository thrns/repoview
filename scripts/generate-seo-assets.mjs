import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement as h } from 'react'
import { ImageResponse } from 'next/og.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appMarkPath = path.join(root, 'app', 'icon.svg')
const socialPath = path.join(root, 'public', 'repoview-private-repository-sharing-social-preview.png')
const brandBackground = '#11181C'

async function renderPng(element, width, height, outputPath) {
  const image = new ImageResponse(element, { width, height })
  await writeFile(outputPath, Buffer.from(await image.arrayBuffer()))
}

async function main() {
  const mark = (await readFile(appMarkPath)).toString('base64')
  const markSrc = `data:image/svg+xml;base64,${mark}`

  for (const size of [180, 192, 512]) {
    const outputPath = size === 180
      ? path.join(root, 'app', 'apple-icon.png')
      : path.join(root, 'public', `repoview-app-icon-${size}.png`)

    await renderPng(
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: brandBackground,
        },
      }, h('img', { src: markSrc, width: size, height: size })),
      size,
      size,
      outputPath,
    )
  }

  const socialImage = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      padding: '48px 58px 40px',
      border: '1px solid #2A3438',
      borderRadius: 28,
      background: brandBackground,
      color: '#FAFAFB',
      fontFamily: 'Arial, sans-serif',
    },
  },
  h('div', { style: { display: 'flex', alignItems: 'center', gap: 18 } },
    h('img', { src: markSrc, width: 58, height: 58 }),
    h('span', { style: { fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' } }, 'RepoView'),
  ),
  h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' } },
    h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        border: '1px solid #35674F',
        borderRadius: 999,
        color: '#77D7A9',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '1.7px',
      },
    }, 'PRIVATE REPOSITORY SHARING'),
    h('div', {
      style: {
        display: 'flex',
        marginTop: 20,
        fontSize: 54,
        fontWeight: 700,
        lineHeight: 1.12,
        letterSpacing: '-1.4px',
        whiteSpace: 'pre-wrap',
      },
    }, 'Share private GitHub repositories\nwithout going public.'),
    h('div', {
      style: {
        display: 'flex',
        marginTop: 16,
        color: '#B9C2C5',
        fontSize: 22,
        lineHeight: 1.4,
      },
    }, 'Scoped, read-only review links for code that stays private.'),
  ),
  h('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 18,
      borderTop: '1px solid #2A3438',
      color: '#B9C2C5',
      fontSize: 16,
    },
  },
    h('span', null, 'Private source sharing, thoughtfully made.'),
    h('span', { style: { color: '#77D7A9', fontWeight: 600 } }, 'repoview.thrn.im'),
  ))

  await renderPng(socialImage, 1200, 630, socialPath)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
