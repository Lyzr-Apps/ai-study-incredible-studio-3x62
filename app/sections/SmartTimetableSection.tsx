'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiGrid, FiLoader, FiPlus, FiTrash2, FiClock } from 'react-icons/fi'
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
      case 'study': return { bg: 'hsl(220 70% 95%)', border: 'hsl(220 70% 75%)', text: 'hsl(220 70% 35%)' }
      case 'revision': return { bg: 'hsl(142 71% 95%)', border: 'hsl(142 71% 75%)', text: 'hsl(142 71% 30%)' }
      case 'practice': return { bg: 'hsl(280 60% 95%)', border: 'hsl(280 60% 75%)', text: 'hsl(280 60% 35%)' }
      case 'break': return { bg: 'hsl(0 0% 95%)', border: 'hsl(0 0% 80%)', text: 'hsl(0 0% 45%)' }
      default: return { bg: 'hsl(0 0% 95%)', border: 'hsl(0 0% 80%)', text: 'hsl(0 0% 45%)' }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Smart Timetable</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>AI-generated weekly study schedule optimized for your subjects</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Generate timetable form */}
        <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
          <CardContent className="p-5">
            <h3 className="font-serif text-sm font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>Generate Smart Timetable</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Subjects (comma separated)</label>
                <Input
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="e.g., Mathematics, Physics, Chemistry, Biology"
                  disabled={loading}
                  className="text-sm h-10"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Study Hours Per Day</label>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  disabled={loading}
                  className="text-sm h-10"
                  style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                />
              </div>
              <Button
                onClick={generateTimetable}
                disabled={loading || !subjects.trim()}
                className="w-full h-10"
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
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 80%)' }}>
            <p className="text-xs" style={{ color: 'hsl(0 84% 35%)' }}>{error}</p>
          </div>
        )}

        {/* Timetable view */}
        {timetable.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiGrid className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>No timetable generated</h3>
            <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Enter your subjects above to generate a smart timetable.</p>
          </div>
        )}

        {timetable.length > 0 && (
          <>
            {/* Day tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {DAYS.map(day => {
                const count = timetable.filter(s => s.day === day).length
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                    style={{
                      background: selectedDay === day ? 'hsl(0 0% 8%)' : 'hsl(0 0% 94%)',
                      color: selectedDay === day ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
                      border: selectedDay === day ? '1px solid hsl(0 0% 8%)' : '1px solid hsl(0 0% 85%)',
                    }}
                  >
                    {day.slice(0, 3)}
                    {count > 0 && (
                      <span className="ml-1.5 text-[9px] opacity-70">({count})</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Day schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>{selectedDay}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addManualSlot}
                  className="text-xs h-7 px-2"
                  style={{ borderRadius: '0' }}
                >
                  <FiPlus className="h-3 w-3 mr-1" /> Add Slot
                </Button>
              </div>

              {daySlots.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: 'hsl(0 0% 50%)' }}>No slots for {selectedDay}</p>
              )}

              {daySlots.map(slot => {
                const colors = getTypeColor(slot.type)
                return (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                      <FiClock className="h-3 w-3" style={{ color: colors.text }} />
                      <span className="text-xs font-medium" style={{ color: colors.text }}>{slot.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>{slot.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderRadius: '0', borderColor: colors.border, color: colors.text }}>
                          {slot.type}
                        </Badge>
                        <span className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>{slot.duration}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSlot(slot.id)}
                      className="h-7 w-7 p-0 flex-shrink-0"
                      style={{ borderRadius: '0' }}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" style={{ color: 'hsl(0 84% 60%)' }} />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
              <CardContent className="p-4">
                <h4 className="text-xs font-bold mb-3" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Weekly Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2" style={{ background: 'hsl(220 70% 95%)', border: '1px solid hsl(220 70% 85%)' }}>
                    <p className="text-lg font-bold" style={{ color: 'hsl(220 70% 35%)' }}>{timetable.filter(s => s.type === 'study').length}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(220 70% 45%)' }}>Study Sessions</p>
                  </div>
                  <div className="text-center p-2" style={{ background: 'hsl(142 71% 95%)', border: '1px solid hsl(142 71% 85%)' }}>
                    <p className="text-lg font-bold" style={{ color: 'hsl(142 71% 30%)' }}>{timetable.filter(s => s.type === 'revision').length}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(142 71% 40%)' }}>Revisions</p>
                  </div>
                  <div className="text-center p-2" style={{ background: 'hsl(280 60% 95%)', border: '1px solid hsl(280 60% 85%)' }}>
                    <p className="text-lg font-bold" style={{ color: 'hsl(280 60% 35%)' }}>{timetable.filter(s => s.type === 'practice').length}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(280 60% 45%)' }}>Practice</p>
                  </div>
                  <div className="text-center p-2" style={{ background: 'hsl(0 0% 95%)', border: '1px solid hsl(0 0% 85%)' }}>
                    <p className="text-lg font-bold" style={{ color: 'hsl(0 0% 40%)' }}>{timetable.filter(s => s.type === 'break').length}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>Breaks</p>
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
