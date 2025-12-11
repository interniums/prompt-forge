import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TerminalOutputArea } from './TerminalOutputArea'

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }: Record<string, unknown>) => (
    <span data-next-image data-alt={alt} {...(props as React.HTMLAttributes<HTMLSpanElement>)} />
  ),
}))

describe('TerminalOutputArea', () => {
  it('shows open-ended clarifying question text when answering', () => {
    render(
      <TerminalOutputArea
        lines={[
          { id: 0, role: 'system', text: 'Welcome' },
          { id: 1, role: 'app', text: 'Question 1/1: What outcome do you want?' },
        ]}
        activity={null}
        editablePrompt={null}
        promptForLinks={null}
        awaitingQuestionConsent={false}
        consentSelectedIndex={null}
        answeringQuestions={true}
        currentClarifyingQuestion={{ id: 'q1', question: 'What outcome do you want?', options: [] }}
        currentClarifyingQuestionIndex={0}
        clarifyingTotalCount={1}
        clarifyingSelectedOptionIndex={null}
        editablePromptRef={React.createRef()}
        scrollRef={React.createRef()}
        inputRef={React.createRef()}
        onFocusInput={() => {}}
        onHelpCommandClick={() => {}}
        onConsentOptionClick={() => {}}
        onClarifyingOptionClick={() => {}}
        onUndoAnswer={() => {}}
        onCopyEditable={() => {}}
        onUpdateEditablePrompt={() => {}}
        onStartNewConversation={() => {}}
        onClarifyingSkip={() => {}}
        likeState="none"
        onLike={() => {}}
        onDislike={() => {}}
        isAskingPreferenceQuestions={false}
        currentPreferenceQuestionKey={null}
        preferenceSelectedOptionIndex={null}
        onPreferenceOptionClick={() => {}}
        getPreferenceOptions={() => []}
        getPreferenceQuestionText={() => ''}
        getPreferencesToAsk={() => []}
        showStarter={false}
        generationMode="guided"
        onModeChange={() => {}}
      />
    )

    expect(screen.getAllByText(/Question 1\/1:/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/What outcome do you want\?/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Type your answer and press Enter/i)).toBeInTheDocument()
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getAllByText('Question 1/1: What outcome do you want?').length).toBeGreaterThan(0)
  })

  it('highlights AI edit diffs with added and removed lines', () => {
    render(
      <TerminalOutputArea
        lines={[]}
        activity={null}
        editablePrompt={'Stay focused on results.\nKeep it brief.'}
        promptEditDiff={{
          previous: 'Stay focused on results.\nAdd more detail here.',
          current: 'Stay focused on results.\nKeep it brief.',
        }}
        promptForLinks={null}
        awaitingQuestionConsent={false}
        consentSelectedIndex={null}
        answeringQuestions={false}
        currentClarifyingQuestion={null}
        currentClarifyingQuestionIndex={0}
        clarifyingTotalCount={0}
        clarifyingSelectedOptionIndex={null}
        editablePromptRef={React.createRef()}
        scrollRef={React.createRef()}
        inputRef={React.createRef()}
        onFocusInput={() => {}}
        onHelpCommandClick={() => {}}
        onConsentOptionClick={() => {}}
        onClarifyingOptionClick={() => {}}
        onUndoAnswer={() => {}}
        onClarifyingSkip={() => {}}
        onCopyEditable={() => {}}
        onUpdateEditablePrompt={() => {}}
        onStartNewConversation={() => {}}
        likeState="none"
        onLike={() => {}}
        onDislike={() => {}}
        isAskingPreferenceQuestions={false}
        currentPreferenceQuestionKey={null}
        preferenceSelectedOptionIndex={null}
        onPreferenceOptionClick={() => {}}
        getPreferenceOptions={() => []}
        getPreferenceQuestionText={() => ''}
        getPreferencesToAsk={() => []}
        showStarter={false}
        generationMode="guided"
        onModeChange={() => {}}
      />
    )

    expect(screen.getByText(/AI edits applied/i)).toBeInTheDocument()
    expect(screen.getByText(/Green lines were added, red lines were removed./i)).toBeInTheDocument()
    expect(screen.getByText('Add more detail here.')).toBeInTheDocument()
    expect(screen.getByText('Keep it brief.')).toBeInTheDocument()
  })

  it('makes the prompt editable and confirms manual updates', () => {
    const handleUpdate = vi.fn()
    render(
      <TerminalOutputArea
        lines={[]}
        activity={null}
        editablePrompt="Original prompt"
        promptEditDiff={null}
        promptForLinks={null}
        awaitingQuestionConsent={false}
        consentSelectedIndex={null}
        answeringQuestions={false}
        currentClarifyingQuestion={null}
        clarifyingSelectedOptionIndex={null}
        editablePromptRef={React.createRef()}
        scrollRef={React.createRef()}
        inputRef={React.createRef()}
        onFocusInput={() => {}}
        onHelpCommandClick={() => {}}
        onConsentOptionClick={() => {}}
        onClarifyingOptionClick={() => {}}
        onUndoAnswer={() => {}}
        onCopyEditable={() => {}}
        onUpdateEditablePrompt={handleUpdate}
        onStartNewConversation={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /edit prompt/i }))
    const textarea = screen.getByLabelText(/edit prompt text/i)
    fireEvent.change(textarea, { target: { value: 'Updated prompt' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm changes/i }))

    expect(handleUpdate).toHaveBeenCalledWith('Updated prompt', 'Original prompt')
  })
})
