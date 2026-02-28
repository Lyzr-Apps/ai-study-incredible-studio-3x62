'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FiMessageSquare, FiFileText, FiBook, FiMenu, FiX, FiChevronRight, FiCalendar, FiTarget, FiGrid, FiBell } from 'react-icons/fi'
import { callAIAgent } from '@/lib/aiAgent'
import { getDocuments, uploadAndTrainDocument, deleteDocuments } from '@/lib/ragKnowledgeBase'
import type { RAGDocument } from '@/lib/ragKnowledgeBase'
import ChatSection from './sections/ChatSection'
import MyNotesSection from './sections/MyNotesSection'
import StudyPlannerSection from './sections/StudyPlannerSection'
import WeakTopicTestSection from './sections/WeakTopicTestSection'
import SmartTimetableSection from './sections/SmartTimetableSection'
import DailyReminderSection from './sections/DailyReminderSection'

const AGENT_ID = '69a28f6f2d763c5cd4148906'
const RAG_ID = '69a28f5af572c99c0ffbe8a7'

const THEME_VARS = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 8%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 8%',
  '--primary': '0 0% 8%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 94%',
  '--accent': '0 80% 45%',
  '--muted': '0 0% 92%',
  '--muted-foreground': '0 0% 40%',
  '--border': '0 0% 85%',
  '--radius': '0rem',
} as React.CSSProperties

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceReferences?: string
  followUpSuggestions?: string[]
  timestamp: string
}

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    content: 'What are the key differences between mitosis and meiosis?',
    timestamp: '2:30 PM',
  },
  {
    id: 'sample-2',
    role: 'assistant',
    content: '## Mitosis vs Meiosis\n\n**Mitosis** produces two identical daughter cells, while **meiosis** produces four genetically unique cells.\n\n### Key Differences:\n\n- **Purpose**: Mitosis is for growth and repair; meiosis is for producing gametes (sex cells)\n- **Division count**: Mitosis involves one division; meiosis involves two divisions (meiosis I and II)\n- **Chromosome number**: Mitosis maintains the diploid number (2n); meiosis reduces it to haploid (n)\n- **Genetic variation**: Mitosis produces clones; meiosis introduces variation through crossing over and independent assortment\n- **Where it occurs**: Mitosis occurs in somatic cells; meiosis occurs in germ cells',
    sourceReferences: 'Chapter 8: Cell Division (Biology Notes.pdf), Section 8.3-8.5',
    followUpSuggestions: [
      'What is crossing over and how does it increase genetic diversity?',
      'Can you explain the stages of meiosis I?',
      'What happens when meiosis goes wrong?',
    ],
    timestamp: '2:31 PM',
  },
  {
    id: 'sample-3',
    role: 'user',
    content: 'Can you explain the stages of meiosis I?',
    timestamp: '2:33 PM',
  },
  {
    id: 'sample-4',
    role: 'assistant',
    content: '## Stages of Meiosis I\n\nMeiosis I is the **reductional division** where homologous chromosomes are separated.\n\n### 1. Prophase I\n- Chromosomes condense and become visible\n- **Crossing over** occurs between homologous chromosomes (synapsis)\n- The nuclear envelope breaks down\n- This is the longest phase of meiosis\n\n### 2. Metaphase I\n- Homologous pairs (bivalents) line up at the metaphase plate\n- **Independent assortment** occurs as pairs orient randomly\n\n### 3. Anaphase I\n- Homologous chromosomes are pulled apart to opposite poles\n- Sister chromatids remain joined at centromeres\n\n### 4. Telophase I\n- Chromosomes arrive at the poles\n- Cytokinesis occurs, producing two haploid cells\n- Each cell has half the original chromosome number',
    sourceReferences: 'Chapter 8: Cell Division (Biology Notes.pdf), Section 8.4',
    followUpSuggestions: [
      'What happens during Meiosis II?',
      'How does independent assortment contribute to genetic variation?',
    ],
    timestamp: '2:34 PM',
  },
]

