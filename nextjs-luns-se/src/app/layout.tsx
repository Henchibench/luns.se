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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Production only. Loading this in dev sent every click made while
            developing — filter toggles, favorites, tour steps — into the real
            Umami dashboard, mixed in with actual visitors. trackEvent() checks
            for window.umami, so it simply does nothing when the script is
            absent and no call sites need to change. */}
        {process.env.NODE_ENV === 'production' && (
          <script defer src="https://cloud.umami.is/script.js" data-website-id="11dbf4c8-5702-42e1-969a-00a08368b1e0"></script>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
} 