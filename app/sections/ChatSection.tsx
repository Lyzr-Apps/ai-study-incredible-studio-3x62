'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FiSend, FiBook, FiLoader, FiArrowRight } from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-4 mb-1.5" style={{ color: 'hsl(0 0% 10%)', letterSpacing: '-0.01em' }}>{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-4 mb-1.5" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-5 mb-2" style={{ color: 'hsl(0 0% 6%)', letterSpacing: '-0.02em' }}>{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-2" />
        return <p key={i} className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 20%)' }}>{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold" style={{ color: 'hsl(0 0% 8%)' }}>{part}</strong> : part
  )
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceReferences?: string
  followUpSuggestions?: string[]
  timestamp: string
}

interface ChatSectionProps {
  messages: ChatMessage[]
  loading: boolean
  onSendMessage: (message: string) => void
  noteCount: number
}

const STARTER_QUESTIONS = [
  'Explain the key concepts from my notes',
  'Create a summary of my study materials',
  'What are the most important topics to review?',
]

export default function ChatSection({ messages, loading, onSendMessage, noteCount }: ChatSectionProps) {
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || loading) return
    onSendMessage(trimmed)
    setInputValue('')
  }

  const handleFollowUp = (question: string) => {
    if (loading) return
    onSendMessage(question)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 90%)' }}>
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>Chat</h2>
          <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 45%)', letterSpacing: '-0.01em' }}>Ask questions about your study materials</p>
        </div>
        {noteCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'hsl(0 0% 96%)', border: '1px solid hsl(0 0% 90%)', borderRadius: '0' }}>
            <FiBook className="h-3 w-3" style={{ color: 'hsl(0 0% 40%)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'hsl(0 0% 35%)' }}>{noteCount} {noteCount === 1 ? 'note' : 'notes'} connected</span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(0 0% 80%) transparent' }}>
        {/* Empty state -- hero area */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-20 h-20 flex items-center justify-center mb-8 relative" style={{ background: 'hsl(0 0% 96%)', borderRadius: '0' }}>
              <FiBook className="h-9 w-9" style={{ color: 'hsl(0 0% 35%)' }} />
              <div className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center" style={{ background: 'hsl(0 80% 45%)' }}>
                <HiOutlineSparkles className="h-3 w-3" style={{ color: 'hsl(0 0% 100%)' }} />
              </div>
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 8%)' }}>Start a conversation</h3>
            <p className="text-sm max-w-md mb-2 leading-relaxed" style={{ color: 'hsl(0 0% 40%)' }}>
              Upload your notes in the My Notes section, then ask questions here. Your AI tutor will reference your materials for accurate, detailed answers.
            </p>
            {noteCount === 0 && (
              <p className="text-xs mt-2 px-4 py-2" style={{ background: 'hsl(0 0% 96%)', color: 'hsl(0 0% 45%)', border: '1px solid hsl(0 0% 90%)' }}>
                No notes uploaded yet. Add your study materials to get started.
              </p>
            )}

            {/* Starter questions */}
            <div className="mt-8 w-full max-w-lg">
              <p className="text-[10px] font-semibold mb-3" style={{ color: 'hsl(0 0% 50%)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Try asking</p>
              <div className="space-y-2">
                {STARTER_QUESTIONS.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFollowUp(question)}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-all duration-150 group disabled:opacity-50"
                    style={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 90%)', color: 'hsl(0 0% 20%)', borderRadius: '0', letterSpacing: '-0.01em' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'hsl(0 0% 97%)'
                      e.currentTarget.style.borderColor = 'hsl(0 80% 45%)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'hsl(0 0% 100%)'
                      e.currentTarget.style.borderColor = 'hsl(0 0% 90%)'
                    }}
                  >
                    <span>{question}</span>
                    <FiArrowRight className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ color: 'hsl(0 80% 45%)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
              {/* Message bubble */}
              <div
                className="px-5 py-4"
                style={{
                  borderRadius: '0',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, hsl(0 0% 10%), hsl(0 0% 14%))'
                    : 'hsl(0 0% 100%)',
                  color: msg.role === 'user' ? 'hsl(0 0% 96%)' : 'hsl(0 0% 15%)',
                  border: msg.role === 'assistant' ? '1px solid hsl(0 0% 90%)' : 'none',
                  borderLeft: msg.role === 'assistant' ? '3px solid hsl(0 80% 45%)' : 'none',
                  boxShadow: msg.role === 'user'
                    ? '0 2px 8px rgba(0,0,0,0.12)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm" style={{ lineHeight: '1.7' }}>{msg.content}</p>
                ) : (
                  renderMarkdown(msg.content)
                )}
              </div>

              {/* Source references -- card style */}
              {msg.role === 'assistant' && msg.sourceReferences && (
                <div className="mt-2.5 px-4 py-3 flex items-start gap-2.5" style={{ background: 'hsl(0 0% 97%)', border: '1px solid hsl(0 0% 90%)', borderLeft: '3px solid hsl(0 80% 45%)' }}>
                  <FiBook className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'hsl(0 80% 45%)' }} />
                  <div>
                    <span className="text-[10px] font-bold block mb-0.5" style={{ color: 'hsl(0 80% 40%)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sources</span>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(0 0% 35%)' }}>{msg.sourceReferences}</p>
                  </div>
                </div>
              )}

              {/* Follow-up suggestions -- pill-shaped */}
              {msg.role === 'assistant' && Array.isArray(msg.followUpSuggestions) && msg.followUpSuggestions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <HiOutlineSparkles className="h-3 w-3" style={{ color: 'hsl(0 0% 45%)' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'hsl(0 0% 45%)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Follow-up questions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.followUpSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFollowUp(suggestion)}
                        disabled={loading}
                        className="text-xs text-left px-3.5 py-2 transition-all duration-150 disabled:opacity-50 group"
                        style={{
                          border: '1px solid hsl(0 0% 88%)',
                          borderRadius: '0',
                          color: 'hsl(0 0% 15%)',
                          background: 'hsl(0 0% 100%)',
                          letterSpacing: '-0.01em',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'hsl(0 0% 6%)'
                          e.currentTarget.style.color = 'hsl(0 0% 98%)'
                          e.currentTarget.style.borderColor = 'hsl(0 0% 6%)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'hsl(0 0% 100%)'
                          e.currentTarget.style.color = 'hsl(0 0% 15%)'
                          e.currentTarget.style.borderColor = 'hsl(0 0% 88%)'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp -- refined */}
              <p className="text-[9px] mt-2 px-1 font-medium" style={{ color: 'hsl(0 0% 62%)', letterSpacing: '0.02em' }}>{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator -- animated dots */}
        {loading && (
          <div className="flex justify-start">
            <div className="px-5 py-4" style={{ border: '1px solid hsl(0 0% 90%)', borderLeft: '3px solid hsl(0 80% 45%)', background: 'hsl(0 0% 100%)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 animate-bounce" style={{ background: 'hsl(0 0% 40%)', borderRadius: '50%', animationDelay: '0ms', animationDuration: '1s' }} />
                  <span className="inline-block w-1.5 h-1.5 animate-bounce" style={{ background: 'hsl(0 0% 50%)', borderRadius: '50%', animationDelay: '150ms', animationDuration: '1s' }} />
                  <span className="inline-block w-1.5 h-1.5 animate-bounce" style={{ background: 'hsl(0 0% 60%)', borderRadius: '50%', animationDelay: '300ms', animationDuration: '1s' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'hsl(0 0% 45%)', letterSpacing: '-0.01em' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar -- prominent with shadow */}
      <div className="px-6 py-5 border-t" style={{ borderColor: 'hsl(0 0% 90%)', background: 'hsl(0 0% 98%)' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your study materials..."
              disabled={loading}
              className="flex-1 text-sm h-12 px-4"
              style={{ borderRadius: '0', borderColor: 'hsl(0 0% 88%)', letterSpacing: '-0.01em', background: 'hsl(0 0% 100%)' }}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="h-12 w-12 p-0 flex items-center justify-center transition-all duration-150"
            style={{
              borderRadius: '0',
              background: loading || !inputValue.trim() ? 'hsl(0 0% 80%)' : 'hsl(0 0% 8%)',
              color: 'hsl(0 0% 98%)',
              boxShadow: loading || !inputValue.trim() ? 'none' : '0 1px 6px rgba(0,0,0,0.12)',
            }}
          >
            {loading ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : (
              <FiSend className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-[10px] mt-2 text-center" style={{ color: 'hsl(0 0% 58%)' }}>Answers are generated from your uploaded study materials</p>
      </div>
    </div>
  )
}
