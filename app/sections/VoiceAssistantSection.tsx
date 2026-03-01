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
  FiSearch,
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
  region: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: 'EN', speechCode: 'en-US', region: 'Americas' },
  { code: 'hi', name: 'Hindi', flag: 'HI', speechCode: 'hi-IN', region: 'South Asia' },
  { code: 'es', name: 'Spanish', flag: 'ES', speechCode: 'es-ES', region: 'Europe' },
  { code: 'fr', name: 'French', flag: 'FR', speechCode: 'fr-FR', region: 'Europe' },
  { code: 'de', name: 'German', flag: 'DE', speechCode: 'de-DE', region: 'Europe' },
  { code: 'ja', name: 'Japanese', flag: 'JA', speechCode: 'ja-JP', region: 'East Asia' },
  { code: 'ko', name: 'Korean', flag: 'KO', speechCode: 'ko-KR', region: 'East Asia' },
  { code: 'zh', name: 'Chinese', flag: 'ZH', speechCode: 'zh-CN', region: 'East Asia' },
  { code: 'ar', name: 'Arabic', flag: 'AR', speechCode: 'ar-SA', region: 'Middle East' },
  { code: 'pt', name: 'Portuguese', flag: 'PT', speechCode: 'pt-BR', region: 'Americas' },
  { code: 'ru', name: 'Russian', flag: 'RU', speechCode: 'ru-RU', region: 'Europe' },
  { code: 'ta', name: 'Tamil', flag: 'TA', speechCode: 'ta-IN', region: 'South Asia' },
  { code: 'te', name: 'Telugu', flag: 'TE', speechCode: 'te-IN', region: 'South Asia' },
  { code: 'bn', name: 'Bengali', flag: 'BN', speechCode: 'bn-IN', region: 'South Asia' },
  { code: 'mr', name: 'Marathi', flag: 'MR', speechCode: 'mr-IN', region: 'South Asia' },
  { code: 'gu', name: 'Gujarati', flag: 'GU', speechCode: 'gu-IN', region: 'South Asia' },
  { code: 'ur', name: 'Urdu', flag: 'UR', speechCode: 'ur-PK', region: 'South Asia' },
  { code: 'it', name: 'Italian', flag: 'IT', speechCode: 'it-IT', region: 'Europe' },
  { code: 'tr', name: 'Turkish', flag: 'TR', speechCode: 'tr-TR', region: 'Middle East' },
  { code: 'th', name: 'Thai', flag: 'TH', speechCode: 'th-TH', region: 'East Asia' },
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
  const [langSearch, setLangSearch] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const langDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
    }
    synthRef.current = window.speechSynthesis
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, transcript, interimTranscript])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setShowLanguages(false)
        setLangSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        try { agentData = JSON.parse(agentData) } catch { responseText = agentData as string }
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
      const voices = synthRef.current.getVoices()
      const langVoice = voices.find((v) => v.lang.startsWith(selectedLanguage.code))
      if (langVoice) utterance.voice = langVoice
      utterance.onstart = () => { setIsSpeaking(true); setSpeakingMessageId(messageId) }
      utterance.onend = () => { setIsSpeaking(false); setSpeakingMessageId(null) }
      utterance.onerror = () => { setIsSpeaking(false); setSpeakingMessageId(null) }
      synthRef.current.speak(utterance)
    },
    [selectedLanguage]
  )

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel()
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
    recognition.onstart = () => { setIsListening(true); setError(null); setTranscript(''); setInterimTranscript('') }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) { finalText += result[0].transcript } else { interimText += result[0].transcript }
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
    recognition.onend = () => { setIsListening(false) }
    recognitionRef.current = recognition
    recognition.start()
  }, [selectedLanguage, stopSpeaking])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
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
      const langInstruction = selectedLanguage.code !== 'en'
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
        if (autoSpeak) setTimeout(() => speakText(answer, assistantMsg.id), 300)
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
    if (fullText) sendVoiceMessage(fullText)
  }, [stopListening, transcript, interimTranscript, sendVoiceMessage])

  const clearConversation = () => {
    stopSpeaking()
    setMessages([])
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }

  const currentTranscript = (transcript + ' ' + interimTranscript).trim()

  // Group languages by region for dropdown
  const regions = ['Americas', 'Europe', 'South Asia', 'East Asia', 'Middle East']
  const filteredLanguages = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiMic className="h-4 w-4" style={{ color: 'hsl(0 0% 30%)' }} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 6%)' }}>Voice Assistant</h2>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 45%)' }}>Speak in any language and get spoken answers</p>
            </div>
          </div>
          {noteCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderRadius: '0', background: 'hsl(0 0% 94%)', border: '1px solid hsl(0 0% 85%)' }}>
              <FiBook className="h-3 w-3" />
              <span className="text-xs font-semibold">{noteCount} notes</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Compact controls bar */}
      <div className="px-6 py-2.5 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid hsl(0 0% 90%)', background: 'hsl(0 0% 98%)' }}>
        {/* Language selector with search */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all duration-200 hover:shadow-sm"
            style={{ border: '1px solid hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}
          >
            <FiGlobe className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 35%)' }} />
            <span className="w-6 text-center text-[10px] font-bold py-0.5" style={{ background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 25%)' }}>{selectedLanguage.flag}</span>
            <span>{selectedLanguage.name}</span>
            <FiChevronDown className="h-3 w-3 ml-1" style={{ color: 'hsl(0 0% 50%)', transform: showLanguages ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }} />
          </button>

          {showLanguages && (
            <div className="absolute top-full left-0 mt-1 w-64 z-50 animate-fadeIn" style={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 85%)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              {/* Search input */}
              <div className="p-2" style={{ borderBottom: '1px solid hsl(0 0% 92%)' }}>
                <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'hsl(0 0% 97%)', border: '1px solid hsl(0 0% 88%)' }}>
                  <FiSearch className="h-3 w-3 flex-shrink-0" style={{ color: 'hsl(0 0% 50%)' }} />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search languages..."
                    className="text-xs bg-transparent outline-none w-full"
                    style={{ color: 'hsl(0 0% 10%)' }}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto scrollbar-thin">
                {langSearch ? (
                  filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLanguage(lang); setShowLanguages(false); setLangSearch('') }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors hover:bg-[hsl(0,0%,96%)]"
                      style={{ background: selectedLanguage.code === lang.code ? 'hsl(0 0% 94%)' : 'transparent', fontWeight: selectedLanguage.code === lang.code ? 600 : 400 }}
                    >
                      <span className="w-7 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 30%)' }}>{lang.flag}</span>
                      <span>{lang.name}</span>
                      <span className="ml-auto text-[9px]" style={{ color: 'hsl(0 0% 55%)' }}>{lang.region}</span>
                    </button>
                  ))
                ) : (
                  regions.map((region) => {
                    const regionLangs = LANGUAGES.filter(l => l.region === region)
                    if (regionLangs.length === 0) return null
                    return (
                      <div key={region}>
                        <div className="px-3 py-1.5" style={{ background: 'hsl(0 0% 97%)' }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'hsl(0 0% 45%)' }}>{region}</span>
                        </div>
                        {regionLangs.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => { setSelectedLanguage(lang); setShowLanguages(false); setLangSearch('') }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors hover:bg-[hsl(0,0%,96%)]"
                            style={{ background: selectedLanguage.code === lang.code ? 'hsl(0 0% 94%)' : 'transparent', fontWeight: selectedLanguage.code === lang.code ? 600 : 400 }}
                          >
                            <span className="w-7 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 30%)' }}>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAutoSpeak(!autoSpeak); if (autoSpeak) stopSpeaking() }}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all duration-200"
            style={{
              border: '1px solid hsl(0 0% 85%)',
              background: autoSpeak ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
              color: autoSpeak ? 'hsl(0 0% 98%)' : 'hsl(0 0% 40%)',
            }}
          >
            {autoSpeak ? <FiVolume2 className="h-3 w-3" /> : <FiVolumeX className="h-3 w-3" />}
            Auto
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium transition-all duration-200 hover:bg-[hsl(0,84%,97%)]"
              style={{ border: '1px solid hsl(0 0% 88%)' }}
            >
              <FiTrash2 className="h-3 w-3" style={{ color: 'hsl(0 84% 55%)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4" style={{ lineHeight: '1.7' }}>
        {!speechSupported && (
          <div className="px-4 py-3" style={{ background: 'hsl(0 84% 97%)', borderLeft: '3px solid hsl(0 84% 60%)' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(0 84% 35%)' }}>Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for voice features.</p>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-fadeIn">
            {/* Concentric circle decoration */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-40 h-40" style={{ border: '1px solid hsl(0 0% 92%)', borderRadius: '50%' }} />
              <div className="absolute w-32 h-32" style={{ border: '1px solid hsl(0 0% 90%)', borderRadius: '50%' }} />
              <div className="absolute w-24 h-24" style={{ border: '1px solid hsl(0 0% 88%)', borderRadius: '50%' }} />
              <div className="relative w-16 h-16 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)', borderRadius: '50%' }}>
                <FiMic className="h-7 w-7" style={{ color: 'hsl(0 0% 95%)' }} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-bold mb-2" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>Voice Study Assistant</h3>
            <p className="text-sm max-w-md mb-6" style={{ color: 'hsl(0 0% 45%)', lineHeight: '1.7' }}>Tap the microphone and ask a question in any language. The assistant will respond in the same language using your uploaded study materials.</p>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
              {['English', 'Hindi', 'Spanish', 'French', 'Japanese'].map((lang) => (
                <span key={lang} className="text-[10px] px-2.5 py-1 font-semibold" style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 35%)', border: '1px solid hsl(0 0% 88%)' }}>{lang}</span>
              ))}
              <span className="text-[10px] px-2.5 py-1 font-semibold" style={{ background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 35%)', border: '1px solid hsl(0 0% 88%)' }}>+15 more</span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] ${msg.role === 'assistant' ? 'flex' : ''}`}>
              {/* Left accent bar for assistant */}
              {msg.role === 'assistant' && (
                <div className="w-1 flex-shrink-0" style={{ background: 'hsl(0 0% 8%)' }} />
              )}
              <div style={{
                border: '1px solid hsl(0 0% 85%)',
                background: msg.role === 'user' ? 'hsl(0 0% 8%)' : 'hsl(0 0% 100%)',
                borderLeft: msg.role === 'assistant' ? 'none' : undefined,
              }}>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    {msg.role === 'user' ? (
                      <FiMic className="h-3 w-3" style={{ color: 'hsl(0 0% 55%)' }} />
                    ) : (
                      <HiOutlineSparkles className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 30%)' }} />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: msg.role === 'user' ? 'hsl(0 0% 55%)' : 'hsl(0 0% 40%)' }}>
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 font-medium" style={{ background: msg.role === 'user' ? 'hsl(0 0% 18%)' : 'hsl(0 0% 94%)', color: msg.role === 'user' ? 'hsl(0 0% 50%)' : 'hsl(0 0% 45%)' }}>
                      {msg.language}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: msg.role === 'user' ? 'hsl(0 0% 45%)' : 'hsl(0 0% 55%)' }}>{msg.timestamp}</span>
                  </div>
                  <p className="text-sm" style={{ color: msg.role === 'user' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 8%)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>

                {msg.role === 'assistant' && (
                  <div className="px-4 py-2 flex items-center" style={{ borderTop: '1px solid hsl(0 0% 92%)', background: 'hsl(0 0% 98.5%)' }}>
                    <button
                      onClick={() => {
                        if (speakingMessageId === msg.id) { stopSpeaking() } else { speakText(msg.content, msg.id) }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 hover:shadow-sm"
                      style={{
                        color: speakingMessageId === msg.id ? 'hsl(0 0% 100%)' : 'hsl(0 0% 30%)',
                        background: speakingMessageId === msg.id ? 'hsl(0 0% 8%)' : 'hsl(0 0% 94%)',
                        border: '1px solid hsl(0 0% 82%)',
                      }}
                    >
                      {speakingMessageId === msg.id ? (
                        <><FiSquare className="h-3 w-3" /> Stop</>
                      ) : (
                        <><FiVolume2 className="h-3 w-3" /> Listen</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex">
              <div className="w-1 flex-shrink-0" style={{ background: 'hsl(0 0% 8%)' }} />
              <div className="px-4 py-3" style={{ border: '1px solid hsl(0 0% 88%)', borderLeft: 'none', background: 'hsl(0 0% 100%)' }}>
                <div className="flex items-center gap-2">
                  <FiLoader className="h-4 w-4 animate-spin" style={{ color: 'hsl(0 0% 35%)' }} />
                  <span className="text-sm font-medium" style={{ color: 'hsl(0 0% 35%)' }}>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live transcript area */}
      {(isListening || currentTranscript) && (
        <div className="px-6 py-3" style={{ borderTop: '1px solid hsl(0 0% 90%)', background: 'hsl(0 0% 98%)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            {/* Waveform-like decoration */}
            <div className="flex items-center gap-0.5">
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 transition-all duration-150"
                  style={{
                    height: isListening ? `${h * visualizerLevel * 14 + 3}px` : '3px',
                    background: isListening ? 'hsl(0 80% 50%)' : 'hsl(0 0% 65%)',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isListening ? 'hsl(0 80% 45%)' : 'hsl(0 0% 40%)' }}>
              {isListening ? 'Listening...' : 'Ready to send'}
            </span>
          </div>
          <p className="text-sm" style={{ color: currentTranscript ? 'hsl(0 0% 8%)' : 'hsl(0 0% 55%)', minHeight: '1.5em' }}>
            {currentTranscript || 'Speak now...'}
          </p>
        </div>
      )}

      {/* Voice control bar */}
      <div className="px-6 py-6 flex flex-col items-center gap-4" style={{ borderTop: '1px solid hsl(0 0% 88%)', background: 'hsl(0 0% 97%)' }}>
        {/* Dramatic mic button with rings */}
        <div className="relative flex items-center justify-center">
          {isListening && (
            <>
              <div
                className="absolute rounded-full animate-pulse"
                style={{
                  width: `${90 + visualizerLevel * 40}px`,
                  height: `${90 + visualizerLevel * 40}px`,
                  background: 'hsl(0 80% 95%)',
                  opacity: 0.25,
                }}
              />
              <div
                className="absolute rounded-full animate-pulse"
                style={{
                  width: `${75 + visualizerLevel * 25}px`,
                  height: `${75 + visualizerLevel * 25}px`,
                  background: 'hsl(0 80% 90%)',
                  opacity: 0.4,
                  animationDelay: '150ms',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: `${65 + visualizerLevel * 10}px`,
                  height: `${65 + visualizerLevel * 10}px`,
                  background: 'hsl(0 80% 85%)',
                  opacity: 0.5,
                }}
              />
            </>
          )}

          <button
            onClick={isListening ? handleDone : startListening}
            disabled={loading || !speechSupported}
            className="relative z-10 w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300 disabled:opacity-40"
            style={{
              background: isListening ? 'hsl(0 80% 45%)' : 'hsl(0 0% 8%)',
              color: 'hsl(0 0% 98%)',
              boxShadow: isListening ? '0 0 0 4px hsl(0 80% 85%), 0 4px 16px rgba(220,38,38,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {loading ? (
              <FiLoader className="h-6 w-6 animate-spin" />
            ) : (
              <FiMic className="h-6 w-6" />
            )}
          </button>
        </div>

        <p className="text-xs text-center font-medium" style={{ color: 'hsl(0 0% 40%)' }}>
          {!speechSupported
            ? 'Voice not supported in this browser'
            : loading
              ? 'Processing your question...'
              : isListening
                ? 'Listening... Tap to send'
                : 'Tap microphone to start speaking'}
        </p>

        {!isListening && currentTranscript && !loading && (
          <Button
            onClick={() => sendVoiceMessage(currentTranscript)}
            className="w-full max-w-xs h-11 font-semibold"
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
