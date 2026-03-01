'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiGrid, FiLoader, FiPlus, FiTrash2, FiClock, FiCalendar } from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69a28f6f2d763c5cd4148906'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM']

interface TimetableSlot {
  id: string
  day: string
  time: string
  subject: string
  type: 'study' | 'revision' | 'practice' | 'break'
  duration: string
}

interface SmartTimetableSectionProps {
  noteCount: number
}

export default function SmartTimetableSection({ noteCount }: SmartTimetableSectionProps) {
  const [timetable, setTimetable] = useState<TimetableSlot[]>([])
  const [subjects, setSubjects] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState('6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDay, setSelectedDay] = useState<string>('Monday')

  const generateTimetable = useCallback(async () => {
    if (!subjects.trim()) return
    setLoading(true)
    setError(null)

    const prompt = `Create a smart weekly study timetable for the following subjects: ${subjects.trim()}.
Available study hours per day: ${hoursPerDay || '6'} hours.

Rules:
1. Distribute subjects evenly across the week
2. Alternate between difficult and easy subjects
3. Include short breaks every 2 hours
4. Schedule revision slots for previously studied topics
5. Include practice/problem-solving sessions
6. Morning: conceptual/difficult subjects, Afternoon: practice, Evening: revision

For EACH slot, respond in this EXACT format (one per line):
DAY|TIME|SUBJECT|TYPE|DURATION

Where:
- DAY is Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday
- TIME is like 9:00 AM
- SUBJECT is the subject/activity name
- TYPE is study/revision/practice/break
- DURATION is like 1 hour or 30 min

Example:
Monday|9:00 AM|Mathematics|study|1 hour
Monday|10:00 AM|Break|break|15 min

Generate a complete weekly timetable.`

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
        setError('Could not generate timetable. Try again.')
        setLoading(false)
        return
      }

      const slots = parseTimetable(responseText)
      if (slots.length === 0) {
        setError('Could not parse timetable. Try again with different subjects.')
        setLoading(false)
        return
      }

      setTimetable(slots)
    } catch {
      setError('Failed to generate timetable. Please try again.')
    }

    setLoading(false)
  }, [subjects, hoursPerDay])

  const removeSlot = (slotId: string) => {
    setTimetable(prev => prev.filter(s => s.id !== slotId))
  }

  const addManualSlot = () => {
    const newSlot: TimetableSlot = {
      id: `slot-${Date.now()}`,
      day: selectedDay,
      time: '9:00 AM',
      subject: 'New Subject',
      type: 'study',
      duration: '1 hour',
    }
    setTimetable(prev => [...prev, newSlot])
  }

  const daySlots = timetable.filter(s => s.day === selectedDay).sort((a, b) => {
    return TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time)
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'study': return { bg: 'hsl(220 70% 95%)', border: 'hsl(220 70% 75%)', text: 'hsl(220 70% 35%)', bar: 'hsl(220 70% 55%)' }
      case 'revision': return { bg: 'hsl(142 71% 95%)', border: 'hsl(142 71% 75%)', text: 'hsl(142 71% 30%)', bar: 'hsl(142 71% 45%)' }
      case 'practice': return { bg: 'hsl(280 60% 95%)', border: 'hsl(280 60% 75%)', text: 'hsl(280 60% 35%)', bar: 'hsl(280 60% 50%)' }
      case 'break': return { bg: 'hsl(0 0% 95%)', border: 'hsl(0 0% 80%)', text: 'hsl(0 0% 45%)', bar: 'hsl(0 0% 65%)' }
      default: return { bg: 'hsl(0 0% 95%)', border: 'hsl(0 0% 80%)', text: 'hsl(0 0% 45%)', bar: 'hsl(0 0% 65%)' }
    }
  }

  const totalSlots = timetable.length
  const studyCount = timetable.filter(s => s.type === 'study').length
  const revisionCount = timetable.filter(s => s.type === 'revision').length
  const practiceCount = timetable.filter(s => s.type === 'practice').length
  const breakCount = timetable.filter(s => s.type === 'break').length

  const summaryItems = [
    { label: 'Study', count: studyCount, color: 'hsl(220 70% 55%)', bgColor: 'hsl(220 70% 96%)' },
    { label: 'Revision', count: revisionCount, color: 'hsl(142 71% 45%)', bgColor: 'hsl(142 71% 96%)' },
    { label: 'Practice', count: practiceCount, color: 'hsl(280 60% 50%)', bgColor: 'hsl(280 60% 96%)' },
    { label: 'Breaks', count: breakCount, color: 'hsl(0 0% 65%)', bgColor: 'hsl(0 0% 96%)' },
  ]

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 94%)' }}>
            <FiGrid className="h-4 w-4" style={{ color: 'hsl(0 0% 30%)' }} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>Smart Timetable</h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 45%)' }}>AI-generated weekly study schedule optimized for your subjects</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-6">
        {/* Generate timetable form */}
        <Card style={{ border: '1px solid hsl(0 0% 88%)', borderRadius: '0' }}>
          <CardContent className="p-0">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(0 0% 92%)' }}>
              <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>Generate Smart Timetable</h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>Enter your subjects and study preferences to create an optimized schedule</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Subjects</label>
                <Input
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="e.g., Mathematics, Physics, Chemistry, Biology"
                  disabled={loading}
                  className="text-sm h-11"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'hsl(0 0% 55%)' }}>Separate multiple subjects with commas</p>
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Hours Per Day</label>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  disabled={loading}
                  className="text-sm h-11 w-24"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                />
              </div>
              <Button
                onClick={generateTimetable}
                disabled={loading || !subjects.trim()}
                className="w-full h-11 text-sm font-semibold tracking-wide"
                style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2"><FiLoader className="h-4 w-4 animate-spin" /> Generating Timetable...</span>
                ) : (
                  <span className="flex items-center gap-2"><FiGrid className="h-4 w-4" /> Generate Timetable</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'hsl(0 84% 97%)', borderLeft: '3px solid hsl(0 84% 60%)' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(0 84% 35%)' }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {timetable.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            {/* Mini calendar illustration */}
            <div className="relative mb-6">
              <div className="w-20 h-20 flex items-center justify-center" style={{ background: 'hsl(0 0% 95%)' }}>
                <FiCalendar className="h-8 w-8" style={{ color: 'hsl(0 0% 50%)' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                <FiPlus className="h-4 w-4" style={{ color: 'hsl(0 0% 98%)' }} />
              </div>
            </div>
            <h3 className="font-serif text-lg font-bold mb-1.5" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>No timetable generated</h3>
            <p className="text-sm max-w-xs" style={{ color: 'hsl(0 0% 45%)', lineHeight: '1.6' }}>Enter your subjects above to generate a smart, AI-optimized weekly study timetable.</p>
          </div>
        )}

        {timetable.length > 0 && (
          <>
            {/* Day tabs - pill-like with dot indicators */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {DAYS.map(day => {
                const count = timetable.filter(s => s.day === day).length
                const isActive = selectedDay === day
                const hasSlots = count > 0
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 flex items-center gap-2"
                    style={{
                      background: isActive ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
                      color: isActive ? 'hsl(0 0% 98%)' : 'hsl(0 0% 35%)',
                      border: isActive ? '1px solid hsl(0 0% 8%)' : '1px solid hsl(0 0% 85%)',
                      borderRadius: '0',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    {hasSlots && !isActive && (
                      <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: 'hsl(220 70% 55%)', borderRadius: '50%' }} />
                    )}
                    {hasSlots && isActive && (
                      <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: 'hsl(0 0% 60%)', borderRadius: '50%' }} />
                    )}
                    {day.slice(0, 3)}
                    {count > 0 && (
                      <span className="text-[9px] font-normal" style={{ opacity: 0.7 }}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Day schedule header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>{selectedDay}</h4>
                <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>{daySlots.length} scheduled {daySlots.length === 1 ? 'slot' : 'slots'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addManualSlot}
                className="text-xs h-8 px-3 font-medium"
                style={{ borderRadius: '0', borderColor: 'hsl(0 0% 80%)' }}
              >
                <FiPlus className="h-3.5 w-3.5 mr-1.5" /> Add Slot
              </Button>
            </div>

            {/* Day slots */}
            <div className="space-y-2 animate-fadeIn">
              {daySlots.length === 0 && (
                <div className="py-8 text-center" style={{ background: 'hsl(0 0% 98%)', border: '1px dashed hsl(0 0% 85%)' }}>
                  <FiClock className="h-5 w-5 mx-auto mb-2" style={{ color: 'hsl(0 0% 60%)' }} />
                  <p className="text-xs" style={{ color: 'hsl(0 0% 50%)' }}>No slots for {selectedDay}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 60%)' }}>Click "Add Slot" to create one</p>
                </div>
              )}

              {daySlots.map(slot => {
                const colors = getTypeColor(slot.type)
                return (
                  <div
                    key={slot.id}
                    className="flex items-stretch transition-all duration-200 hover:shadow-sm"
                    style={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 88%)' }}
                  >
                    {/* Left color bar */}
                    <div className="w-1 flex-shrink-0" style={{ background: colors.bar }} />

                    <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
                      <div className="flex flex-col items-center w-16 flex-shrink-0">
                        <FiClock className="h-3 w-3 mb-0.5" style={{ color: 'hsl(0 0% 50%)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 25%)' }}>{slot.time}</span>
                      </div>

                      <div className="w-px h-8 flex-shrink-0" style={{ background: 'hsl(0 0% 90%)' }} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>{slot.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wide" style={{ borderRadius: '0', borderColor: colors.border, color: colors.text, background: colors.bg }}>
                            {slot.type}
                          </Badge>
                          <span className="text-[10px] font-medium" style={{ color: 'hsl(0 0% 50%)' }}>{slot.duration}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(slot.id)}
                        className="h-8 w-8 p-0 flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                        style={{ borderRadius: '0' }}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" style={{ color: 'hsl(0 84% 55%)' }} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary with horizontal bar charts */}
            <Card style={{ border: '1px solid hsl(0 0% 88%)', borderRadius: '0' }}>
              <CardContent className="p-0">
                <div className="px-5 py-3" style={{ borderBottom: '1px solid hsl(0 0% 92%)' }}>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Weekly Summary</h4>
                </div>
                <div className="px-5 py-4 space-y-3.5">
                  {summaryItems.map(item => {
                    const maxCount = Math.max(studyCount, revisionCount, practiceCount, breakCount, 1)
                    const widthPercent = totalSlots > 0 ? (item.count / maxCount) * 100 : 0
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 25%)' }}>{item.label}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: item.color }}>{item.count}</span>
                        </div>
                        <div className="h-2 w-full" style={{ background: 'hsl(0 0% 94%)' }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${widthPercent}%`,
                              background: item.color,
                              minWidth: item.count > 0 ? '4px' : '0',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 mt-2" style={{ borderTop: '1px solid hsl(0 0% 92%)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 35%)' }}>Total Slots</span>
                      <span className="text-sm font-bold" style={{ color: 'hsl(0 0% 8%)' }}>{totalSlots}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function parseTimetable(text: string): TimetableSlot[] {
  const slots: TimetableSlot[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim())
    if (parts.length >= 4) {
      const day = DAYS.find(d => d.toLowerCase().startsWith(parts[0].toLowerCase().slice(0, 3)))
      if (day) {
        slots.push({
          id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          day,
          time: parts[1] || '9:00 AM',
          subject: parts[2] || 'Study',
          type: (['study', 'revision', 'practice', 'break'].includes(parts[3].toLowerCase()) ? parts[3].toLowerCase() : 'study') as TimetableSlot['type'],
          duration: parts[4] || '1 hour',
        })
      }
    }
  }

  return slots
}
