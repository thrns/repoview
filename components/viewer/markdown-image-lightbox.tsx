'use client'

import 'yet-another-react-lightbox/styles.css'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

export default function MarkdownImageLightbox({ src, alt, close }: { src: string; alt: string; close: () => void }) {
  return (
    <Lightbox
      open
      close={close}
      slides={[{ src, alt }]}
      plugins={[Zoom, Fullscreen]}
      carousel={{ finite: true }}
      labels={{ Close: 'Close image', 'Enter Fullscreen': 'Open fullscreen', 'Exit Fullscreen': 'Exit fullscreen' }}
    />
  )
}
