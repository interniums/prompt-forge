import type { ClarifyingQuestion } from '@/lib/types'

export const FALLBACK_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'fallback_outcome',
    question: 'What outcome do you want?',
    options: [],
  },
  {
    id: 'fallback_audience',
    question: 'Who is this for?',
    options: [
      { id: 'a', label: 'Customers' },
      { id: 'b', label: 'Internal team' },
      { id: 'c', label: 'Just me' },
      { id: 'd', label: 'Not sure' },
    ],
  },
  {
    id: 'fallback_style',
    question: 'How should it be written?',
    options: [
      { id: 'a', label: 'Concise bullets' },
      { id: 'b', label: 'Narrative' },
      { id: 'c', label: 'Steps' },
      { id: 'd', label: 'No preference' },
    ],
  },
]
