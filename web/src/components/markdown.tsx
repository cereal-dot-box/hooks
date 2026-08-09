import { useMemo } from 'react'
import { marked } from 'marked'

type Props = {
  source: string
}

// README markdown → HTML. marked is synchronous when called without an
// async extension, so we lean on that. Output is trusted (sourced from the
// synced manifest, not user input rendered back).
export function Markdown({ source }: Props) {
  const html = useMemo(() => marked.parse(source, { async: false }) as string, [
    source,
  ])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
