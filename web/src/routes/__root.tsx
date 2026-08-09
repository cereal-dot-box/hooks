import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { TopBar } from '#/components/top-bar'

export const Route = createRootRoute({
  // No-ISR caching model (per project memory): the CDN serves fresh for 60s,
  // then stale-while-revalidate for another 5min. Routes that need different
  // behavior override this.
  headers: () => ({
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'agenthooks directory' },
      {
        name: 'description',
        content:
          'Browse and install hook packages for Claude Code and Codex.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TopBar />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
