import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { AmbientBackground } from '@/components/fx/ambient-background'
import { CursorFx } from '@/components/fx/cursor-fx'
import { SoundEngine } from '@/components/fx/sound-engine'
import './globals.css'

const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
})

export const metadata: Metadata = {
  title: 'Kart w Ketab | Medical Flashcards',
  description:
    'Memorize medical textbooks word for word with fill-in-the-blank flashcards and test yourself.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f8f5ef',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={plex.variable}>
      <body className="font-sans antialiased">
        <AmbientBackground />
        {children}
        <CursorFx />
        <SoundEngine />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
