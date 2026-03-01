'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiCalendar, FiLoader, FiPlus, FiCheck, FiRotateCw, FiTrash2, FiClock, FiChevronDown, FiChevronUp, FiBookOpen, FiAlertCircle } from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69a28f6f2d763c5cd4148906'

interface StudyPlan {
  id: string
  subject: string
  examDate: string
  createdAt: string
  plan: string
  revisions: RevisionItem[]
}

interface RevisionItem {
  id: string
  topic: string
  scheduledDate: string
  completed: boolean
  round: number
}

interface StudyPlannerSectionProps {
  noteCount: number
}

function renderPlanMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1" style={{ color: 'hsl(0 0% 8%)' }}>{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-sm mt-3 mb-1" style={{ color: 'hsl(0 0% 8%)' }}>{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-base mt-4 mb-2" style={{ color: 'hsl(0 0% 6%)' }}>{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{line.slice(2)}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{line.replace(/^\d+\.\s/, '')}</li>
        if (!line.trim()) return <div key={i} className="h-1.5" />
        return <p key={i} className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{line}</p>
      })}
    </div>
  )
}

export default function StudyPlannerSection({ noteCount }: StudyPlannerSectionProps) {
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [subject, setSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)

  const generatePlan = useCallback(async () => {
    if (!subject.trim()) return
    setLoading(true)
    setError(null)

    const prompt = `I need a detailed study plan for "${subject.trim()}"${examDate ? ` with exam on ${examDate}` : ''}.
Based on my uploaded notes, create a structured study plan with:
1. Day-by-day breakdown of topics to study
2. Revision schedule using spaced repetition (review after 1 day, 3 days, 7 days, 14 days)
3. Key topics to focus on
4. Estimated time for each session
Format the plan clearly with headers and bullet points.`

    try {
      const result = await callAIAgent(prompt, AGENT_ID)
      let planText = ''

      if (result?.success) {
        let agentData = result?.response?.result
        if (typeof agentData === 'string') {
          try { agentData = JSON.parse(agentData) } catch { planText = agentData }
        }
        if (typeof agentData === 'object' && agentData !== null) {
          planText = agentData?.answer ?? agentData?.text ?? ''
        }
        if (!planText) {
          planText = result?.response?.message ?? 'Could not generate plan.'
        }
      } else {
        planText = result?.error ?? 'Failed to generate study plan.'
      }

      const today = new Date()
      const revisions: RevisionItem[] = [
        { id: `rev-${Date.now()}-1`, topic: `${subject} - Round 1`, scheduledDate: addDays(today, 1), completed: false, round: 1 },
        { id: `rev-${Date.now()}-2`, topic: `${subject} - Round 2`, scheduledDate: addDays(today, 3), completed: false, round: 2 },
        { id: `rev-${Date.now()}-3`, topic: `${subject} - Round 3`, scheduledDate: addDays(today, 7), completed: false, round: 3 },
        { id: `rev-${Date.now()}-4`, topic: `${subject} - Round 4`, scheduledDate: addDays(today, 14), completed: false, round: 4 },
      ]

      const newPlan: StudyPlan = {
        id: `plan-${Date.now()}`,
        subject: subject.trim(),
        examDate: examDate || 'Not set',
        createdAt: today.toLocaleDateString(),
        plan: planText,
        revisions,
      }

      setPlans(prev => [newPlan, ...prev])
      setExpandedPlan(newPlan.id)
      setSubject('')
      setExamDate('')
    } catch {
      setError('Failed to generate study plan. Please try again.')
    }

    setLoading(false)
  }, [subject, examDate])

  const toggleRevision = (planId: string, revisionId: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      return {
        ...p,
        revisions: p.revisions.map(r =>
          r.id === revisionId ? { ...r, completed: !r.completed } : r
        ),
      }
    }))
  }

  const deletePlan = (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId))
    if (expandedPlan === planId) setExpandedPlan(null)
  }

  const completedRevisions = (plan: StudyPlan) => plan.revisions.filter(r => r.completed).length
  const totalRevisions = (plan: StudyPlan) => plan.revisions.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
        <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>
          Study Planner
        </h2>
        <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 45%)' }}>
          Create study plans with built-in spaced repetition schedules
        </p>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="px-6 py-6 space-y-6">
          {/* Create new plan form */}
          <Card style={{ border: '1px solid hsl(0 0% 88%)', borderRadius: '0' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                  <FiPlus className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 98%)' }} />
                </div>
                <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>
                  Create New Study Plan
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(0 0% 40%)' }}>
                    Subject / Topic
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Organic Chemistry Chapter 5"
                    disabled={loading}
                    className="text-sm h-10"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(0 0% 40%)' }}>
                    Exam Date
                    <span className="normal-case tracking-normal font-normal ml-1" style={{ color: 'hsl(0 0% 55%)' }}>(optional)</span>
                  </label>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    disabled={loading}
                    className="text-sm h-10"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={generatePlan}
                  disabled={loading || !subject.trim()}
                  className="w-full h-10 text-sm font-semibold transition-all duration-200"
                  style={{ borderRadius: '0', background: loading ? 'hsl(0 0% 20%)' : 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <FiLoader className="h-4 w-4 animate-spin" />
                      Generating Plan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FiPlus className="h-4 w-4" />
                      Generate Study Plan
                    </span>
                  )}
                </Button>
              </div>

              {noteCount === 0 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2" style={{ background: 'hsl(45 80% 96%)', border: '1px solid hsl(45 60% 85%)' }}>
                  <FiAlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'hsl(45 80% 35%)' }} />
                  <p className="text-[11px]" style={{ color: 'hsl(45 60% 30%)' }}>
                    Upload notes first for personalized plans based on your materials
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 animate-fadeIn" style={{ background: 'hsl(0 70% 97%)', border: '1px solid hsl(0 70% 85%)' }}>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'hsl(0 84% 60%)' }}>
                <FiAlertCircle className="h-3 w-3" style={{ color: 'white' }} />
              </div>
              <p className="text-xs" style={{ color: 'hsl(0 70% 30%)' }}>{error}</p>
            </div>
          )}

          {/* Empty state */}
          {plans.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 flex items-center justify-center" style={{ background: 'hsl(0 0% 95%)' }}>
                  <FiCalendar className="h-8 w-8" style={{ color: 'hsl(0 0% 55%)' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                  <FiBookOpen className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 98%)' }} />
                </div>
              </div>
              <h3 className="font-serif text-base font-bold mb-1.5" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 10%)' }}>
                No study plans yet
              </h3>
              <p className="text-sm max-w-[260px] leading-relaxed" style={{ color: 'hsl(0 0% 45%)' }}>
                Create your first plan above and start studying with spaced repetition.
              </p>
            </div>
          )}

          {/* Plans list */}
          {plans.map((plan) => {
            const completed = completedRevisions(plan)
            const total = totalRevisions(plan)
            const progressPct = total > 0 ? (completed / total) * 100 : 0
            const isExpanded = expandedPlan === plan.id

            return (
              <Card key={plan.id} className="overflow-hidden animate-fadeIn" style={{ border: '1px solid hsl(0 0% 88%)', borderRadius: '0' }}>
                <CardContent className="p-0">
                  {/* Plan header / accordion trigger */}
                  <button
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                    className="w-full flex items-center justify-between p-5 text-left transition-colors duration-150"
                    style={{ background: isExpanded ? 'hsl(0 0% 99%)' : 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h4 className="font-serif text-sm font-bold truncate" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>
                          {plan.subject}
                        </h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 font-semibold" style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)' }}>
                          {completed}/{total}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(0 0% 40%)' }}>
                          <FiCalendar className="inline h-3 w-3" />
                          Exam: {plan.examDate}
                        </span>
                        <span className="text-[10px]" style={{ color: 'hsl(0 0% 55%)' }}>
                          Created {plan.createdAt}
                        </span>
                      </div>
                      {/* Mini progress bar when collapsed */}
                      {!isExpanded && (
                        <div className="w-full h-1" style={{ background: 'hsl(0 0% 92%)' }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              background: progressPct === 100 ? 'hsl(142 71% 45%)' : 'hsl(0 0% 8%)',
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }}
                        className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity"
                        style={{ borderRadius: '0' }}
                      >
                        <FiTrash2 className="h-4 w-4" style={{ color: 'hsl(0 72% 50%)' }} />
                      </Button>
                      {isExpanded ? (
                        <FiChevronUp className="h-4 w-4" style={{ color: 'hsl(0 0% 40%)' }} />
                      ) : (
                        <FiChevronDown className="h-4 w-4" style={{ color: 'hsl(0 0% 40%)' }} />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: 'hsl(0 0% 90%)' }}>
                      {/* Revision tracker - timeline style */}
                      <div className="px-5 pt-5 pb-4">
                        <h5 className="text-[11px] font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'hsl(0 0% 30%)' }}>
                          <FiRotateCw className="h-3.5 w-3.5" />
                          Spaced Repetition Schedule
                        </h5>

                        <div className="relative">
                          {/* Vertical connecting line */}
                          <div
                            className="absolute left-[15px] top-3 bottom-3 w-px"
                            style={{ background: 'hsl(0 0% 88%)' }}
                          />

                          <div className="space-y-0">
                            {plan.revisions.map((rev) => (
                              <div
                                key={rev.id}
                                className="relative flex items-center gap-4 py-3 pl-1 pr-3 transition-colors duration-150 animate-fadeIn"
                              >
                                {/* Custom checkbox on the timeline */}
                                <button
                                  onClick={() => toggleRevision(plan.id, rev.id)}
                                  className="relative z-10 w-[30px] h-[30px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                  style={{
                                    border: `2px solid ${rev.completed ? 'hsl(142 71% 45%)' : 'hsl(0 0% 78%)'}`,
                                    background: rev.completed ? 'hsl(142 71% 45%)' : 'hsl(0 0% 100%)',
                                  }}
                                >
                                  {rev.completed && <FiCheck className="h-3.5 w-3.5" style={{ color: 'white' }} />}
                                </button>

                                {/* Revision info */}
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                  <div>
                                    <p
                                      className={`text-sm font-medium ${rev.completed ? 'line-through' : ''}`}
                                      style={{
                                        color: rev.completed ? 'hsl(0 0% 55%)' : 'hsl(0 0% 8%)',
                                        letterSpacing: '-0.01em',
                                      }}
                                    >
                                      {rev.topic}
                                    </p>
                                    <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>
                                      <FiClock className="h-3 w-3" />
                                      {rev.scheduledDate}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5 font-bold flex-shrink-0"
                                    style={{
                                      borderRadius: '0',
                                      borderColor: rev.completed ? 'hsl(142 50% 70%)' : 'hsl(0 0% 82%)',
                                      background: rev.completed ? 'hsl(142 60% 96%)' : 'transparent',
                                      color: rev.completed ? 'hsl(142 50% 30%)' : 'hsl(0 0% 40%)',
                                    }}
                                  >
                                    R{rev.round}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar for expanded view */}
                      <div className="mx-5 mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 40%)' }}>
                            Progress
                          </span>
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: 'hsl(0 0% 8%)' }}>
                            {completed}/{total} complete
                          </span>
                        </div>
                        <div className="w-full h-1.5" style={{ background: 'hsl(0 0% 92%)' }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              background: progressPct === 100 ? 'hsl(142 71% 45%)' : 'hsl(0 0% 8%)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Plan content */}
                      <div className="border-t mx-5" style={{ borderColor: 'hsl(0 0% 92%)' }}>
                        <div className="pt-4 pb-5">
                          <h5 className="text-[11px] font-bold mb-3 uppercase tracking-wider" style={{ color: 'hsl(0 0% 30%)' }}>
                            Study Plan Details
                          </h5>
                          <div
                            className="max-h-[300px] overflow-y-auto scrollbar-thin pr-2"
                            style={{ lineHeight: '1.7' }}
                          >
                            {renderPlanMarkdown(plan.plan)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
