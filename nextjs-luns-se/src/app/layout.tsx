import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Luns.se',
  description: 'Lunchmenu aggregator.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon-32x32.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script defer src="https://cloud.umami.is/script.js" data-website-id="11dbf4c8-5702-42e1-969a-00a08368b1e0"></script>
      </head>
      <body>{children}</body>
    </html>
  )
} 