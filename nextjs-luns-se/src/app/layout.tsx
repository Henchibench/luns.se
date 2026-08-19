import type { Metadata } from 'next'
import { Schibsted_Grotesk, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

/* Designens tre familjer. next/font hämtar dem vid bygget och lägger dem i
   exporten, så sidan varken slår mot Google vid besök eller blinkar in
   typsnitten — viktigt eftersom hela sajten är en statisk export. */
const body = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const heading = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html
      lang="sv"
      className={`${body.variable} ${heading.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
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
                /* Textstorleken läses här av samma skäl som temat: sätts den
                   först när React kommit igång ritas sidan liten och hoppar
                   upp ett ögonblick senare, mitt framför den som valt stor
                   text just för att den lilla var jobbig att läsa. */
                if (localStorage.getItem('luns-text-size') === 'stor') {
                  document.documentElement.setAttribute('data-textsize', 'stor');
                }
              })();
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
