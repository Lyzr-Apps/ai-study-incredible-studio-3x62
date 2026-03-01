'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiUpload, FiFileText, FiTrash2, FiLoader, FiFile, FiAlertCircle, FiCheckCircle, FiCode } from 'react-icons/fi'
import type { RAGDocument } from '@/lib/ragKnowledgeBase'

interface MyNotesSectionProps {
  documents: RAGDocument[] | null
  loading: boolean
  uploading: boolean
  error: string | null
  uploadFeedback: string | null
  onUploadFile: (file: File) => void
  onDeleteFile: (fileName: string) => void
}

function getFileIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case 'pdf':
      return <FiFileText className="h-5 w-5" />
    case 'docx':
      return <FiFile className="h-5 w-5" />
    case 'txt':
      return <FiCode className="h-5 w-5" />
    default:
      return <FiFileText className="h-5 w-5" />
  }
}

function getFileIconBg(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case 'pdf':
      return { background: 'hsl(0 72% 95%)', color: 'hsl(0 72% 45%)' }
    case 'docx':
      return { background: 'hsl(217 72% 95%)', color: 'hsl(217 72% 45%)' }
    case 'txt':
      return { background: 'hsl(142 50% 94%)', color: 'hsl(142 50% 38%)' }
    default:
      return { background: 'hsl(0 0% 94%)', color: 'hsl(0 0% 40%)' }
  }
}

function getFileTypeBadge(fileType: string) {
  const typeMap: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    txt: 'TXT',
  }
  return typeMap[fileType] ?? fileType?.toUpperCase() ?? 'FILE'
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'active': return { bg: 'hsl(142 71% 45%)', text: 'hsl(0 0% 100%)' }
    case 'processing': return { bg: 'hsl(45 93% 47%)', text: 'hsl(0 0% 8%)' }
    case 'failed': return { bg: 'hsl(0 84% 60%)', text: 'hsl(0 0% 100%)' }
    default: return { bg: 'hsl(0 0% 85%)', text: 'hsl(0 0% 40%)' }
  }
}

function getTypeBreakdown(docs: RAGDocument[]) {
  const counts: Record<string, number> = {}
  docs.forEach(d => {
    const ft = d.fileType?.toUpperCase() ?? 'OTHER'
    counts[ft] = (counts[ft] ?? 0) + 1
  })
  return counts
}

