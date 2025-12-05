export const GENERIC_QUESTION_TEMPLATES = [
  {
    id: 'q1',
    question: 'What is the main goal or outcome you want from this task?',
    options: [
      { id: 'a', label: 'Get a clear explanation' },
      { id: 'b', label: 'Produce ready-to-use content' },
      { id: 'c', label: 'Debug or improve existing work' },
    ],
  },
  {
    id: 'q2',
    question: 'Who is the primary audience or user of the result?',
    options: [
      { id: 'a', label: 'Myself or my team' },
      { id: 'b', label: 'Non-technical stakeholders or clients' },
      { id: 'c', label: 'Developers or technical users' },
    ],
  },
  {
    id: 'q3',
    question: 'What format do you want the answer or output in?',
    options: [
      { id: 'a', label: 'Short text summary' },
      { id: 'b', label: 'Step-by-step instructions' },
      { id: 'c', label: 'Structured list or bullet points' },
      { id: 'd', label: 'Code or pseudo-code example' },
    ],
  },
] as const
