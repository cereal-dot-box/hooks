import { useState } from 'react'

type Props = {
  /** The full install command, e.g. `npx agenthooks add github:owner/repo`. */
  command: string
}

export function InstallCommand({ command }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API unavailable — leave the button as a no-op rather than
      // surfacing a broken promise to the user
    }
  }

  return (
    <div className="install" data-copied={copied}>
      <code className="install__command">{command}</code>
      <button
        type="button"
        className="install__copy"
        onClick={copy}
        aria-label={copied ? 'copied' : 'copy install command'}
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  )
}