export default function MyNotesSection({
  documents,
  loading,
  uploading,
  error,
  uploadFeedback,
  onUploadFile,
  onDeleteFile,
}: MyNotesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      onUploadFile(files[0])
    }
  }, [onUploadFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileName: string) => {
    setDeletingFile(fileName)
    onDeleteFile(fileName)
    setTimeout(() => setDeletingFile(null), 2000)
  }

  const docs = Array.isArray(documents) ? documents : []
  const typeBreakdown = getTypeBreakdown(docs)

  return (
    <div className="flex flex-col h-full">
      {/* Header with stat bar */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(0 0% 88%)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 6%)' }}>
              My Notes
            </h2>
            <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 45%)' }}>
              Upload and manage your study materials
            </p>
          </div>
        </div>

        {/* Stat bar */}
        {docs.length > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'hsl(0 0% 92%)' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'hsl(0 0% 45%)' }}>Total</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: 'hsl(0 0% 8%)' }}>{docs.length}</span>
            </div>
            <div className="w-px h-3" style={{ background: 'hsl(0 0% 85%)' }} />
            {Object.entries(typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'hsl(0 0% 45%)' }}>{type}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: 'hsl(0 0% 8%)' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="px-6 py-6 space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative cursor-pointer group transition-all duration-200"
            style={{
              border: isDragOver ? '2px dashed hsl(0 80% 45%)' : '2px dashed hsl(0 0% 82%)',
              background: isDragOver ? 'hsl(0 80% 97%)' : 'hsl(0 0% 99%)',
              padding: '2.5rem 2rem',
              borderRadius: '0',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, hsl(0 0% 97%) 0%, hsl(0 0% 99%) 100%)' }}
            />

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
            />
            <div className="relative flex flex-col items-center text-center">
              {uploading ? (
                <>
                  <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
                    <FiLoader className="h-6 w-6 animate-spin" style={{ color: 'hsl(0 0% 35%)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>Uploading your file...</p>
                  <p className="text-xs mt-1.5" style={{ color: 'hsl(0 0% 45%)' }}>Processing and indexing for study use</p>
                </>
              ) : (
                <>
                  <div
                    className="w-14 h-14 flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-105"
                    style={{ background: isDragOver ? 'hsl(0 80% 92%)' : 'hsl(0 0% 93%)' }}
                  >
                    <FiUpload className="h-6 w-6" style={{ color: isDragOver ? 'hsl(0 80% 45%)' : 'hsl(0 0% 35%)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                    {isDragOver ? 'Drop your file here' : 'Drag and drop a file, or click to browse'}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'hsl(0 0% 45%)' }}>
                    Supports PDF, DOCX, and TXT formats
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] px-2 py-0.5 font-medium" style={{ background: 'hsl(0 72% 95%)', color: 'hsl(0 72% 40%)' }}>PDF</span>
                    <span className="text-[10px] px-2 py-0.5 font-medium" style={{ background: 'hsl(217 72% 95%)', color: 'hsl(217 72% 40%)' }}>DOCX</span>
                    <span className="text-[10px] px-2 py-0.5 font-medium" style={{ background: 'hsl(142 50% 94%)', color: 'hsl(142 50% 35%)' }}>TXT</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Success feedback */}
          {uploadFeedback && (
            <div
              className="flex items-start gap-3 px-4 py-3 animate-fadeIn"
              style={{ background: 'hsl(142 60% 96%)', border: '1px solid hsl(142 50% 82%)' }}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'hsl(142 71% 45%)' }}>
                <FiCheckCircle className="h-3 w-3" style={{ color: 'white' }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(142 50% 25%)' }}>Upload successful</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'hsl(142 40% 35%)' }}>{uploadFeedback}</p>
              </div>
            </div>
          )}

          {/* Error feedback */}
          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 animate-fadeIn"
              style={{ background: 'hsl(0 70% 97%)', border: '1px solid hsl(0 70% 85%)' }}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'hsl(0 84% 60%)' }}>
                <FiAlertCircle className="h-3 w-3" style={{ color: 'white' }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(0 70% 30%)' }}>Something went wrong</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'hsl(0 50% 40%)' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <FiLoader className="h-6 w-6 animate-spin mb-3" style={{ color: 'hsl(0 0% 40%)' }} />
              <span className="text-sm font-medium" style={{ color: 'hsl(0 0% 35%)' }}>Loading documents...</span>
              <span className="text-xs mt-1" style={{ color: 'hsl(0 0% 55%)' }}>Fetching your uploaded materials</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 flex items-center justify-center" style={{ background: 'hsl(0 0% 95%)' }}>
                  <FiFile className="h-8 w-8" style={{ color: 'hsl(0 0% 55%)' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center" style={{ background: 'hsl(0 0% 8%)' }}>
                  <FiUpload className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 98%)' }} />
                </div>
              </div>
              <h3 className="font-serif text-base font-bold mb-1.5" style={{ letterSpacing: '-0.03em', color: 'hsl(0 0% 10%)' }}>
                No notes uploaded yet
              </h3>
              <p className="text-sm max-w-[240px] leading-relaxed" style={{ color: 'hsl(0 0% 45%)' }}>
                Upload your study materials to unlock AI-powered learning.
              </p>
            </div>
          )}

          {/* Document grid */}
          {docs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((doc, idx) => {
                const statusColor = getStatusColor(doc.status)
                const iconStyle = getFileIconBg(doc.fileType)
                const isProcessing = doc.status === 'processing'

                return (
                  <Card
                    key={doc.id ?? doc.fileName ?? idx}
                    className="overflow-hidden group animate-fadeIn transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    style={{ borderRadius: '0', border: '1px solid hsl(0 0% 88%)' }}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-3 p-4">
                        {/* File type icon */}
                        <div
                          className="w-11 h-11 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                          style={{ background: iconStyle.background, color: iconStyle.color }}
                        >
                          {getFileIcon(doc.fileType)}
                        </div>

                        {/* File info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ letterSpacing: '-0.02em', color: 'hsl(0 0% 8%)' }}>
                            {doc.fileName ?? 'Untitled'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold" style={{ borderRadius: '0', borderColor: 'hsl(0 0% 82%)' }}>
                              {getFileTypeBadge(doc.fileType)}
                            </Badge>
                            {doc.status && (
                              <span className="flex items-center gap-1">
                                <span
                                  className={`w-1.5 h-1.5 inline-block flex-shrink-0 ${isProcessing ? 'animate-pulse' : ''}`}
                                  style={{ borderRadius: '50%', background: statusColor.bg }}
                                />
                                <span className="text-[10px] font-medium capitalize" style={{ color: 'hsl(0 0% 40%)' }}>
                                  {doc.status}
                                </span>
                              </span>
                            )}
                          </div>
                          {doc.uploadedAt && (
                            <p className="text-[10px] mt-2" style={{ color: 'hsl(0 0% 55%)' }}>
                              Uploaded {doc.uploadedAt}
                            </p>
                          )}
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.fileName)}
                          disabled={deletingFile === doc.fileName}
                          className="h-8 w-8 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ borderRadius: '0' }}
                        >
                          {deletingFile === doc.fileName ? (
                            <FiLoader className="h-4 w-4 animate-spin" style={{ color: 'hsl(0 0% 40%)' }} />
                          ) : (
                            <FiTrash2 className="h-4 w-4" style={{ color: 'hsl(0 72% 50%)' }} />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
