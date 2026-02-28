'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FiBell, FiPlus, FiTrash2, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi'

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Daily Reminders</h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>Set study reminders to stay on track</p>
          </div>
          {activeCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1" style={{ borderRadius: '0' }}>
              <FiBell className="h-3 w-3" />
              <span className="text-xs font-medium">{activeCount} active</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {notifications.length > 0 && (
        <div className="px-6 py-3" style={{ background: 'hsl(220 70% 95%)', borderBottom: '1px solid hsl(220 70% 85%)' }}>
          <div className="flex items-center gap-2">
            <FiBell className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(220 70% 45%)' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(220 70% 30%)' }}>{notifications[0]}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Quick presets */}
        {reminders.length === 0 && (
          <div>
            <h3 className="text-xs font-bold mb-3" style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Quick Add Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {presetReminders.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => addPreset(preset)}
                  className="flex items-center gap-3 p-3 text-left transition-colors hover:bg-[hsl(0,0%,97%)]"
                  style={{ border: '1px solid hsl(0 0% 85%)' }}
                >
                  <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(0 0% 94%)' }}>
                    <FiClock className="h-4 w-4" style={{ color: 'hsl(0 0% 40%)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ letterSpacing: '-0.02em' }}>{preset.title}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>{preset.time} - {preset.days.join(', ')}</p>
                  </div>
                  <FiPlus className="h-4 w-4 ml-auto flex-shrink-0" style={{ color: 'hsl(0 0% 60%)' }} />
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
            className="w-full h-10 text-sm"
            style={{ borderRadius: '0', borderStyle: 'dashed' }}
          >
            <FiPlus className="h-4 w-4 mr-2" /> Add Custom Reminder
          </Button>
        ) : (
          <Card style={{ border: '1px solid hsl(0 0% 85%)', borderRadius: '0' }}>
            <CardContent className="p-5">
              <h3 className="font-serif text-sm font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>New Reminder</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Reminder Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Math Practice Session"
                    className="text-sm h-10"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Description (optional)</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What to focus on"
                    className="text-sm h-10"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 0% 40%)' }}>Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-sm h-10"
                    style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(0 0% 40%)' }}>Repeat on</label>
                  <div className="flex gap-1.5">
                    {ALL_DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className="w-10 h-10 text-xs font-medium transition-colors"
                        style={{
                          background: selectedDays.includes(day) ? 'hsl(0 0% 8%)' : 'hsl(0 0% 94%)',
                          color: selectedDays.includes(day) ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
                          border: `1px solid ${selectedDays.includes(day) ? 'hsl(0 0% 8%)' : 'hsl(0 0% 80%)'}`,
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={addReminder}
                    disabled={!title.trim() || selectedDays.length === 0}
                    className="flex-1 h-10"
                    style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
                  >
                    <FiCheck className="h-4 w-4 mr-2" /> Save Reminder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setTitle(''); setDescription('') }}
                    className="h-10"
                    style={{ borderRadius: '0' }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reminders list */}
        {reminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiBell className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>No reminders set</h3>
            <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Use the presets above or create a custom reminder.</p>
          </div>
        )}

        {reminders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold mb-3" style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Your Reminders</h3>
            <div className="space-y-2">
              {reminders.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 transition-colors"
                  style={{
                    border: '1px solid hsl(0 0% 85%)',
                    background: r.active ? 'hsl(0 0% 100%)' : 'hsl(0 0% 96%)',
                    opacity: r.active ? 1 : 0.6,
                  }}
                >
                  <button
                    onClick={() => toggleReminder(r.id)}
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      background: r.active ? 'hsl(142 71% 45%)' : 'hsl(0 0% 85%)',
                      border: `1px solid ${r.active ? 'hsl(142 71% 35%)' : 'hsl(0 0% 75%)'}`,
                    }}
                    title={r.active ? 'Deactivate' : 'Activate'}
                  >
                    {r.active ? (
                      <FiBell className="h-4 w-4" style={{ color: 'white' }} />
                    ) : (
                      <FiBell className="h-4 w-4" style={{ color: 'hsl(0 0% 50%)' }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>{r.title}</p>
                    {r.description && (
                      <p className="text-[10px]" style={{ color: 'hsl(0 0% 50%)' }}>{r.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(0 0% 40%)' }}>
                        <FiClock className="h-2.5 w-2.5" /> {r.time}
                      </span>
                      <span className="text-[10px]" style={{ color: 'hsl(0 0% 55%)' }}>{r.days.join(', ')}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteReminder(r.id)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                    style={{ borderRadius: '0' }}
                  >
                    <FiTrash2 className="h-4 w-4" style={{ color: 'hsl(0 84% 60%)' }} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        {reminders.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2" style={{ background: 'hsl(45 93% 95%)', border: '1px solid hsl(45 93% 80%)' }}>
            <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(45 93% 40%)' }} />
            <p className="text-[11px]" style={{ color: 'hsl(45 50% 30%)', lineHeight: '1.6' }}>
              Reminders work while you have this page open. Keep it open in a tab for notifications to appear at the scheduled time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
