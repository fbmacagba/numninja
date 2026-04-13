import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NumNinja | The Number Guessing Challenge',
  description: 'Can you crack the code? Test your intuition and climb the leaderboard in the ultimate number guessing game!',
  openGraph: {
    title: 'NumNinja 🎯',
    description: 'I just challenged the Number Ninja! Can you beat my score?',
    url: 'https://numninja.pages.dev',
    siteName: 'NumNinja',
    images: [
      {
        url: 'https://numninja.pages.dev/og-image.png', 
        width: 1200,
        height: 630,
        alt: 'NumNinja Game Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NumNinja 🎯',
    description: 'Can you beat the Number Ninja?',
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}
