'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FiTarget,
  FiLoader,
  FiCheck,
  FiX,
  FiChevronRight,
  FiAward,
  FiZap,
  FiRefreshCw,
  FiBookOpen,
  FiAlertTriangle,
} from 'react-icons/fi'
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

interface DetectedTopic {
  name: string
  description: string
}

interface WeakTopicTestSectionProps {
  noteCount: number
}

type TestMode = 'manual' | 'auto'

function extractAgentText(result: Record<string, unknown> | null | undefined): string {
  if (!result) return ''
  let responseText = ''
  if (result?.success) {
    const response = result?.response as Record<string, unknown> | undefined
    let agentData = response?.result as unknown
    if (typeof agentData === 'string') {
      try {
        agentData = JSON.parse(agentData)
      } catch {
        responseText = agentData as string
      }
    }
    if (typeof agentData === 'object' && agentData !== null) {
      const data = agentData as Record<string, unknown>
      responseText = (data?.answer ?? data?.text ?? '') as string
    }
    if (!responseText) {
      responseText = (response?.message ?? '') as string
    }
  }
  return responseText
}

function buildQuizPrompt(topicName: string, count: number): string {
  return `Generate exactly ${count} multiple-choice quiz questions to test understanding of "${topicName}" based on my study notes.

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
}

export default function WeakTopicTestSection({ noteCount }: WeakTopicTestSectionProps) {
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [topic, setTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [mode, setMode] = useState<TestMode>('auto')

  // Auto-generate state
  const [detectedTopics, setDetectedTopics] = useState<DetectedTopic[]>([])
  const [detectingTopics, setDetectingTopics] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoStatus, setAutoStatus] = useState<string | null>(null)

  const createTestSession = useCallback(
    (topicName: string, questions: Question[]): TestSession => {
      return {
        id: `test-${Date.now()}`,
        topic: topicName,
        questions,
        completed: false,
        score: 0,
        total: questions.length,
        createdAt: new Date().toLocaleDateString(),
      }
    },
    []
  )

  // Detect topics from uploaded notes
  const detectTopics = useCallback(async () => {
    setDetectingTopics(true)
    setError(null)

    const prompt = `Based on my uploaded study notes, identify the main topics and subjects covered. List each topic on a separate line in this format:

TOPIC: [Topic Name] | DESCRIPTION: [Brief 1-line description of what this topic covers]

List between 5 and 12 key topics. Focus on distinct subjects or chapters, not subtopics. Be specific (e.g., "Photosynthesis" not just "Biology").`

    try {
      const result = await callAIAgent(prompt, AGENT_ID)
      const responseText = extractAgentText(result as Record<string, unknown>)

      if (!responseText) {
        setError('Could not detect topics from your notes. Make sure you have notes uploaded.')
        setDetectingTopics(false)
        return
      }

      const topics: DetectedTopic[] = []
      const lines = responseText.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        const match = line.match(/TOPIC:\s*(.+?)\s*\|\s*DESCRIPTION:\s*(.+)/i)
        if (match) {
          topics.push({ name: match[1].trim(), description: match[2].trim() })
        } else {
          const simpleLine = line.replace(/^[-*\d.)\s]+/, '').trim()
          if (simpleLine.length > 3 && simpleLine.length < 100 && !simpleLine.startsWith('Based on') && !simpleLine.startsWith('Here')) {
            const parts = simpleLine.split(/[:\-–]/)
            topics.push({
              name: parts[0].trim(),
              description: parts.length > 1 ? parts.slice(1).join('-').trim() : 'Topic from your notes',
            })
          }
        }
      }

      if (topics.length === 0) {
        setError('Could not parse topics. Try uploading more notes or use manual mode.')
      } else {
        setDetectedTopics(topics)
      }
    } catch {
      setError('Failed to detect topics. Please try again.')
    }

    setDetectingTopics(false)
  }, [])

  // Auto-generate a comprehensive test from notes
  const autoGenerateTest = useCallback(async () => {
    setAutoLoading(true)
    setError(null)
    setAutoStatus('Analyzing your notes...')

    const prompt = `Based on ALL my uploaded study notes, create a comprehensive quiz that covers the most important topics. Generate exactly 8 multiple-choice questions spanning different subjects and difficulty levels.

For EACH question, respond in this EXACT format:

Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [0 for A, 1 for B, 2 for C, 3 for D]
Explanation: [Brief explanation]

Q2: [Question text]
...

Mix easy, medium, and hard questions. Cover different topics from the notes. Focus on key concepts students are likely to be tested on.`

    try {
      setAutoStatus('Generating questions...')
      const result = await callAIAgent(prompt, AGENT_ID)
      const responseText = extractAgentText(result as Record<string, unknown>)

      if (!responseText) {
        setError('Could not generate questions. Make sure you have notes uploaded.')
        setAutoLoading(false)
        setAutoStatus(null)
        return
      }

      const questions = parseQuestions(responseText)
      if (questions.length === 0) {
        setError('Could not parse questions from response. Try again.')
        setAutoLoading(false)
        setAutoStatus(null)
        return
      }

      const session = createTestSession('Comprehensive Review (Auto-Generated)', questions)
      setSessions((prev) => [session, ...prev])
      setActiveSession(session.id)
      setCurrentQ(0)
      setAutoStatus(null)
    } catch {
      setError('Failed to auto-generate test. Please try again.')
    }

    setAutoLoading(false)
    setAutoStatus(null)
  }, [createTestSession])

  // Generate test from a specific detected topic
  const generateFromDetectedTopic = useCallback(
    async (topicItem: DetectedTopic) => {
      setLoading(true)
      setError(null)

      const prompt = buildQuizPrompt(topicItem.name, 5)

      try {
        const result = await callAIAgent(prompt, AGENT_ID)
        const responseText = extractAgentText(result as Record<string, unknown>)

        if (!responseText) {
          setError('Could not generate questions. Try again.')
          setLoading(false)
          return
        }

        const questions = parseQuestions(responseText)
        if (questions.length === 0) {
          setError('Could not parse questions. Try a different topic.')
          setLoading(false)
          return
        }

        const session = createTestSession(topicItem.name, questions)
        setSessions((prev) => [session, ...prev])
        setActiveSession(session.id)
        setCurrentQ(0)
      } catch {
        setError('Failed to generate test. Please try again.')
      }

      setLoading(false)
    },
    [createTestSession]
  )

  // Generate test from weak areas (low scoring past tests)
  const generateWeakAreaTest = useCallback(async () => {
    const completedSessions = sessions.filter((s) => s.completed)
    if (completedSessions.length === 0) {
      setError('No completed tests yet. Take some tests first to identify weak areas.')
      return
    }

    const weakTopics = completedSessions
      .filter((s) => s.total > 0 && s.score / s.total < 0.7)
      .sort((a, b) => a.score / a.total - b.score / b.total)
      .slice(0, 4)
      .map((s) => s.topic)

    if (weakTopics.length === 0) {
      setError('Great job! No weak areas detected. All your scores are above 70%.')
      return
    }

    setAutoLoading(true)
    setError(null)
    setAutoStatus('Targeting your weak areas...')

    const topicList = weakTopics.join(', ')
    const prompt = `I scored poorly on these topics: ${topicList}. Generate exactly 8 multiple-choice questions focusing specifically on these weak areas to help me improve.

For EACH question, respond in this EXACT format:

Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [0 for A, 1 for B, 2 for C, 3 for D]
Explanation: [Brief explanation]

Q2: [Question text]
...

Focus on the concepts I likely got wrong. Make questions that test deep understanding, not just memorization. Include questions that approach the topics from different angles.`

    try {
      setAutoStatus('Generating targeted questions...')
      const result = await callAIAgent(prompt, AGENT_ID)
      const responseText = extractAgentText(result as Record<string, unknown>)

      if (!responseText) {
        setError('Could not generate questions. Try again.')
        setAutoLoading(false)
        setAutoStatus(null)
        return
      }

      const questions = parseQuestions(responseText)
      if (questions.length === 0) {
        setError('Could not parse questions. Try again.')
        setAutoLoading(false)
        setAutoStatus(null)
        return
      }

      const session = createTestSession(`Weak Areas Review: ${weakTopics.slice(0, 2).join(', ')}${weakTopics.length > 2 ? '...' : ''}`, questions)
      setSessions((prev) => [session, ...prev])
      setActiveSession(session.id)
      setCurrentQ(0)
      setAutoStatus(null)
    } catch {
      setError('Failed to generate test. Please try again.')
    }

    setAutoLoading(false)
    setAutoStatus(null)
  }, [sessions, createTestSession])

  // Manual test generation
  const generateTest = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)

    const count = Math.min(Math.max(parseInt(numQuestions) || 5, 3), 10)
    const prompt = buildQuizPrompt(topic.trim(), count)

    try {
      const result = await callAIAgent(prompt, AGENT_ID)
      const responseText = extractAgentText(result as Record<string, unknown>)

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

      const session = createTestSession(topic.trim(), questions)
      setSessions((prev) => [session, ...prev])
      setActiveSession(session.id)
      setCurrentQ(0)
      setTopic('')
    } catch {
      setError('Failed to generate test. Please try again.')
    }

    setLoading(false)
  }, [topic, numQuestions, createTestSession])

  const answerQuestion = (sessionId: string, questionId: string, answerIndex: number) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s
        const updatedQuestions = s.questions.map((q) => (q.id === questionId && q.userAnswer === null ? { ...q, userAnswer: answerIndex } : q))
        const allAnswered = updatedQuestions.every((q) => q.userAnswer !== null)
        const score = updatedQuestions.filter((q) => q.userAnswer === q.correctIndex).length
        return { ...s, questions: updatedQuestions, completed: allAnswered, score }
      })
    )
  }

  const activeTest = sessions.find((s) => s.id === activeSession)
  const isAnyLoading = loading || autoLoading || detectingTopics
  const completedCount = sessions.filter((s) => s.completed).length
  const weakCount = sessions.filter((s) => s.completed && s.total > 0 && s.score / s.total < 0.7).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Weak Topic Test
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>
              Test yourself on weak areas and track improvement
            </p>
          </div>
          {completedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5" style={{ borderRadius: '0' }}>
                {completedCount} completed
              </Badge>
              {weakCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 80% 45%)', color: 'hsl(0 80% 35%)' }}
                >
                  {weakCount} weak
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Test creation view */}
        {!activeSession && (
          <>
            {/* Mode toggle */}
            <div className="flex" style={{ border: '1px solid hsl(0 0% 85%)' }}>
              <button
                onClick={() => setMode('auto')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors"
                style={{
                  background: mode === 'auto' ? 'hsl(0 0% 8%)' : 'transparent',
                  color: mode === 'auto' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
                }}
              >
                <FiZap className="h-3.5 w-3.5" /> Auto Generate
              </button>
              <button
                onClick={() => setMode('manual')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors"
                style={{
                  background: mode === 'manual' ? 'hsl(0 0% 8%)' : 'transparent',
                  color: mode === 'manual' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
                  borderLeft: '1px solid hsl(0 0% 85%)',
                }}
              >
                <FiTarget className="h-3.5 w-3.5" /> Manual Topic
              </button>
            </div>

            {/* Auto mode */}
            {mode === 'auto' && (
              <div className="space-y-4">
                {/* Quick auto-generate button */}
                <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        style={{ background: 'hsl(220 70% 95%)' }}
                      >
                        <FiZap className="h-5 w-5" style={{ color: 'hsl(220 70% 45%)' }} />
                      </div>
                      <div>
                        <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>
                          Auto-Generate from Notes
                        </h3>
                        <p className="text-[11px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>
                          Automatically creates a comprehensive quiz covering all your uploaded study materials
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={autoGenerateTest}
                      disabled={isAnyLoading || noteCount === 0}
                      className="w-full h-10"
                      style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
                    >
                      {autoLoading ? (
                        <span className="flex items-center gap-2">
                          <FiLoader className="h-4 w-4 animate-spin" /> {autoStatus || 'Generating...'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FiZap className="h-4 w-4" /> Generate Comprehensive Test
                        </span>
                      )}
                    </Button>
                    {noteCount === 0 && (
                      <p className="text-[11px] text-center mt-2" style={{ color: 'hsl(0 80% 45%)' }}>
                        Upload notes first to use auto-generate
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Weak areas retesting */}
                {weakCount > 0 && (
                  <Card style={{ border: '1px solid hsl(0 80% 80%)', borderRadius: '0' }}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                          style={{ background: 'hsl(0 80% 95%)' }}
                        >
                          <FiAlertTriangle className="h-5 w-5" style={{ color: 'hsl(0 80% 45%)' }} />
                        </div>
                        <div>
                          <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>
                            Retest Weak Areas
                          </h3>
                          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>
                            Focus on {weakCount} topic{weakCount !== 1 ? 's' : ''} where you scored below 70%
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={generateWeakAreaTest}
                        disabled={isAnyLoading}
                        variant="outline"
                        className="w-full h-10"
                        style={{ borderRadius: '0', borderColor: 'hsl(0 80% 45%)', color: 'hsl(0 80% 35%)' }}
                      >
                        {autoLoading ? (
                          <span className="flex items-center gap-2">
                            <FiLoader className="h-4 w-4 animate-spin" /> {autoStatus || 'Generating...'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiRefreshCw className="h-4 w-4" /> Generate Weak Area Test
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Detected topics */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className="text-xs font-bold"
                      style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}
                    >
                      Topics from Your Notes
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={detectTopics}
                      disabled={isAnyLoading || noteCount === 0}
                      className="text-[11px] h-7 px-2"
                      style={{ borderRadius: '0' }}
                    >
                      {detectingTopics ? (
                        <span className="flex items-center gap-1.5">
                          <FiLoader className="h-3 w-3 animate-spin" /> Detecting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <FiBookOpen className="h-3 w-3" /> {detectedTopics.length > 0 ? 'Refresh' : 'Detect Topics'}
                        </span>
                      )}
                    </Button>
                  </div>

                  {detectedTopics.length === 0 && !detectingTopics && (
                    <div className="py-8 text-center" style={{ border: '1px dashed hsl(0 0% 85%)' }}>
                      <FiBookOpen className="h-6 w-6 mx-auto mb-2" style={{ color: 'hsl(0 0% 60%)' }} />
                      <p className="text-xs" style={{ color: 'hsl(0 0% 50%)' }}>
                        {noteCount > 0 ? 'Click "Detect Topics" to scan your notes' : 'Upload notes to auto-detect topics'}
                      </p>
                    </div>
                  )}

                  {detectedTopics.length > 0 && (
                    <div className="space-y-2">
                      {detectedTopics.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => generateFromDetectedTopic(t)}
                          disabled={isAnyLoading}
                          className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-[hsl(0,0%,97%)] disabled:opacity-50"
                          style={{ border: '1px solid hsl(0 0% 85%)' }}
                        >
                          <div
                            className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 40%)' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                              {t.name}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: 'hsl(0 0% 50%)' }}>
                              {t.description}
                            </p>
                          </div>
                          <FiTarget className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(0 0% 60%)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual mode */}
            {mode === 'manual' && (
              <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
                <CardContent className="p-5">
                  <h3 className="font-serif text-sm font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                    Start a New Test
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>
                        Topic to Test
                      </label>
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
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>
                        Number of Questions (3-10)
                      </label>
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
                        <span className="flex items-center gap-2">
                          <FiLoader className="h-4 w-4 animate-spin" /> Generating Quiz...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FiTarget className="h-4 w-4" /> Generate Test
                        </span>
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
            )}

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 80%)' }}
              >
                <p className="text-xs" style={{ color: 'hsl(0 84% 35%)' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Past tests */}
            {sessions.length === 0 && !isAnyLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
                  <FiTarget className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
                </div>
                <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  No tests taken yet
                </h3>
                <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>
                  {noteCount > 0
                    ? 'Use auto-generate to create a test from your notes, or enter a topic manually.'
                    : 'Upload notes and create a test to identify your weak areas.'}
                </p>
              </div>
            )}

            {sessions.length > 0 && (
              <div>
                <h3
                  className="text-xs font-bold mb-3"
                  style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}
                >
                  Past Tests
                </h3>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSession(s.id)
                        setCurrentQ(0)
                      }}
                      className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-[hsl(0,0%,97%)]"
                      style={{ border: '1px solid hsl(0 0% 85%)' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ letterSpacing: '-0.02em' }}>
                          {s.topic}
                        </p>
                        <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>
                          {s.createdAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.completed ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5"
                            style={{
                              borderRadius: '0',
                              borderColor:
                                s.score / s.total >= 0.7
                                  ? 'hsl(142 71% 45%)'
                                  : s.score / s.total >= 0.4
                                    ? 'hsl(45 93% 47%)'
                                    : 'hsl(0 80% 45%)',
                              color:
                                s.score / s.total >= 0.7
                                  ? 'hsl(142 71% 35%)'
                                  : s.score / s.total >= 0.4
                                    ? 'hsl(45 93% 37%)'
                                    : 'hsl(0 80% 35%)',
                            }}
                          >
                            {s.score}/{s.total}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5" style={{ borderRadius: '0' }}>
                            In Progress
                          </Badge>
                        )}
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
                <h3 className="font-serif text-base font-bold" style={{ letterSpacing: '-0.02em' }}>
                  {activeTest.topic}
                </h3>
                <p className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>
                  Question {currentQ + 1} of {activeTest.questions.length}
                  {activeTest.completed && ` -- Score: ${activeTest.score}/${activeTest.total}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveSession(null)
                  setCurrentQ(0)
                }}
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
                  <div
                    className="w-12 h-12 flex items-center justify-center"
                    style={{
                      background: activeTest.score / activeTest.total >= 0.7 ? 'hsl(142 71% 92%)' : 'hsl(0 80% 95%)',
                    }}
                  >
                    <FiAward
                      className="h-6 w-6"
                      style={{
                        color: activeTest.score / activeTest.total >= 0.7 ? 'hsl(142 71% 35%)' : 'hsl(0 80% 45%)',
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>
                      {activeTest.score / activeTest.total >= 0.7
                        ? 'Good job!'
                        : activeTest.score / activeTest.total >= 0.4
                          ? 'Needs improvement'
                          : 'Keep practicing'}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>
                      You scored {activeTest.score} out of {activeTest.total} (
                      {Math.round((activeTest.score / activeTest.total) * 100)}%)
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
                onClick={() => setCurrentQ((p) => p - 1)}
                className="text-xs h-9"
                style={{ borderRadius: '0' }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentQ === activeTest.questions.length - 1}
                onClick={() => setCurrentQ((p) => p + 1)}
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
        <p className="text-sm font-medium mb-4" style={{ lineHeight: '1.7', letterSpacing: '-0.02em' }}>
          {question.question}
        </p>
        <div className="space-y-2">
          {Array.isArray(question.options) &&
            question.options.map((opt, idx) => {
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
                  <span
                    className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    {answered && idx === question.correctIndex ? (
                      <FiCheck className="h-3.5 w-3.5" />
                    ) : answered && idx === question.userAnswer && !isCorrect ? (
                      <FiX className="h-3.5 w-3.5" />
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </span>
                  {opt}
                </button>
              )
            })}
        </div>
        {answered && (
          <div className="mt-4 px-3 py-2" style={{ background: 'hsl(0 0% 96%)', border: '1px solid hsl(0 0% 88%)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(0 0% 8%)' }}>
              Explanation
            </p>
            <p className="text-xs" style={{ color: 'hsl(0 0% 40%)', lineHeight: '1.7' }}>
              {question.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function parseQuestions(text: string): Question[] {
  const questions: Question[] = []
  const blocks = text.split(/Q\d+[:.]\s*/i).filter((b) => b.trim())

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l)

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
