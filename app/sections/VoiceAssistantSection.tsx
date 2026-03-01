'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FiMic,
  FiMicOff,
  FiVolume2,
  FiVolumeX,
  FiLoader,
  FiGlobe,
  FiTrash2,
  FiChevronDown,
  FiBook,
  FiSquare,
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69a28f6f2d763c5cd4148906'

interface VoiceMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  language: string
  timestamp: string
  isPlaying?: boolean
}

interface LanguageOption {
  code: string
  name: string
  flag: string
  speechCode: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: 'EN', speechCode: 'en-US' },
  { code: 'hi', name: 'Hindi', flag: 'HI', speechCode: 'hi-IN' },
  { code: 'es', name: 'Spanish', flag: 'ES', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', flag: 'FR', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', flag: 'DE', speechCode: 'de-DE' },
  { code: 'ja', name: 'Japanese', flag: 'JA', speechCode: 'ja-JP' },
  { code: 'ko', name: 'Korean', flag: 'KO', speechCode: 'ko-KR' },
  { code: 'zh', name: 'Chinese', flag: 'ZH', speechCode: 'zh-CN' },
  { code: 'ar', name: 'Arabic', flag: 'AR', speechCode: 'ar-SA' },
  { code: 'pt', name: 'Portuguese', flag: 'PT', speechCode: 'pt-BR' },
  { code: 'ru', name: 'Russian', flag: 'RU', speechCode: 'ru-RU' },
  { code: 'ta', name: 'Tamil', flag: 'TA', speechCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', flag: 'TE', speechCode: 'te-IN' },
  { code: 'bn', name: 'Bengali', flag: 'BN', speechCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', flag: 'MR', speechCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', flag: 'GU', speechCode: 'gu-IN' },
  { code: 'ur', name: 'Urdu', flag: 'UR', speechCode: 'ur-PK' },
  { code: 'it', name: 'Italian', flag: 'IT', speechCode: 'it-IT' },
  { code: 'tr', name: 'Turkish', flag: 'TR', speechCode: 'tr-TR' },
  { code: 'th', name: 'Thai', flag: 'TH', speechCode: 'th-TH' },
]