const SAMPLE_DOCUMENTS: RAGDocument[] = [
  { id: '1', fileName: 'Biology Notes.pdf', fileType: 'pdf', status: 'active', uploadedAt: 'Feb 25, 2026' },
  { id: '2', fileName: 'Chemistry Chapter 5.docx', fileType: 'docx', status: 'active', uploadedAt: 'Feb 26, 2026' },
  { id: '3', fileName: 'History Essay Draft.txt', fileType: 'txt', status: 'processing', uploadedAt: 'Feb 28, 2026' },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(0 0% 98%)', color: 'hsl(0 0% 8%)' }}>
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'hsl(0 0% 40%)' }}>{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 text-sm"
              style={{ background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [activeSection, setActiveSection] = useState<'chat' | 'notes' | 'planner' | 'test' | 'timetable' | 'reminders'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSample, setShowSample] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Notes state
  const [documents, setDocuments] = useState<RAGDocument[] | null>(null)
  const [notesLoading, setNotesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setNotesLoading(true)
    setNotesError(null)
    try {
      const result = await getDocuments(RAG_ID)
      if (result.success) {
        setDocuments(result.documents ?? [])
      } else {
        setNotesError(result.error ?? 'Failed to load documents')
      }
    } catch {
      setNotesError('Failed to load documents')
    }
    setNotesLoading(false)
  }

  const handleSendMessage = useCallback(async (message: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setChatLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(message, AGENT_ID)
      let answer = ''
      let sourceReferences = ''
      let followUpSuggestions: string[] = []

      if (result?.success) {
        let agentData = result?.response?.result
        if (typeof agentData === 'string') {
          try {
            agentData = JSON.parse(agentData)
          } catch {
            answer = agentData
          }
        }
        if (typeof agentData === 'object' && agentData !== null) {
          answer = agentData?.answer ?? agentData?.text ?? ''
          sourceReferences = agentData?.source_references ?? ''
          const rawSuggestions = agentData?.follow_up_suggestions ?? ''
          if (Array.isArray(rawSuggestions)) {
            followUpSuggestions = rawSuggestions
          } else if (typeof rawSuggestions === 'string' && rawSuggestions.trim()) {
            followUpSuggestions = rawSuggestions
              .split(/\n|(?:\d+\.\s)/)
              .map((s: string) => s.replace(/^[-*]\s*/, '').trim())
              .filter((s: string) => s.length > 0)
          }
        }
        if (!answer) {
          answer = result?.response?.message ?? 'No response received.'
        }
      } else {
        answer = result?.error ?? result?.response?.message ?? 'Something went wrong. Please try again.'
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
        sourceReferences: sourceReferences || undefined,
        followUpSuggestions: followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'An error occurred while processing your question. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMsg])
    }

    setChatLoading(false)
    setActiveAgentId(null)
  }, [])

  const handleUploadFile = async (file: File) => {
    setUploading(true)
    setNotesError(null)
    setUploadFeedback(null)
    try {
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        setUploadFeedback(`"${file.name}" uploaded successfully and is being processed.`)
        await loadDocuments()
      } else {
        setNotesError(result.error ?? 'Failed to upload file')
      }
    } catch {
      setNotesError('Failed to upload file')
    }
    setUploading(false)
    setTimeout(() => setUploadFeedback(null), 5000)
  }

  const handleDeleteFile = async (fileName: string) => {
    setNotesError(null)
    try {
      const result = await deleteDocuments(RAG_ID, [fileName])
      if (result.success) {
        setDocuments(prev => Array.isArray(prev) ? prev.filter(d => d.fileName !== fileName) : null)
      } else {
        setNotesError(result.error ?? 'Failed to delete file')
      }
    } catch {
      setNotesError('Failed to delete file')
    }
  }

  const displayMessages = showSample ? SAMPLE_MESSAGES : messages
  const displayDocuments = showSample ? SAMPLE_DOCUMENTS : documents
  const noteCount = showSample ? SAMPLE_DOCUMENTS.length : (Array.isArray(documents) ? documents.length : 0)

  const navItems = [
    { id: 'chat' as const, label: 'Chat', icon: FiMessageSquare },
    { id: 'notes' as const, label: 'My Notes', icon: FiFileText },
    { id: 'planner' as const, label: 'Study Planner', icon: FiCalendar },
    { id: 'test' as const, label: 'Weak Topic Test', icon: FiTarget },
    { id: 'timetable' as const, label: 'Smart Timetable', icon: FiGrid },
    { id: 'reminders' as const, label: 'Reminders', icon: FiBell },
  ]

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} flex-shrink-0 flex flex-col border-r transition-all duration-300`}
          style={{ background: 'hsl(0 0% 96%)', borderColor: 'hsl(0 0% 88%)' }}
        >
          <div className="px-5 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                <FiBook className="h-4 w-4" style={{ color: 'hsl(0 0% 98%)' }} />
              </div>
              <div>
                <h1 className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>AI Study Helper</h1>
                <p className="text-[10px]" style={{ color: 'hsl(0 0% 40%)' }}>Your personal tutor</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors text-left"
                  style={{
                    background: isActive ? 'hsl(0 0% 100%)' : 'transparent',
                    color: isActive ? 'hsl(0 0% 8%)' : 'hsl(0 0% 40%)',
                    border: isActive ? '1px solid hsl(0 0% 85%)' : '1px solid transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.id === 'notes' && noteCount > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0" style={{ borderRadius: '0' }}>
                      {noteCount}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="px-4 py-3 border-t" style={{ borderColor: 'hsl(0 0% 88%)' }}>
            <div className="flex items-center justify-between">
              <Label htmlFor="sample-toggle" className="text-xs" style={{ color: 'hsl(0 0% 40%)' }}>Sample Data</Label>
              <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
            </div>
          </div>

          <div className="px-4 py-3 border-t" style={{ borderColor: 'hsl(0 0% 88%)' }}>
            <p className="text-[10px] font-medium mb-2" style={{ color: 'hsl(0 0% 40%)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Agent</p>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 flex-shrink-0"
                style={{ borderRadius: '50%', background: activeAgentId ? 'hsl(142 71% 45%)' : 'hsl(0 0% 75%)' }}
              />
              <span className="text-[11px] truncate" style={{ color: 'hsl(0 0% 30%)' }}>Study Helper Agent</span>
            </div>
            {activeAgentId && (
              <p className="text-[10px] mt-1 ml-4" style={{ color: 'hsl(142 71% 35%)' }}>Processing...</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0" style={{ background: 'hsl(0 0% 98%)' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b md:hidden" style={{ borderColor: 'hsl(0 0% 85%)' }}>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8 p-0" style={{ borderRadius: '0' }}>
              {sidebarOpen ? <FiX className="h-4 w-4" /> : <FiMenu className="h-4 w-4" />}
            </Button>
            <span className="font-serif text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>AI Study Helper</span>
          </div>

          {!sidebarOpen && (
            <div className="hidden md:flex items-center px-3 py-2 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="h-8 w-8 p-0" style={{ borderRadius: '0' }}>
                <FiChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-hidden" style={{ background: 'hsl(0 0% 100%)' }}>
            {activeSection === 'chat' && (
              <ChatSection
                messages={displayMessages}
                loading={chatLoading}
                onSendMessage={handleSendMessage}
                noteCount={noteCount}
              />
            )}
            {activeSection === 'notes' && (
              <MyNotesSection
                documents={displayDocuments}
                loading={notesLoading}
                uploading={uploading}
                error={notesError}
                uploadFeedback={uploadFeedback}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
              />
            )}
            {activeSection === 'planner' && (
              <StudyPlannerSection noteCount={noteCount} />
            )}
            {activeSection === 'test' && (
              <WeakTopicTestSection noteCount={noteCount} />
            )}
            {activeSection === 'timetable' && (
              <SmartTimetableSection noteCount={noteCount} />
            )}
            {activeSection === 'reminders' && (
              <DailyReminderSection />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
