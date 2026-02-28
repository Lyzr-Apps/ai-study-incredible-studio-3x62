'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiUpload, FiFileText, FiTrash2, FiLoader, FiFile, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
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
  return <FiFileText className="h-5 w-5" />
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        <h2 className="font-serif text-xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>My Notes</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>Upload and manage your study materials</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Upload zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative cursor-pointer transition-colors"
          style={{
            border: isDragOver ? '2px dashed hsl(0 80% 45%)' : '2px dashed hsl(0 0% 85%)',
            background: isDragOver ? 'hsl(0 80% 97%)' : 'hsl(0 0% 98%)',
            padding: '2rem',
            borderRadius: '0',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center text-center">
            {uploading ? (
              <>
                <FiLoader className="h-8 w-8 animate-spin mb-3" style={{ color: 'hsl(0 0% 40%)' }} />
                <p className="text-sm font-medium" style={{ color: 'hsl(0 0% 8%)' }}>Uploading...</p>
                <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 40%)' }}>Your file is being processed</p>
              </>
            ) : (
              <>
                <FiUpload className="h-8 w-8 mb-3" style={{ color: 'hsl(0 0% 40%)' }} />
                <p className="text-sm font-medium" style={{ color: 'hsl(0 0% 8%)' }}>
                  {isDragOver ? 'Drop your file here' : 'Drag and drop a file, or click to browse'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'hsl(0 0% 40%)' }}>Supports PDF, DOCX, TXT</p>
              </>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {uploadFeedback && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(142 71% 95%)', border: '1px solid hsl(142 71% 80%)' }}>
            <FiCheckCircle className="h-4 w-4" style={{ color: 'hsl(142 71% 35%)' }} />
            <p className="text-xs" style={{ color: 'hsl(142 71% 25%)' }}>{uploadFeedback}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 80%)' }}>
            <FiAlertCircle className="h-4 w-4" style={{ color: 'hsl(0 84% 45%)' }} />
            <p className="text-xs" style={{ color: 'hsl(0 84% 35%)' }}>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && docs.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <FiLoader className="h-6 w-6 animate-spin" style={{ color: 'hsl(0 0% 40%)' }} />
            <span className="ml-2 text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Loading documents...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'hsl(0 0% 94%)' }}>
              <FiFile className="h-7 w-7" style={{ color: 'hsl(0 0% 40%)' }} />
            </div>
            <h3 className="font-serif text-base font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>No notes uploaded yet</h3>
            <p className="text-sm" style={{ color: 'hsl(0 0% 40%)' }}>Add your study materials to get started.</p>
          </div>
        )}

        {/* Document grid */}
        {docs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc, idx) => {
              const statusColor = getStatusColor(doc.status)
              return (
                <Card key={doc.id ?? doc.fileName ?? idx} className="overflow-hidden" style={{ borderRadius: '0', border: '1px solid hsl(0 0% 85%)' }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(0 0% 94%)' }}>
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                            {doc.fileName ?? 'Untitled'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderRadius: '0' }}>
                              {getFileTypeBadge(doc.fileType)}
                            </Badge>
                            {doc.status && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 font-medium"
                                style={{ background: statusColor.bg, color: statusColor.text }}
                              >
                                {doc.status}
                              </span>
                            )}
                          </div>
                          {doc.uploadedAt && (
                            <p className="text-[10px] mt-1.5" style={{ color: 'hsl(0 0% 60%)' }}>
                              Uploaded {doc.uploadedAt}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.fileName)}
                        disabled={deletingFile === doc.fileName}
                        className="h-8 w-8 p-0 flex-shrink-0"
                        style={{ borderRadius: '0' }}
                      >
                        {deletingFile === doc.fileName ? (
                          <FiLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <FiTrash2 className="h-4 w-4" style={{ color: 'hsl(0 84% 60%)' }} />
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
    </div>
  )
}
