import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { Footer } from '#/components/footer'
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
      { title: '@cerealbox/hooks — lifecycle hooks for AI coding agents' },
      {
        name: 'description',
        content:
          'Installable automations that fire at key moments in your agent\'s run: session start, before a tool runs, on stop. One command to add, one to remove.',
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
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap',
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
        <a href="#content" className="skip-link">
          skip to content
        </a>
        <TopBar />
        <div id="content">{children}</div>
        <Footer />
        <Scripts />
      </body>
    </html>
  )
}
