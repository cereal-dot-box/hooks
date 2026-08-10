import { useState } from 'react'

type Props = {
  /** Shell command, e.g. `npx agenthooks add owner/repo`. */
  command: string
  /**
   * Optional "prompt" variant — a natural-language instruction the user can
   * hand to an agent. When omitted, the Command/Prompt tabs are hidden and
   * only the shell card renders.
   */
  prompt?: string
  /** Show the section label and tab strip above the install card. */
  showLabel?: boolean
}

type Mode = 'command' | 'prompt'

export function InstallCommand({ command, prompt, showLabel = true }: Props) {
  const [mode, setMode] = useState<Mode>('command')
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = mode === 'command' || !prompt ? command : prompt
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard API unavailable — leave the button as a no-op rather than
      // surfacing a broken promise to the user
    }
  }

  const tabsVisible = Boolean(prompt)

  return (
    <section className="usage">
      {showLabel && (
        <div className="section-head">
          <span className="section-head__title">Usage</span>
          {tabsVisible && (
            <div
              className="tabs tabs--usage"
              role="tablist"
              aria-label="usage mode"
            >
              <button
                type="button"
                className="tabs__tab"
                aria-selected={mode === 'command'}
                onClick={() => setMode('command')}
                role="tab"
              >
                Command
              </button>
              <button
                type="button"
                className="tabs__tab"
                aria-selected={mode === 'prompt'}
                onClick={() => setMode('prompt')}
                role="tab"
              >
                Prompt
              </button>
            </div>
          )}
        </div>
      )}
      <div className="hero__install">
        <div className="install" data-mode="command" hidden={mode !== 'command'}>
          <span className="install__prompt" aria-hidden="true">
            $
          </span>
          <code className="install__command">{command}</code>
        </div>
        {prompt && (
          <div
            className="install"
            data-mode="prompt"
            hidden={mode !== 'prompt'}
          >
            <span className="install__prompt" aria-hidden="true">
              ›
            </span>
            <code className="install__command">{prompt}</code>
          </div>
        )}
        <button
          type="button"
          className={`btn-outline install__copy${tabsVisible ? '' : ' install__copy--strip'}`}
          onClick={copy}
          data-copied={copied}
          aria-label={copied ? 'copied' : 'copy install command'}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
    </section>
  )
}
