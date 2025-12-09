import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import React from 'react'
import { TerminalInputBar } from './TerminalInputBar'

describe('TerminalInputBar', () => {
  it('allows stopping while generating even without input text', () => {
    const onStop = vi.fn()
    render(
      <TerminalInputBar
        value=""
        onChange={() => {}}
        onKeyDown={() => {}}
        placeholder="Type here"
        inputRef={React.createRef<HTMLTextAreaElement>()}
        disabled={true}
        isGenerating={true}
        onSubmit={() => {}}
        onStop={onStop}
      />
    )

    const stopButton = screen.getByRole('button', { name: /stop/i })
    expect(stopButton).toBeEnabled()
    fireEvent.click(stopButton)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables generate button when no text is present', () => {
    const onSubmit = vi.fn()
    render(
      <TerminalInputBar
        value="   "
        onChange={() => {}}
        onKeyDown={() => {}}
        placeholder="Type here"
        inputRef={React.createRef<HTMLTextAreaElement>()}
        disabled={false}
        isGenerating={false}
        onSubmit={onSubmit}
        onStop={() => {}}
      />
    )

    const generateButton = screen.getByRole('button', { name: /generate/i })
    expect(generateButton).toBeDisabled()
  })
})