interface VoiceAssistantSectionProps {
  noteCount: number
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export default function VoiceAssistantSection({ noteCount }: VoiceAssistantSectionProps) {
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0])
  const [showLanguages, setShowLanguages] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [visualizerLevel, setVisualizerLevel] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const langDropdownRef = useRef<HTMLDivElement>(null)

  // Check speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
    }
    synthRef.current = window.speechSynthesis
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, transcript, interimTranscript])

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setShowLanguages(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Visualizer animation
  useEffect(() => {
    if (isListening) {
      const animate = () => {
        setVisualizerLevel(Math.random() * 0.7 + 0.3)
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setVisualizerLevel(0)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isListening])

  const extractAgentText = (result: Record<string, unknown> | null | undefined): string => {
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

  const speakText = useCallback(
    (text: string, messageId: string) => {
      if (!synthRef.current) return

      synthRef.current.cancel()
      const cleanText = stripMarkdown(text)
      if (!cleanText) return

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = selectedLanguage.speechCode
      utterance.rate = 0.95
      utterance.pitch = 1.0

      // Try to find a voice matching the selected language
      const voices = synthRef.current.getVoices()
      const langVoice = voices.find((v) => v.lang.startsWith(selectedLanguage.code))
      if (langVoice) {
        utterance.voice = langVoice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setSpeakingMessageId(messageId)
      }
      utterance.onend = () => {
        setIsSpeaking(false)
        setSpeakingMessageId(null)
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        setSpeakingMessageId(null)
      }

      synthRef.current.speak(utterance)
    },
    [selectedLanguage]
  )

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsSpeaking(false)
    setSpeakingMessageId(null)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    stopSpeaking()

    const recognition = new SpeechRecognition()
    recognition.lang = selectedLanguage.speechCode
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
      setInterimTranscript('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      if (finalText) setTranscript(finalText)
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(`Microphone error: ${event.error}. Check permissions and try again.`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [selectedLanguage, stopSpeaking])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const sendVoiceMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      const userMsg: VoiceMessage = {
        id: `voice-user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        language: selectedLanguage.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, userMsg])
      setTranscript('')
      setInterimTranscript('')
      setLoading(true)
      setError(null)

      const langInstruction =
        selectedLanguage.code !== 'en'
          ? `IMPORTANT: Please respond in ${selectedLanguage.name} language. The user is speaking in ${selectedLanguage.name}.`
          : ''

      const prompt = `${langInstruction}\n\nUser question (via voice): ${text.trim()}`

      try {
        const result = await callAIAgent(prompt, AGENT_ID)
        const responseText = extractAgentText(result as Record<string, unknown>)

        const answer = responseText || 'I could not process your question. Please try again.'

        const assistantMsg: VoiceMessage = {
          id: `voice-assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          language: selectedLanguage.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (autoSpeak) {
          setTimeout(() => speakText(answer, assistantMsg.id), 300)
        }
      } catch {
        const errorMsg: VoiceMessage = {
          id: `voice-error-${Date.now()}`,
          role: 'assistant',
          content: 'An error occurred while processing your question. Please try again.',
          language: selectedLanguage.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, errorMsg])
      }

      setLoading(false)
    },
    [selectedLanguage, autoSpeak, speakText]
  )

  const handleDone = useCallback(() => {
    stopListening()
    const fullText = (transcript + ' ' + interimTranscript).trim()
    if (fullText) {
      sendVoiceMessage(fullText)
    }
  }, [stopListening, transcript, interimTranscript, sendVoiceMessage])

  const clearConversation = () => {
    stopSpeaking()
    setMessages([])
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }

  const currentTranscript = (transcript + ' ' + interimTranscript).trim()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Voice Assistant
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>
              Speak in any language and get spoken answers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {noteCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1" style={{ borderRadius: '0' }}>
                <FiBook className="h-3 w-3" />
                <span className="text-xs font-medium">{noteCount} notes</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div
        className="px-6 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ borderBottom: '1px solid hsl(0 0% 85%)', background: 'hsl(0 0% 97%)' }}
      >
        {/* Language selector */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-[hsl(0,0%,93%)]"
            style={{ border: '1px solid hsl(0 0% 85%)' }}
          >
            <FiGlobe className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />
            <span>{selectedLanguage.name}</span>
            <FiChevronDown className="h-3 w-3" style={{ color: 'hsl(0 0% 50%)' }} />
          </button>

          {showLanguages && (
            <div
              className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto z-50"
              style={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 85%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang)
                    setShowLanguages(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors hover:bg-[hsl(0,0%,96%)]"
                  style={{
                    background: selectedLanguage.code === lang.code ? 'hsl(0 0% 94%)' : 'transparent',
                    fontWeight: selectedLanguage.code === lang.code ? 600 : 400,
                  }}
                >
                  <span
                    className="w-7 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 30%)' }}
                  >
                    {lang.flag}
                  </span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-speak toggle */}
          <button
            onClick={() => {
              setAutoSpeak(!autoSpeak)
              if (autoSpeak) stopSpeaking()
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              border: '1px solid hsl(0 0% 85%)',
              background: autoSpeak ? 'hsl(0 0% 8%)' : 'transparent',
              color: autoSpeak ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
            }}
          >
            {autoSpeak ? <FiVolume2 className="h-3 w-3" /> : <FiVolumeX className="h-3 w-3" />}
            Auto-speak
          </button>

          {/* Clear button */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="h-8 px-2"
              style={{ borderRadius: '0' }}
            >
              <FiTrash2 className="h-3.5 w-3.5" style={{ color: 'hsl(0 84% 60%)' }} />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ lineHeight: '1.7' }}>
        {!speechSupported && (
          <div className="px-4 py-3" style={{ background: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 80%)' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(0 84% 35%)' }}>
              Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for voice features.
            </p>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div
              className="w-20 h-20 flex items-center justify-center mb-6"
              style={{ background: 'hsl(0 0% 94%)', borderRadius: '50%' }}
            >
              <FiMic className="h-9 w-9" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-lg font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Voice Study Assistant
            </h3>
            <p className="text-sm max-w-md mb-4" style={{ color: 'hsl(0 0% 40%)' }}>
              Tap the microphone and ask a question in any language. The assistant will respond in the same language using your uploaded study materials.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {['English', 'Hindi', 'Spanish', 'French', 'Japanese'].map((lang) => (
                <span
                  key={lang}
                  className="text-[10px] px-2 py-1 font-medium"
                  style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 40%)' }}
                >
                  {lang}
                </span>
              ))}
              <span
                className="text-[10px] px-2 py-1 font-medium"
                style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 40%)' }}
              >
                +15 more
              </span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%]"
              style={{
                border: '1px solid hsl(0 0% 85%)',
                background: msg.role === 'user' ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
              }}
            >
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  {msg.role === 'user' ? (
                    <FiMic className="h-3 w-3" style={{ color: 'hsl(0 0% 60%)' }} />
                  ) : (
                    <HiOutlineSparkles className="h-3 w-3" style={{ color: 'hsl(0 80% 45%)' }} />
                  )}
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: msg.role === 'user' ? 'hsl(0 0% 60%)' : 'hsl(0 0% 40%)' }}
                  >
                    {msg.role === 'user' ? 'You' : 'Assistant'} - {msg.language}
                  </span>
                  <span
                    className="text-[10px] ml-auto"
                    style={{ color: msg.role === 'user' ? 'hsl(0 0% 50%)' : 'hsl(0 0% 55%)' }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{
                    color: msg.role === 'user' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 8%)',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </p>
              </div>

              {/* Speak button for assistant messages */}
              {msg.role === 'assistant' && (
                <div
                  className="px-4 py-2 flex items-center gap-2"
                  style={{ borderTop: '1px solid hsl(0 0% 90%)', background: 'hsl(0 0% 98%)' }}
                >
                  <button
                    onClick={() => {
                      if (speakingMessageId === msg.id) {
                        stopSpeaking()
                      } else {
                        speakText(msg.content, msg.id)
                      }
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                    style={{ color: speakingMessageId === msg.id ? 'hsl(0 80% 45%)' : 'hsl(0 0% 40%)' }}
                  >
                    {speakingMessageId === msg.id ? (
                      <>
                        <FiSquare className="h-3 w-3" /> Stop
                      </>
                    ) : (
                      <>
                        <FiVolume2 className="h-3 w-3" /> Listen
                      </>
                    )}
                  </button>
                </div>
              )}
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

      {/* Live transcript display */}
      {(isListening || currentTranscript) && (
        <div className="px-6 py-3" style={{ borderTop: '1px solid hsl(0 0% 88%)', background: 'hsl(0 0% 97%)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 flex-shrink-0 animate-pulse"
              style={{ borderRadius: '50%', background: 'hsl(0 80% 50%)' }}
            />
            <span className="text-[10px] font-medium" style={{ color: 'hsl(0 0% 40%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isListening ? 'Listening...' : 'Ready to send'}
            </span>
          </div>
          <p className="text-sm" style={{ color: currentTranscript ? 'hsl(0 0% 8%)' : 'hsl(0 0% 60%)', minHeight: '1.5em' }}>
            {currentTranscript || 'Speak now...'}
          </p>
        </div>
      )}

      {/* Voice control bar */}
      <div
        className="px-6 py-5 flex flex-col items-center gap-4"
        style={{ borderTop: '1px solid hsl(0 0% 85%)', background: 'hsl(0 0% 98%)' }}
      >
        {/* Visualizer rings */}
        <div className="relative flex items-center justify-center">
          {isListening && (
            <>
              <div
                className="absolute rounded-full transition-transform"
                style={{
                  width: `${80 + visualizerLevel * 40}px`,
                  height: `${80 + visualizerLevel * 40}px`,
                  background: 'hsl(0 80% 95%)',
                  opacity: 0.3,
                  transform: `scale(${1 + visualizerLevel * 0.3})`,
                }}
              />
              <div
                className="absolute rounded-full transition-transform"
                style={{
                  width: `${70 + visualizerLevel * 20}px`,
                  height: `${70 + visualizerLevel * 20}px`,
                  background: 'hsl(0 80% 90%)',
                  opacity: 0.5,
                  transform: `scale(${1 + visualizerLevel * 0.15})`,
                }}
              />
            </>
          )}

          {/* Mic button */}
          <button
            onClick={isListening ? handleDone : startListening}
            disabled={loading || !speechSupported}
            className="relative z-10 w-16 h-16 flex items-center justify-center rounded-full transition-all disabled:opacity-40"
            style={{
              background: isListening ? 'hsl(0 80% 45%)' : 'hsl(0 0% 8%)',
              color: 'hsl(0 0% 98%)',
              boxShadow: isListening ? '0 0 0 4px hsl(0 80% 85%)' : 'none',
            }}
          >
            {loading ? (
              <FiLoader className="h-6 w-6 animate-spin" />
            ) : isListening ? (
              <FiMic className="h-6 w-6" />
            ) : (
              <FiMic className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Status text */}
        <p className="text-xs text-center" style={{ color: 'hsl(0 0% 40%)' }}>
          {!speechSupported
            ? 'Voice not supported in this browser'
            : loading
              ? 'Processing your question...'
              : isListening
                ? 'Listening... Tap to send'
                : 'Tap microphone to start speaking'}
        </p>

        {/* Send button when there's a transcript and not listening */}
        {!isListening && currentTranscript && !loading && (
          <Button
            onClick={() => sendVoiceMessage(currentTranscript)}
            className="w-full max-w-xs h-10"
            style={{ borderRadius: '0', background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
          >
            Send Message
          </Button>
        )}
      </div>
    </div>
  )
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
