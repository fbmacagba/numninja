import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export const metadata: Metadata = {
  title: 'NumNinja | The Number Guessing Challenge',
  description: 'Guess the secret number 1–100 in 10 attempts or less. Hot/cold clues, live leaderboard, and bragging rights. Can you crack it?',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NumNinja',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: '🥷 NumNinja — Can You Crack the Code?',
    description: 'Guess a secret number from 1–100 before your 10 attempts run out. Hot & cold clues guide you closer. Think you\'ve got what it takes to top the leaderboard?',
    url: 'https://numninja.pages.dev',
    siteName: 'NumNinja',
    images: [
      {
        url: 'https://numninja.pages.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NumNinja — The Number Guessing Challenge',
      },
    ],
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
  twitter: {
    card: 'summary_large_image',
    title: '🥷 NumNinja — Can You Crack the Code?',
    description: 'Guess a secret number 1–100 in 10 attempts. Hot & cold clues, live leaderboard, bragging rights.',
    images: ['https://numninja.pages.dev/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>{children}</body>
    </html>
  )
}
