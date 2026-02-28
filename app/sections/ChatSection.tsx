'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FiSend, FiBook, FiLoader } from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
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
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Chat</h2>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>Ask questions about your study materials</p>
        </div>
        {noteCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1" style={{ borderRadius: '0' }}>
            <FiBook className="h-3 w-3" />
            <span className="text-xs font-medium">{noteCount} {noteCount === 1 ? 'note' : 'notes'} connected</span>
          </Badge>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6" style={{ lineHeight: '1.7' }}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 flex items-center justify-center mb-6" style={{ background: 'hsl(0 0% 94%)', borderRadius: '0' }}>
              <FiBook className="h-8 w-8" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-lg font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Start studying</h3>
            <p className="text-sm max-w-md" style={{ color: 'hsl(0 0% 40%)' }}>
              Upload your notes in the My Notes section, then come back here to ask questions. Your AI study helper will reference your materials to give you accurate answers.
            </p>
            {noteCount === 0 && (
              <p className="text-xs mt-4 px-3 py-2" style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 40%)' }}>
                No notes uploaded yet. Add your study materials to get started.
              </p>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
              {/* Message bubble */}
              <div
                className="px-4 py-3"
                style={{
                  borderRadius: '0',
                  background: msg.role === 'user' ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
                  color: msg.role === 'user' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 8%)',
                  border: msg.role === 'assistant' ? '1px solid hsl(0 0% 85%)' : 'none',
                }}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm" style={{ lineHeight: '1.7' }}>{msg.content}</p>
                ) : (
                  renderMarkdown(msg.content)
                )}
              </div>

              {/* Source references */}
              {msg.role === 'assistant' && msg.sourceReferences && (
                <div className="mt-2 px-3 py-2" style={{ background: 'hsl(0 0% 94%)', border: '1px solid hsl(0 0% 88%)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FiBook className="h-3 w-3" style={{ color: 'hsl(0 80% 45%)' }} />
                    <span className="text-xs font-medium" style={{ color: 'hsl(0 80% 45%)', letterSpacing: '-0.02em' }}>Sources</span>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(0 0% 40%)', lineHeight: '1.7' }}>{msg.sourceReferences}</p>
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.role === 'assistant' && Array.isArray(msg.followUpSuggestions) && msg.followUpSuggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <HiOutlineSparkles className="h-3 w-3" style={{ color: 'hsl(0 0% 40%)' }} />
                    <span className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>Follow-up questions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.followUpSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFollowUp(suggestion)}
                        disabled={loading}
                        className="text-xs text-left px-3 py-1.5 transition-colors hover:bg-[hsl(0,0%,94%)] disabled:opacity-50"
                        style={{
                          border: '1px solid hsl(0 0% 85%)',
                          borderRadius: '0',
                          color: 'hsl(0 0% 8%)',
                          background: 'hsl(0 0% 100%)',
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-[10px] mt-1.5 px-1" style={{ color: 'hsl(0 0% 60%)' }}>{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3" style={{ border: '1px solid hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}>
              <div className="flex items-center gap-2">
                <FiLoader className="h-4 w-4 animate-spin" style={{ color: 'hsl(0 0% 40%)' }} />
                <span className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'hsl(0 0% 85%)', background: 'hsl(0 0% 98%)' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your study materials..."
            disabled={loading}
            className="flex-1 text-sm h-11"
            style={{ borderRadius: '0', borderColor: 'hsl(0 0% 85%)', letterSpacing: '-0.02em' }}
          />
          <Button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="h-11 px-5"
            style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
          >
            {loading ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : (
              <FiSend className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
