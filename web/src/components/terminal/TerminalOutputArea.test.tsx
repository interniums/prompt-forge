import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TerminalOutputArea } from './TerminalOutputArea'

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
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
        clarifyingAnswersCount={0}
        onHelpCommandClick={() => {}}
        onConsentOptionClick={() => {}}
        onClarifyingOptionClick={() => {}}
        onUndoAnswer={() => {}}
        onRevise={() => {}}
        onCopyEditable={() => {}}
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

    expect(screen.getByText(/Question 1\/1:/i)).toBeInTheDocument()
    expect(screen.getByText('What outcome do you want?')).toBeInTheDocument()
    expect(screen.getByText(/Type your answer and press Enter/i)).toBeInTheDocument()
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Question 1/1: What outcome do you want?')).toBeInTheDocument()
  })
})
