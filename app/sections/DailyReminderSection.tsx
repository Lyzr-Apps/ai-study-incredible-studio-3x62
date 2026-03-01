'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiBell, FiPlus, FiTrash2, FiCheck, FiClock, FiInfo } from 'react-icons/fi'

interface Reminder {
  id: string
  title: string
  description: string
  time: string
  days: string[]
  active: boolean
  createdAt: string
  lastTriggered: string | null
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DailyReminderSection() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('08:00')
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [showForm, setShowForm] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])

  // Check reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      const currentDay = ALL_DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]

      reminders.forEach(r => {
        if (r.active && r.days.includes(currentDay) && r.time === currentTime && r.lastTriggered !== now.toLocaleDateString()) {
          setNotifications(prev => [...prev, `Time to study: ${r.title}`])
          setReminders(prev => prev.map(rem =>
            rem.id === r.id ? { ...rem, lastTriggered: now.toLocaleDateString() } : rem
          ))
        }
      })
    }

    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [reminders])

  // Auto-dismiss notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  const addReminder = useCallback(() => {
    if (!title.trim()) return

    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      time,
      days: selectedDays,
      active: true,
      createdAt: new Date().toLocaleDateString(),
      lastTriggered: null,
    }

    setReminders(prev => [newReminder, ...prev])
    setTitle('')
    setDescription('')
    setTime('08:00')
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    setShowForm(false)
  }, [title, description, time, selectedDays])

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r =>
      r.id === id ? { ...r, active: !r.active } : r
    ))
  }

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const presetReminders = [
    { title: 'Morning Study Session', desc: 'Start your day with focused study', time: '07:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { title: 'Revision Time', desc: 'Review what you learned today', time: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { title: 'Weekend Practice', desc: 'Solve practice problems', time: '10:00', days: ['Sat', 'Sun'] },
    { title: 'Night Review', desc: 'Quick revision before sleep', time: '21:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  ]

  const addPreset = (preset: typeof presetReminders[0]) => {
    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      title: preset.title,
      description: preset.desc,
      time: preset.time,
      days: preset.days,
      active: true,
      createdAt: new Date().toLocaleDateString(),
      lastTriggered: null,
    }
    setReminders(prev => [newReminder, ...prev])
  }

  const activeCount = reminders.filter(r => r.active).length

  // Compute a simple "next trigger" string for active reminders
  const getNextTrigger = (r: Reminder): string => {
    if (!r.active || r.days.length === 0) return ''
    const dayNames: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
    const nextDay = r.days[0]
    return `${dayNames[nextDay] ?? nextDay} at ${r.time}`
  }

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiBell className="h-4 w-4" style={{ color: 'hsl(0 0% 30%)' }} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>Daily Reminders</h2>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 45%)' }}>Set study reminders to stay on track</p>
            </div>
          </div>
          {activeCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderRadius: '0', background: 'hsl(142 71% 95%)', color: 'hsl(142 71% 30%)', border: '1px solid hsl(142 71% 85%)' }}>
              <FiBell className="h-3 w-3" />
              <span className="text-xs font-semibold">{activeCount} active</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Notification banner with slide-in */}
      {notifications.length > 0 && (
        <div className="px-6 py-3.5 animate-fadeIn" style={{ background: 'hsl(220 70% 97%)', borderBottom: '2px solid hsl(220 70% 65%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(220 70% 55%)' }}>
              <FiBell className="h-4 w-4" style={{ color: 'white' }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(220 70% 45%)' }}>Reminder</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(220 70% 25%)' }}>{notifications[0]}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-6">
        {/* Quick presets */}
        {reminders.length === 0 && (
          <div className="animate-fadeIn">
            <h3 className="text-[11px] font-bold mb-3 uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Quick Add Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {presetReminders.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => addPreset(preset)}
                  className="group flex items-center gap-3 p-4 text-left transition-all duration-200 hover:shadow-sm"
                  style={{ border: '1px solid hsl(0 0% 88%)', background: 'hsl(0 0% 100%)' }}
                >
                  <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:bg-[hsl(0,0%,8%)]" style={{ background: 'hsl(0 0% 94%)' }}>
                    <FiClock className="h-4 w-4 transition-colors duration-200 group-hover:text-white" style={{ color: 'hsl(0 0% 40%)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>{preset.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>{preset.desc}</p>
                    <p className="text-[10px] mt-1 font-medium" style={{ color: 'hsl(0 0% 40%)' }}>{preset.time} -- {preset.days.join(', ')}</p>
                  </div>
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'hsl(0 0% 92%)' }}>
                    <FiPlus className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 30%)' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add new reminder */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full h-11 text-sm font-medium"
            style={{ borderRadius: '0', borderStyle: 'dashed', borderColor: 'hsl(0 0% 80%)' }}
          >
            <FiPlus className="h-4 w-4 mr-2" /> Add Custom Reminder
          </Button>
        ) : (
          <Card className="animate-fadeIn" style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
            <CardContent className="p-0">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(0 0% 92%)' }}>
                <h3 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>New Reminder</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>Set a recurring study reminder</p>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Math Practice Session"
                    className="text-sm h-11"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Description <span className="font-normal normal-case">(optional)</span></label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What to focus on"
                    className="text-sm h-11"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-sm h-11 w-36"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-2 block uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Repeat On</label>
                  <div className="flex gap-1.5">
                    {ALL_DAYS.map(day => {
                      const isSelected = selectedDays.includes(day)
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className="w-11 h-11 text-xs font-semibold transition-all duration-200 relative"
                          style={{
                            background: isSelected ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
                            color: isSelected ? 'hsl(0 0% 98%)' : 'hsl(0 0% 45%)',
                            border: `1.5px solid ${isSelected ? 'hsl(0 0% 8%)' : 'hsl(0 0% 82%)'}`,
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                          }}
                        >
                          {day}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center" style={{ background: 'hsl(142 71% 45%)' }}>
                              <FiCheck className="h-2 w-2" style={{ color: 'white' }} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'hsl(0 0% 55%)' }}>{selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={addReminder}
                    disabled={!title.trim() || selectedDays.length === 0}
                    className="flex-1 h-11 font-semibold"
                    style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
                  >
                    <FiCheck className="h-4 w-4 mr-2" /> Save Reminder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setTitle(''); setDescription('') }}
                    className="h-11 px-5"
                    style={{ borderRadius: '0' }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {reminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center animate-fadeIn">
            <div className="relative mb-5">
              <div className="w-16 h-16 flex items-center justify-center" style={{ background: 'hsl(0 0% 95%)' }}>
                <FiBell className="h-7 w-7" style={{ color: 'hsl(0 0% 45%)' }} />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                <FiPlus className="h-3 w-3" style={{ color: 'white' }} />
              </div>
            </div>
            <h3 className="font-serif text-lg font-bold mb-1.5" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>No reminders set</h3>
            <p className="text-sm max-w-xs" style={{ color: 'hsl(0 0% 45%)', lineHeight: '1.6' }}>Use the presets above or create a custom reminder to stay on track.</p>
          </div>
        )}

        {/* Reminders list */}
        {reminders.length > 0 && (
          <div className="animate-fadeIn">
            <h3 className="text-[11px] font-bold mb-3 uppercase tracking-wide" style={{ color: 'hsl(0 0% 35%)' }}>Your Reminders</h3>
            <div className="space-y-2.5">
              {reminders.map(r => {
                const nextTrigger = getNextTrigger(r)
                return (
                  <div
                    key={r.id}
                    className="flex items-stretch transition-all duration-200 hover:shadow-sm"
                    style={{
                      border: '1px solid hsl(0 0% 88%)',
                      background: r.active ? 'hsl(0 0% 100%)' : 'hsl(0 0% 97%)',
                    }}
                  >
                    {/* Left color strip */}
                    <div className="w-1 flex-shrink-0" style={{ background: r.active ? 'hsl(142 71% 45%)' : 'hsl(0 0% 78%)' }} />

                    <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
                      {/* Toggle button */}
                      <button
                        onClick={() => toggleReminder(r.id)}
                        className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{
                          background: r.active ? 'hsl(142 71% 45%)' : 'hsl(0 0% 92%)',
                          border: `1.5px solid ${r.active ? 'hsl(142 71% 35%)' : 'hsl(0 0% 80%)'}`,
                          boxShadow: r.active ? '0 1px 4px rgba(34,197,94,0.25)' : 'none',
                        }}
                        title={r.active ? 'Deactivate' : 'Activate'}
                      >
                        {r.active ? (
                          <FiBell className="h-4 w-4" style={{ color: 'white' }} />
                        ) : (
                          <FiBell className="h-4 w-4" style={{ color: 'hsl(0 0% 55%)' }} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ letterSpacing: '-0.02em', color: r.active ? 'hsl(0 0% 8%)' : 'hsl(0 0% 45%)' }}>{r.title}</p>
                        {r.description && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 50%)' }}>{r.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] flex items-center gap-1 font-medium" style={{ color: 'hsl(0 0% 40%)' }}>
                            <FiClock className="h-2.5 w-2.5" /> {r.time}
                          </span>
                          <span className="w-0.5 h-0.5" style={{ background: 'hsl(0 0% 60%)', borderRadius: '50%' }} />
                          <span className="text-[10px]" style={{ color: 'hsl(0 0% 55%)' }}>{r.days.join(', ')}</span>
                        </div>
                        {r.active && nextTrigger && (
                          <p className="text-[10px] mt-1 font-medium" style={{ color: 'hsl(220 70% 50%)' }}>Next: {nextTrigger}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReminder(r.id)}
                        className="h-8 w-8 p-0 flex-shrink-0 opacity-30 hover:opacity-100 transition-opacity"
                        style={{ borderRadius: '0' }}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" style={{ color: 'hsl(0 84% 55%)' }} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tip - subtle embedded */}
        {reminders.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3" style={{ background: 'hsl(0 0% 97%)', borderLeft: '2px solid hsl(0 0% 80%)' }}>
            <FiInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(0 0% 50%)' }} />
            <p className="text-[11px]" style={{ color: 'hsl(0 0% 45%)', lineHeight: '1.6' }}>
              Reminders work while you have this page open. Keep it open in a tab for notifications to appear at the scheduled time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
