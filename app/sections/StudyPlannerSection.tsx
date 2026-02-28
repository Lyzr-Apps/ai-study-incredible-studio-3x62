'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiCalendar, FiLoader, FiPlus, FiCheck, FiRotateCw, FiTrash2, FiClock } from 'react-icons/fi'
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
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Study Planner</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>Create study plans with built-in revision schedules</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Create new plan */}
        <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
          <CardContent className="p-5">
            <h3 className="font-serif text-sm font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>Create New Study Plan</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Subject / Topic</label>
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
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Exam Date (optional)</label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  disabled={loading}
                  className="text-sm h-10"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                />
              </div>
              <Button
                onClick={generatePlan}
                disabled={loading || !subject.trim()}
                className="w-full h-10"
                style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2"><FiLoader className="h-4 w-4 animate-spin" /> Generating Plan...</span>
                ) : (
                  <span className="flex items-center gap-2"><FiPlus className="h-4 w-4" /> Generate Study Plan</span>
                )}
              </Button>
              {noteCount === 0 && (
                <p className="text-[11px] text-center" style={{ color: 'hsl(0 80% 45%)' }}>
                  Upload notes first for personalized plans based on your materials
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

        {/* Plans list */}
        {plans.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiCalendar className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>No study plans yet</h3>
            <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Create your first study plan above to get started.</p>
          </div>
        )}

        {plans.map((plan) => (
          <Card key={plan.id} style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
            <CardContent className="p-0">
              <button
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[hsl(0,0%,98%)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-serif text-sm font-bold truncate" style={{ letterSpacing: '-0.02em' }}>{plan.subject}</h4>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0" style={{ borderRadius: '0' }}>
                      {completedRevisions(plan)}/{totalRevisions(plan)} revisions
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px]" style={{ color: 'hsl(0 0% 40%)' }}>
                      <FiCalendar className="inline h-3 w-3 mr-1" />Exam: {plan.examDate}
                    </span>
                    <span className="text-[10px]" style={{ color: 'hsl(0 0% 60%)' }}>Created {plan.createdAt}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  style={{ borderRadius: '0' }}
                >
                  <FiTrash2 className="h-4 w-4" style={{ color: 'hsl(0 84% 60%)' }} />
                </Button>
              </button>

              {expandedPlan === plan.id && (
                <div className="border-t px-4 pb-4" style={{ borderColor: 'hsl(0 0% 90%)' }}>
                  {/* Revision tracker */}
                  <div className="mt-4 mb-4">
                    <h5 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      <FiRotateCw className="h-3 w-3" /> Revision Schedule
                    </h5>
                    <div className="space-y-2">
                      {plan.revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="flex items-center gap-3 px-3 py-2 transition-colors"
                          style={{
                            background: rev.completed ? 'hsl(142 71% 95%)' : 'hsl(0 0% 98%)',
                            border: `1px solid ${rev.completed ? 'hsl(142 71% 80%)' : 'hsl(0 0% 88%)'}`,
                          }}
                        >
                          <button
                            onClick={() => toggleRevision(plan.id, rev.id)}
                            className="w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{
                              border: `1.5px solid ${rev.completed ? 'hsl(142 71% 45%)' : 'hsl(0 0% 75%)'}`,
                              background: rev.completed ? 'hsl(142 71% 45%)' : 'transparent',
                            }}
                          >
                            {rev.completed && <FiCheck className="h-3 w-3" style={{ color: 'white' }} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${rev.completed ? 'line-through' : ''}`} style={{ color: rev.completed ? 'hsl(0 0% 55%)' : 'hsl(0 0% 8%)' }}>
                              {rev.topic}
                            </p>
                            <p className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(0 0% 50%)' }}>
                              <FiClock className="h-2.5 w-2.5" /> {rev.scheduledDate}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderRadius: '0' }}>
                            R{rev.round}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan content */}
                  <div className="mt-4">
                    <h5 className="text-xs font-bold mb-2" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Study Plan Details
                    </h5>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: 'hsl(0 0% 20%)', lineHeight: '1.7' }}>
                      {plan.plan}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
