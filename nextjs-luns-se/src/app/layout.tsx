import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Luns.se Modern',
  description: 'Modern lunch menu aggregator for Lindholmen Science Park',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 