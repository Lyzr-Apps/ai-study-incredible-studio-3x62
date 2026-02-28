'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiTarget, FiLoader, FiCheck, FiX, FiChevronRight, FiAward } from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69a28f6f2d763c5cd4148906'

interface Question {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  userAnswer: number | null
}

interface TestSession {
  id: string
  topic: string
  questions: Question[]
  completed: boolean
  score: number
  total: number
  createdAt: string
}

interface WeakTopicTestSectionProps {
  noteCount: number
}

export default function WeakTopicTestSection({ noteCount }: WeakTopicTestSectionProps) {
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [topic, setTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [currentQ, setCurrentQ] = useState(0)

  const generateTest = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)

    const count = Math.min(Math.max(parseInt(numQuestions) || 5, 3), 10)
    const prompt = `Generate exactly ${count} multiple-choice quiz questions to test understanding of "${topic.trim()}" based on my study notes.

For EACH question, respond in this EXACT format (use numbers 0-3 for correct answer index):

Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [0 for A, 1 for B, 2 for C, 3 for D]
Explanation: [Brief explanation]

Q2: [Question text]
...

Make questions progressively harder. Focus on concepts students commonly get wrong. Include application-based and conceptual questions, not just recall.`

    try {
      const result = await callAIAgent(prompt, AGENT_ID)
      let responseText = ''

      if (result?.success) {
        let agentData = result?.response?.result
        if (typeof agentData === 'string') {
          try { agentData = JSON.parse(agentData) } catch { responseText = agentData }
        }
        if (typeof agentData === 'object' && agentData !== null) {
          responseText = agentData?.answer ?? agentData?.text ?? ''
        }
        if (!responseText) {
          responseText = result?.response?.message ?? ''
        }
      }

      if (!responseText) {
        setError('Could not generate questions. Try again.')
        setLoading(false)
        return
      }

      const questions = parseQuestions(responseText)
      if (questions.length === 0) {
        setError('Could not parse questions from response. Try again with a different topic.')
        setLoading(false)
        return
      }

      const session: TestSession = {
        id: `test-${Date.now()}`,
        topic: topic.trim(),
        questions,
        completed: false,
        score: 0,
        total: questions.length,
        createdAt: new Date().toLocaleDateString(),
      }

      setSessions(prev => [session, ...prev])
      setActiveSession(session.id)
      setCurrentQ(0)
      setTopic('')
    } catch {
      setError('Failed to generate test. Please try again.')
    }

    setLoading(false)
  }, [topic, numQuestions])

  const answerQuestion = (sessionId: string, questionId: string, answerIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      const updatedQuestions = s.questions.map(q =>
        q.id === questionId && q.userAnswer === null ? { ...q, userAnswer: answerIndex } : q
      )
      const allAnswered = updatedQuestions.every(q => q.userAnswer !== null)
      const score = updatedQuestions.filter(q => q.userAnswer === q.correctIndex).length
      return { ...s, questions: updatedQuestions, completed: allAnswered, score }
    }))
  }

  const activeTest = sessions.find(s => s.id === activeSession)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Weak Topic Test</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>Test yourself on weak areas and track improvement</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Generate test form */}
        {!activeSession && (
          <>
            <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
              <CardContent className="p-5">
                <h3 className="font-serif text-sm font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>Start a New Test</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Topic to Test</label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Photosynthesis, Quadratic Equations"
                      disabled={loading}
                      className="text-sm h-10"
                      style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Number of Questions (3-10)</label>
                    <Input
                      type="number"
                      min="3"
                      max="10"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(e.target.value)}
                      disabled={loading}
                      className="text-sm h-10"
                      style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                    />
                  </div>
                  <Button
                    onClick={generateTest}
                    disabled={loading || !topic.trim()}
                    className="w-full h-10"
                    style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><FiLoader className="h-4 w-4 animate-spin" /> Generating Quiz...</span>
                    ) : (
                      <span className="flex items-center gap-2"><FiTarget className="h-4 w-4" /> Generate Test</span>
                    )}
                  </Button>
                  {noteCount === 0 && (
                    <p className="text-[11px] text-center" style={{ color: 'hsl(0 80% 45%)' }}>
                      Upload notes for questions based on your study materials
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 80%)' }}>
                <p className="text-xs" style={{ color: 'hsl(0 84% 35%)' }}>{error}</p>
              </div>
            )}

            {/* Past tests */}
            {sessions.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
                  <FiTarget className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
                </div>
                <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>No tests taken yet</h3>
                <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Create a test above to identify your weak areas.</p>
              </div>
            )}

            {sessions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold mb-3" style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Past Tests</h3>
                <div className="space-y-2">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setActiveSession(s.id); setCurrentQ(0) }}
                      className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-[hsl(0,0%,97%)]"
                      style={{ border: '1px solid hsl(0 0% 85%)' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ letterSpacing: '-0.02em' }}>{s.topic}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>{s.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5"
                          style={{
                            borderRadius: '0',
                            borderColor: s.score / s.total >= 0.7 ? 'hsl(142 71% 45%)' : s.score / s.total >= 0.4 ? 'hsl(45 93% 47%)' : 'hsl(0 80% 45%)',
                            color: s.score / s.total >= 0.7 ? 'hsl(142 71% 35%)' : s.score / s.total >= 0.4 ? 'hsl(45 93% 37%)' : 'hsl(0 80% 35%)',
                          }}
                        >
                          {s.score}/{s.total}
                        </Badge>
                        <FiChevronRight className="h-4 w-4" style={{ color: 'hsl(0 0% 60%)' }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Active test view */}
        {activeTest && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-base font-bold" style={{ letterSpacing: '-0.02em' }}>{activeTest.topic}</h3>
                <p className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>
                  Question {currentQ + 1} of {activeTest.questions.length}
                  {activeTest.completed && ` -- Score: ${activeTest.score}/${activeTest.total}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActiveSession(null); setCurrentQ(0) }}
                className="text-xs h-8"
                style={{ borderRadius: '0' }}
              >
                Back to Tests
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 mb-6" style={{ background: 'hsl(0 0% 90%)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${((currentQ + 1) / activeTest.questions.length) * 100}%`,
                  background: 'hsl(0 0% 8%)',
                }}
              />
            </div>

            {/* Result summary */}
            {activeTest.completed && (
              <Card className="mb-6" style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center" style={{
                    background: activeTest.score / activeTest.total >= 0.7 ? 'hsl(142 71% 92%)' : 'hsl(0 80% 95%)',
                  }}>
                    <FiAward className="h-6 w-6" style={{
                      color: activeTest.score / activeTest.total >= 0.7 ? 'hsl(142 71% 35%)' : 'hsl(0 80% 45%)',
                    }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>
                      {activeTest.score / activeTest.total >= 0.7 ? 'Good job!' : activeTest.score / activeTest.total >= 0.4 ? 'Needs improvement' : 'Keep practicing'}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>
                      You scored {activeTest.score} out of {activeTest.total} ({Math.round((activeTest.score / activeTest.total) * 100)}%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current question */}
            {activeTest.questions[currentQ] && (
              <QuestionCard
                question={activeTest.questions[currentQ]}
                onAnswer={(idx) => answerQuestion(activeTest.id, activeTest.questions[currentQ].id, idx)}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(p => p - 1)}
                className="text-xs h-9"
                style={{ borderRadius: '0' }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentQ === activeTest.questions.length - 1}
                onClick={() => setCurrentQ(p => p + 1)}
                className="text-xs h-9"
                style={{ borderRadius: '0' }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, onAnswer }: { question: Question; onAnswer: (idx: number) => void }) {
  const answered = question.userAnswer !== null
  const isCorrect = question.userAnswer === question.correctIndex

  return (
    <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
      <CardContent className="p-5">
        <p className="text-sm font-medium mb-4" style={{ lineHeight: '1.7', letterSpacing: '-0.02em' }}>{question.question}</p>
        <div className="space-y-2">
          {question.options.map((opt, idx) => {
            let borderColor = 'hsl(0 0% 85%)'
            let bgColor = 'transparent'
            let textColor = 'hsl(0 0% 8%)'

            if (answered) {
              if (idx === question.correctIndex) {
                borderColor = 'hsl(142 71% 45%)'
                bgColor = 'hsl(142 71% 95%)'
                textColor = 'hsl(142 71% 25%)'
              } else if (idx === question.userAnswer && !isCorrect) {
                borderColor = 'hsl(0 80% 45%)'
                bgColor = 'hsl(0 80% 97%)'
                textColor = 'hsl(0 80% 35%)'
              }
            }

            return (
              <button
                key={idx}
                onClick={() => !answered && onAnswer(idx)}
                disabled={answered}
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors hover:bg-[hsl(0,0%,97%)] disabled:hover:bg-transparent"
                style={{ border: `1px solid ${borderColor}`, background: bgColor, color: textColor }}
              >
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ border: `1px solid ${borderColor}` }}>
                  {answered && idx === question.correctIndex ? <FiCheck className="h-3.5 w-3.5" /> :
                   answered && idx === question.userAnswer && !isCorrect ? <FiX className="h-3.5 w-3.5" /> :
                   String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
        {answered && (
          <div className="mt-4 px-3 py-2" style={{ background: 'hsl(0 0% 96%)', border: '1px solid hsl(0 0% 88%)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(0 0% 8%)' }}>Explanation</p>
            <p className="text-xs" style={{ color: 'hsl(0 0% 40%)', lineHeight: '1.7' }}>{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function parseQuestions(text: string): Question[] {
  const questions: Question[] = []
  const blocks = text.split(/Q\d+[:.]\s*/i).filter(b => b.trim())

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const lines = block.split('\n').map(l => l.trim()).filter(l => l)

    const questionText = lines[0] || ''
    const options: string[] = []
    let correctIndex = 0
    let explanation = ''

    for (const line of lines) {
      const optMatch = line.match(/^([A-D])[.)]\s*(.+)/i)
      if (optMatch) {
        options.push(optMatch[2])
      }
      const correctMatch = line.match(/^Correct[:\s]*(\d|[A-D])/i)
      if (correctMatch) {
        const val = correctMatch[1]
        if (/\d/.test(val)) {
          correctIndex = parseInt(val)
        } else {
          correctIndex = val.toUpperCase().charCodeAt(0) - 65
        }
      }
      const explMatch = line.match(/^Explanation[:\s]*(.+)/i)
      if (explMatch) {
        explanation = explMatch[1]
      }
    }

    if (questionText && options.length >= 2) {
      questions.push({
        id: `q-${Date.now()}-${i}`,
        question: questionText,
        options,
        correctIndex: Math.min(correctIndex, options.length - 1),
        explanation: explanation || 'Review this topic in your notes for a better understanding.',
        userAnswer: null,
      })
    }
  }

  return questions
}
