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
  FiChevronLeft,
  FiAward,
  FiZap,
  FiRefreshCw,
  FiBookOpen,
  FiAlertTriangle,
  FiArrowLeft,
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

const TOPIC_COLORS = [
  { bg: 'hsl(220 72% 94%)', text: 'hsl(220 72% 38%)', border: 'hsl(220 60% 82%)' },
  { bg: 'hsl(262 60% 94%)', text: 'hsl(262 60% 38%)', border: 'hsl(262 50% 82%)' },
  { bg: 'hsl(172 55% 92%)', text: 'hsl(172 55% 32%)', border: 'hsl(172 45% 78%)' },
  { bg: 'hsl(340 60% 94%)', text: 'hsl(340 60% 38%)', border: 'hsl(340 50% 82%)' },
  { bg: 'hsl(32 70% 93%)', text: 'hsl(32 70% 35%)', border: 'hsl(32 60% 80%)' },
  { bg: 'hsl(200 65% 93%)', text: 'hsl(200 65% 35%)', border: 'hsl(200 55% 80%)' },
  { bg: 'hsl(142 50% 93%)', text: 'hsl(142 50% 32%)', border: 'hsl(142 40% 78%)' },
  { bg: 'hsl(280 55% 94%)', text: 'hsl(280 55% 38%)', border: 'hsl(280 45% 82%)' },
  { bg: 'hsl(10 65% 94%)', text: 'hsl(10 65% 38%)', border: 'hsl(10 55% 82%)' },
  { bg: 'hsl(50 60% 92%)', text: 'hsl(50 60% 32%)', border: 'hsl(50 50% 78%)' },
  { bg: 'hsl(190 58% 93%)', text: 'hsl(190 58% 33%)', border: 'hsl(190 48% 79%)' },
  { bg: 'hsl(310 55% 94%)', text: 'hsl(310 55% 38%)', border: 'hsl(310 45% 82%)' },
]

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
            const parts = simpleLine.split(/[:\-\u2013]/)
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
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="px-7 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)', background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>
              Weak Topic Test
            </h2>
            <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 45%)', letterSpacing: '0.01em' }}>
              Identify gaps in your knowledge and track improvement over time
            </p>
          </div>
          {completedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-semibold px-2.5 py-1" style={{ borderRadius: '0', background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 30%)' }}>
                {completedCount} completed
              </Badge>
              {weakCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold px-2.5 py-1"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 72% 55%)', color: 'hsl(0 72% 40%)', background: 'hsl(0 72% 97%)' }}
                >
                  {weakCount} weak
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-7 py-6 space-y-6">
        {/* Test creation view */}
        {!activeSession && (
          <>
            {/* Mode toggle - polished tab selector */}
            <div className="relative flex p-1" style={{ background: 'hsl(0 0% 94%)', border: '1px solid hsl(0 0% 88%)' }}>
              <button
                onClick={() => setMode('auto')}
                className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3 text-xs font-semibold transition-all duration-200 relative z-10"
                style={{
                  background: mode === 'auto' ? 'hsl(0 0% 100%)' : 'transparent',
                  color: mode === 'auto' ? 'hsl(0 0% 6%)' : 'hsl(0 0% 50%)',
                  boxShadow: mode === 'auto' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  borderRadius: '0',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                <FiZap className="h-3.5 w-3.5" style={{ filter: mode === 'auto' ? 'drop-shadow(0 0 4px hsl(220 72% 55%))' : 'none', color: mode === 'auto' ? 'hsl(220 72% 50%)' : 'hsl(0 0% 50%)' }} />
                Auto Generate
              </button>
              <button
                onClick={() => setMode('manual')}
                className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3 text-xs font-semibold transition-all duration-200 relative z-10"
                style={{
                  background: mode === 'manual' ? 'hsl(0 0% 100%)' : 'transparent',
                  color: mode === 'manual' ? 'hsl(0 0% 6%)' : 'hsl(0 0% 50%)',
                  boxShadow: mode === 'manual' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  borderRadius: '0',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                <FiTarget className="h-3.5 w-3.5" style={{ filter: mode === 'manual' ? 'drop-shadow(0 0 4px hsl(262 60% 55%))' : 'none', color: mode === 'manual' ? 'hsl(262 60% 50%)' : 'hsl(0 0% 50%)' }} />
                Manual Topic
              </button>
            </div>

            {/* Auto mode */}
            {mode === 'auto' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Auto-Generate CTA Card */}
                <Card style={{ border: '1px solid hsl(220 40% 86%)', borderRadius: '0', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.04,
                      backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(220 72% 50%) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(262 60% 50%) 0%, transparent 50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <CardContent className="p-6 relative">
                    <div className="flex items-start gap-4 mb-5">
                      <div
                        className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, hsl(220 72% 92%) 0%, hsl(262 60% 92%) 100%)', boxShadow: '0 0 0 1px hsl(220 40% 86%)' }}
                      >
                        <FiZap className="h-5.5 w-5.5" style={{ color: 'hsl(220 72% 45%)', filter: 'drop-shadow(0 0 3px hsl(220 72% 60%))' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-sm font-bold mb-1" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>
                          Auto-Generate from Notes
                        </h3>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'hsl(0 0% 48%)' }}>
                          Automatically creates a comprehensive quiz covering all your uploaded study materials with questions at varying difficulty levels.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={autoGenerateTest}
                      disabled={isAnyLoading || noteCount === 0}
                      className="w-full h-11 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
                      style={{ borderRadius: '0', background: 'hsl(0 0% 6%)', color: 'hsl(0 0% 98%)', letterSpacing: '0.04em' }}
                    >
                      {autoLoading ? (
                        <span className="flex items-center gap-2.5">
                          <FiLoader className="h-4 w-4 animate-spin" /> {autoStatus || 'Generating...'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2.5">
                          <FiZap className="h-4 w-4" /> Generate Comprehensive Test
                        </span>
                      )}
                    </Button>
                    {noteCount === 0 && (
                      <p className="text-[11px] text-center mt-3" style={{ color: 'hsl(0 72% 50%)' }}>
                        Upload notes first to use auto-generate
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Weak areas retesting */}
                {weakCount > 0 && (
                  <Card style={{ borderRadius: '0', border: '1px solid hsl(0 0% 88%)', borderLeft: '3px solid hsl(38 92% 50%)', overflow: 'hidden' }}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-5">
                        <div
                          className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                          style={{ background: 'hsl(38 92% 95%)', boxShadow: '0 0 0 1px hsl(38 70% 82%)' }}
                        >
                          <FiAlertTriangle className="h-5 w-5" style={{ color: 'hsl(38 92% 42%)' }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-serif text-sm font-bold mb-1" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>
                            Retest Weak Areas
                          </h3>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'hsl(0 0% 48%)' }}>
                            Focus on {weakCount} topic{weakCount !== 1 ? 's' : ''} where you scored below 70%. Targeted practice helps close knowledge gaps faster.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={generateWeakAreaTest}
                        disabled={isAnyLoading}
                        variant="outline"
                        className="w-full h-11 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
                        style={{ borderRadius: '0', borderColor: 'hsl(38 70% 55%)', color: 'hsl(38 80% 30%)', background: 'hsl(38 92% 97%)', letterSpacing: '0.04em' }}
                      >
                        {autoLoading ? (
                          <span className="flex items-center gap-2.5">
                            <FiLoader className="h-4 w-4 animate-spin" /> {autoStatus || 'Generating...'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2.5">
                            <FiRefreshCw className="h-4 w-4" /> Generate Weak Area Test
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Detected topics */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4" style={{ background: 'hsl(220 72% 50%)' }} />
                      <h3
                        className="text-[11px] font-bold"
                        style={{ color: 'hsl(0 0% 35%)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                      >
                        Topics from Your Notes
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={detectTopics}
                      disabled={isAnyLoading || noteCount === 0}
                      className="text-[11px] h-8 px-3 font-medium transition-all duration-200"
                      style={{ borderRadius: '0', color: 'hsl(220 72% 45%)' }}
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
                    <div className="py-10 text-center" style={{ border: '1px dashed hsl(0 0% 82%)', background: 'hsl(0 0% 99%)' }}>
                      <FiBookOpen className="h-7 w-7 mx-auto mb-3" style={{ color: 'hsl(0 0% 55%)' }} />
                      <p className="text-xs font-medium mb-1" style={{ color: 'hsl(0 0% 40%)' }}>
                        {noteCount > 0 ? 'Ready to scan your notes' : 'No notes uploaded yet'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'hsl(0 0% 55%)' }}>
                        {noteCount > 0 ? 'Click "Detect Topics" to discover testable subjects' : 'Upload study materials to auto-detect topics'}
                      </p>
                    </div>
                  )}

                  {detectedTopics.length > 0 && (
                    <div className="space-y-2">
                      {detectedTopics.map((t, idx) => {
                        const colorScheme = TOPIC_COLORS[idx % TOPIC_COLORS.length]
                        return (
                          <button
                            key={idx}
                            onClick={() => generateFromDetectedTopic(t)}
                            disabled={isAnyLoading}
                            className="w-full flex items-center gap-3.5 p-3.5 text-left transition-all duration-200 group disabled:opacity-50"
                            style={{ border: '1px solid hsl(0 0% 88%)', background: 'hsl(0 0% 100%)' }}
                            onMouseEnter={(e) => { if (!isAnyLoading) { e.currentTarget.style.background = 'hsl(0 0% 98.5%)'; e.currentTarget.style.borderColor = colorScheme.border; e.currentTarget.style.transform = 'translateX(2px)' } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100%)'; e.currentTarget.style.borderColor = 'hsl(0 0% 88%)'; e.currentTarget.style.transform = 'translateX(0)' }}
                          >
                            <div
                              className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{ background: colorScheme.bg, color: colorScheme.text, boxShadow: `0 0 0 1px ${colorScheme.border}` }}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 10%)' }}>
                                {t.name}
                              </p>
                              <p className="text-[10px] truncate mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>
                                {t.description}
                              </p>
                            </div>
                            <FiChevronRight className="h-4 w-4 flex-shrink-0 transition-transform duration-200" style={{ color: 'hsl(0 0% 55%)' }} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual mode */}
            {mode === 'manual' && (
              <div className="animate-fadeIn">
                <Card style={{ border: '1px solid hsl(0 0% 86%)', borderRadius: '0' }}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1 h-5" style={{ background: 'hsl(262 60% 50%)' }} />
                      <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>
                        Create a Custom Test
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: 'hsl(0 0% 35%)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Topic to Test
                        </label>
                        <Input
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g., Photosynthesis, Quadratic Equations, French Revolution"
                          disabled={loading}
                          className="text-sm h-11"
                          style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)', background: 'hsl(0 0% 99.5%)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: 'hsl(0 0% 35%)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Number of Questions (3-10)
                        </label>
                        <Input
                          type="number"
                          min="3"
                          max="10"
                          value={numQuestions}
                          onChange={(e) => setNumQuestions(e.target.value)}
                          disabled={loading}
                          className="text-sm h-11"
                          style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)', background: 'hsl(0 0% 99.5%)' }}
                        />
                      </div>
                      <Button
                        onClick={generateTest}
                        disabled={loading || !topic.trim()}
                        className="w-full h-11 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
                        style={{ borderRadius: '0', background: 'hsl(0 0% 6%)', color: 'hsl(0 0% 98%)', letterSpacing: '0.04em' }}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2.5">
                            <FiLoader className="h-4 w-4 animate-spin" /> Generating Quiz...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2.5">
                            <FiTarget className="h-4 w-4" /> Generate Test
                          </span>
                        )}
                      </Button>
                      {noteCount === 0 && (
                        <p className="text-[11px] text-center pt-1" style={{ color: 'hsl(0 72% 50%)' }}>
                          Upload notes for questions based on your study materials
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 animate-fadeIn"
                style={{ background: 'hsl(0 72% 97%)', border: '1px solid hsl(0 72% 85%)' }}
              >
                <FiAlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(0 72% 45%)' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(0 72% 35%)' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Empty state */}
            {sessions.length === 0 && !isAnyLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 flex items-center justify-center mb-5" style={{ background: 'hsl(0 0% 95%)', boxShadow: '0 0 0 1px hsl(0 0% 88%)' }}>
                  <FiTarget className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
                </div>
                <h3 className="font-serif text-base font-bold mb-1.5" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 10%)' }}>
                  No tests taken yet
                </h3>
                <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'hsl(0 0% 45%)' }}>
                  {noteCount > 0
                    ? 'Use auto-generate to create a test from your notes, or enter a topic manually.'
                    : 'Upload notes and create a test to identify your weak areas.'}
                </p>
              </div>
            )}

            {/* Past tests */}
            {sessions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4" style={{ background: 'hsl(0 0% 45%)' }} />
                  <h3
                    className="text-[11px] font-bold"
                    style={{ color: 'hsl(0 0% 35%)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    Past Tests
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {sessions.map((s) => {
                    const scoreRatio = s.total > 0 ? s.score / s.total : 0
                    const scorePercent = Math.round(scoreRatio * 100)
                    const scoreColor = scoreRatio >= 0.7 ? 'hsl(152 60% 40%)' : scoreRatio >= 0.4 ? 'hsl(38 80% 45%)' : 'hsl(0 72% 48%)'
                    const scoreBg = scoreRatio >= 0.7 ? 'hsl(152 60% 95%)' : scoreRatio >= 0.4 ? 'hsl(38 80% 95%)' : 'hsl(0 72% 96%)'
                    const scoreBorder = scoreRatio >= 0.7 ? 'hsl(152 50% 80%)' : scoreRatio >= 0.4 ? 'hsl(38 60% 80%)' : 'hsl(0 60% 82%)'
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveSession(s.id)
                          setCurrentQ(0)
                        }}
                        className="w-full flex items-center justify-between p-4 text-left transition-all duration-200 group"
                        style={{ border: '1px solid hsl(0 0% 88%)', background: 'hsl(0 0% 100%)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 0% 98.5%)'; e.currentTarget.style.borderColor = 'hsl(0 0% 80%)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100%)'; e.currentTarget.style.borderColor = 'hsl(0 0% 88%)' }}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-sm font-medium truncate" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 10%)' }}>
                            {s.topic}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: 'hsl(0 0% 50%)' }}>
                            {s.createdAt} -- {s.questions.length} questions
                          </p>
                          {/* Mini score bar */}
                          {s.completed && (
                            <div className="mt-2.5 flex items-center gap-2.5">
                              <div className="flex-1 h-1.5" style={{ background: 'hsl(0 0% 92%)' }}>
                                <div
                                  className="h-full transition-all duration-500"
                                  style={{ width: `${scorePercent}%`, background: scoreColor }}
                                />
                              </div>
                              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: scoreColor }}>
                                {scorePercent}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          {s.completed ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-2.5 py-1"
                              style={{
                                borderRadius: '0',
                                borderColor: scoreBorder,
                                color: scoreColor,
                                background: scoreBg,
                              }}
                            >
                              {s.score}/{s.total}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-medium px-2.5 py-1" style={{ borderRadius: '0', color: 'hsl(0 0% 45%)', borderColor: 'hsl(0 0% 82%)' }}>
                              In Progress
                            </Badge>
                          )}
                          <FiChevronRight className="h-4 w-4" style={{ color: 'hsl(0 0% 60%)' }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Active test view */}
        {activeTest && (
          <div className="animate-fadeIn">
            {/* Test header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg font-bold truncate" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>
                  {activeTest.topic}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 45%)' }}>
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
                className="text-xs h-9 px-3.5 font-medium transition-all duration-200"
                style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)' }}
              >
                <FiArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                All Tests
              </Button>
            </div>

            {/* Progress bar with step dots */}
            <div className="mb-7">
              <div className="flex items-center gap-0">
                {activeTest.questions.map((q, idx) => {
                  const isActive = idx === currentQ
                  const isAnswered = q.userAnswer !== null
                  const isCorrect = q.userAnswer === q.correctIndex
                  let dotBg = 'hsl(0 0% 88%)'
                  let dotBorder = 'hsl(0 0% 82%)'
                  if (isActive) {
                    dotBg = 'hsl(0 0% 6%)'
                    dotBorder = 'hsl(0 0% 6%)'
                  } else if (isAnswered && isCorrect) {
                    dotBg = 'hsl(152 60% 42%)'
                    dotBorder = 'hsl(152 60% 42%)'
                  } else if (isAnswered && !isCorrect) {
                    dotBg = 'hsl(0 72% 50%)'
                    dotBorder = 'hsl(0 72% 50%)'
                  }
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <div className="flex-1 h-0.5" style={{ background: isAnswered || idx <= currentQ ? 'hsl(0 0% 70%)' : 'hsl(0 0% 90%)' }} />
                      )}
                      <button
                        onClick={() => setCurrentQ(idx)}
                        className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all duration-200"
                        style={{
                          background: dotBg,
                          border: `2px solid ${dotBorder}`,
                          color: isActive || isAnswered ? 'hsl(0 0% 100%)' : 'hsl(0 0% 50%)',
                          boxShadow: isActive ? '0 0 0 3px hsl(0 0% 6% / 0.15)' : 'none',
                        }}
                      >
                        {isAnswered && !isActive ? (isCorrect ? <FiCheck className="h-3 w-3" /> : <FiX className="h-3 w-3" />) : idx + 1}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Result summary */}
            {activeTest.completed && (
              <Card className="mb-7" style={{ border: '1px solid hsl(0 0% 86%)', borderRadius: '0', overflow: 'hidden' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-5">
                    {/* Circular progress indicator */}
                    <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                      <svg width="72" height="72" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="hsl(0 0% 92%)" strokeWidth="5" />
                        <circle
                          cx="36"
                          cy="36"
                          r="30"
                          fill="none"
                          stroke={activeTest.score / activeTest.total >= 0.7 ? 'hsl(152 60% 42%)' : activeTest.score / activeTest.total >= 0.4 ? 'hsl(38 80% 48%)' : 'hsl(0 72% 50%)'}
                          strokeWidth="5"
                          strokeLinecap="butt"
                          strokeDasharray={`${(activeTest.score / activeTest.total) * 188.5} 188.5`}
                          transform="rotate(-90 36 36)"
                          style={{ transition: 'stroke-dasharray 0.8s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 10%)' }}>
                          {Math.round((activeTest.score / activeTest.total) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FiAward
                          className="h-5 w-5"
                          style={{
                            color: activeTest.score / activeTest.total >= 0.7 ? 'hsl(152 60% 42%)' : activeTest.score / activeTest.total >= 0.4 ? 'hsl(38 80% 48%)' : 'hsl(0 72% 50%)',
                          }}
                        />
                        <p className="font-serif text-base font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>
                          {activeTest.score / activeTest.total >= 0.7
                            ? 'Excellent work!'
                            : activeTest.score / activeTest.total >= 0.4
                              ? 'Room for improvement'
                              : 'Keep practicing'}
                        </p>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(0 0% 45%)' }}>
                        You scored {activeTest.score} out of {activeTest.total} questions correctly.
                      </p>
                      <div className="flex gap-3 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5" style={{ background: 'hsl(152 60% 42%)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'hsl(0 0% 40%)' }}>
                            {activeTest.score} correct
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5" style={{ background: 'hsl(0 72% 50%)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'hsl(0 0% 40%)' }}>
                            {activeTest.total - activeTest.score} incorrect
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current question */}
            {activeTest.questions[currentQ] && (
              <QuestionCard
                question={activeTest.questions[currentQ]}
                questionNumber={currentQ + 1}
                onAnswer={(idx) => answerQuestion(activeTest.id, activeTest.questions[currentQ].id, idx)}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ((p) => p - 1)}
                className="text-xs h-10 px-5 font-medium transition-all duration-200"
                style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)' }}
              >
                <FiChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentQ === activeTest.questions.length - 1}
                onClick={() => setCurrentQ((p) => p + 1)}
                className="text-xs h-10 px-5 font-medium transition-all duration-200"
                style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)' }}
              >
                Next
                <FiChevronRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, questionNumber, onAnswer }: { question: Question; questionNumber: number; onAnswer: (idx: number) => void }) {
  const answered = question.userAnswer !== null
  const isCorrect = question.userAnswer === question.correctIndex
  const letterLabels = ['A', 'B', 'C', 'D']

  return (
    <Card style={{ border: '1px solid hsl(0 0% 86%)', borderRadius: '0', overflow: 'hidden' }}>
      <CardContent className="p-0">
        {/* Question header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(0 0% 90%)', background: 'hsl(0 0% 99%)' }}>
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold px-2 py-0.5 flex-shrink-0 mt-0.5" style={{ background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)', letterSpacing: '0.05em' }}>
              Q{questionNumber}
            </span>
            <p className="text-[15px] font-medium leading-relaxed" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>
              {question.question}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 py-5 space-y-2.5">
          {Array.isArray(question.options) &&
            question.options.map((opt, idx) => {
              let borderColor = 'hsl(0 0% 86%)'
              let bgColor = 'hsl(0 0% 100%)'
              let textColor = 'hsl(0 0% 12%)'
              let circleBg = 'hsl(0 0% 95%)'
              let circleText = 'hsl(0 0% 40%)'
              let circleBorder = 'hsl(0 0% 82%)'

              if (answered) {
                if (idx === question.correctIndex) {
                  borderColor = 'hsl(152 55% 48%)'
                  bgColor = 'hsl(152 55% 96%)'
                  textColor = 'hsl(152 55% 22%)'
                  circleBg = 'hsl(152 55% 42%)'
                  circleText = 'hsl(0 0% 100%)'
                  circleBorder = 'hsl(152 55% 42%)'
                } else if (idx === question.userAnswer && !isCorrect) {
                  borderColor = 'hsl(0 65% 52%)'
                  bgColor = 'hsl(0 65% 97%)'
                  textColor = 'hsl(0 65% 30%)'
                  circleBg = 'hsl(0 65% 50%)'
                  circleText = 'hsl(0 0% 100%)'
                  circleBorder = 'hsl(0 65% 50%)'
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => !answered && onAnswer(idx)}
                  disabled={answered}
                  className="w-full text-left px-4 py-3.5 text-sm flex items-center gap-3.5 transition-all duration-200 disabled:cursor-default"
                  style={{ border: `1px solid ${borderColor}`, background: bgColor, color: textColor }}
                  onMouseEnter={(e) => { if (!answered) { e.currentTarget.style.background = 'hsl(0 0% 97.5%)'; e.currentTarget.style.borderColor = 'hsl(0 0% 72%)' } }}
                  onMouseLeave={(e) => { if (!answered) { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor } }}
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-200"
                    style={{ background: circleBg, color: circleText, border: `1.5px solid ${circleBorder}` }}
                  >
                    {answered && idx === question.correctIndex ? (
                      <FiCheck className="h-3.5 w-3.5" />
                    ) : answered && idx === question.userAnswer && !isCorrect ? (
                      <FiX className="h-3.5 w-3.5" />
                    ) : (
                      letterLabels[idx] ?? String.fromCharCode(65 + idx)
                    )}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              )
            })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="mx-6 mb-5 px-4 py-3.5" style={{ background: isCorrect ? 'hsl(152 40% 97%)' : 'hsl(38 60% 97%)', borderLeft: `3px solid ${isCorrect ? 'hsl(152 55% 42%)' : 'hsl(38 80% 48%)'}` }}>
            <p className="text-[11px] font-bold mb-1 uppercase" style={{ color: isCorrect ? 'hsl(152 55% 32%)' : 'hsl(38 80% 35%)', letterSpacing: '0.05em' }}>
              Explanation
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
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
