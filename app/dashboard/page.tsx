'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChunkedUploader, shouldUseChunkedUpload } from '@/lib/chunked-upload'

interface DubbingResult {
  success: boolean
  originalText: string
  translatedText: string
  audioUrl: string
  targetLanguage: string
  processingTime: number
}

interface ProcessingState {
  isProcessing: boolean
  currentStep: string
  progress: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState('')
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    currentStep: '',
    progress: 0
  })
  const [result, setResult] = useState<DubbingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('FRONTEND: handleFileSelect called')
    console.log('FRONTEND: Event target:', event.target)
    console.log('FRONTEND: Files list:', event.target.files)

    const file = event.target.files?.[0]
    console.log('FRONTEND: Selected file object:', file)

    if (file) {
      console.log('FRONTEND: File validation:')
      console.log('  name:', file.name)
      console.log('  size:', file.size)
      console.log('  type:', file.type)
      console.log('  lastModified:', file.lastModified)
      console.log('  webkitRelativePath:', file.webkitRelativePath)

      // Check for any special characters or potential validation issues
      console.log('FRONTEND: Filename character analysis:')
      const fileName = file.name
      for (let i = 0; i < fileName.length; i++) {
        const char = fileName[i]
        const charCode = char.charCodeAt(0)
        console.log(`  ${i}: "${char}" (code: ${charCode})`)
      }

      try {
        console.log('FRONTEND: Setting selected file...')
        setSelectedFile(file)
        setResult(null)
        setError(null)
        console.log('FRONTEND: File selection completed successfully')
      } catch (setFileError) {
        console.error('FRONTEND: Error setting selected file:', setFileError)
      }
    } else {
      console.log('FRONTEND: No file selected or file is null')
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)

    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      setResult(null)
      setError(null)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
  }

  const updateProgress = (step: string, progress: number) => {
    setProcessing(prev => ({
      ...prev,
      currentStep: step,
      progress
    }))
  }

  const startDubbing = async () => {
    console.log('🟢🟢🟢 FRONTEND: startDubbing function called 🟢🟢🟢')
    console.log('🟢🟢🟢 FRONTEND: startDubbing function called 🟢🟢🟢')
    console.log('🟢🟢🟢 FRONTEND: startDubbing function called 🟢🟢🟢')

    console.log('FRONTEND: Checking prerequisites...')
    console.log('FRONTEND: selectedFile:', selectedFile)
    console.log('FRONTEND: targetLanguage:', targetLanguage)

    if (!selectedFile || !targetLanguage) {
      console.log('FRONTEND: Missing prerequisites, showing error')
      setError('Please select a file and target language')
      return
    }

    console.log('FRONTEND: Prerequisites satisfied, starting upload process')

    // Check if file is audio only
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
    const isAudioFile = audioExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))

    if (!isAudioFile) {
      console.error(`FRONTEND: Invalid file type - ${selectedFile.name}`)
      setError(`Only audio files are supported. Supported formats: MP3, WAV, FLAC, M4A, AAC, OGG`)
      return
    }

    // Pre-check file size for better UX
    const maxSizeBytes = 4.5 * 1024 * 1024 // 4.5MB production-safe limit

    if (selectedFile.size > maxSizeBytes) {
      console.error(`FRONTEND: File too large - ${selectedFile.size} bytes > ${maxSizeBytes} bytes`)
      setError(`Audio file too large. Maximum size is 4.5MB for production deployment, but your file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Please use a smaller audio file.`)
      return
    }

    setError(null)
    setResult(null)
    setProcessing({ isProcessing: true, currentStep: 'Uploading file...', progress: 10 })

    try {
      console.log('FRONTEND: Entering try block for upload process')

      // Step 1: Upload file
      console.log('===== FRONTEND UPLOAD START =====')
      console.log('Selected file details:')
      console.log('  name:', selectedFile.name)
      console.log('  size:', selectedFile.size)
      console.log('  type:', selectedFile.type)
      console.log('  lastModified:', selectedFile.lastModified)

      console.log('FRONTEND: About to create FormData...')
      let formData
      try {
        formData = new FormData()
        console.log('FRONTEND: FormData created successfully')

        console.log('FRONTEND: About to append file to FormData...')
        formData.append('file', selectedFile)
        console.log('FRONTEND: File appended to FormData successfully')

        console.log('FRONTEND: FormData validation - checking entries:')
        let entryCount = 0
        for (let pair of formData.entries()) {
          entryCount++
          console.log(`  Entry ${entryCount} - key:`, pair[0], 'value:', pair[1])
          if (pair[1] instanceof File) {
            console.log(`    File details - name: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}`)
          }
        }
        console.log(`FRONTEND: Total FormData entries: ${entryCount}`)

      } catch (formDataError) {
        console.error('FRONTEND: Error creating FormData:', formDataError)
        throw new Error(`FormData creation failed: ${formDataError instanceof Error ? formDataError.message : String(formDataError)}`)
      }

      console.log('FRONTEND: About to call fetch to /api/upload')
      console.log('FRONTEND: Fetch URL: /api/upload')
      console.log('FRONTEND: Fetch method: POST')
      console.log('FRONTEND: Fetch body: FormData object')

      let uploadResponse
      let uploadResult

      // Determine upload strategy based on file size
      const useChunked = shouldUseChunkedUpload(selectedFile, 'production') // Always check production limits

      if (useChunked) {
        console.log('⚡⚡⚡ FRONTEND: Using chunked upload for large file ⚡⚡⚡')
        updateProgress('Uploading large file in chunks...', 15)

        try {
          const chunkedUploader = new ChunkedUploader(selectedFile, {
            onProgress: (progress, currentChunk, totalChunks) => {
              console.log(`FRONTEND: Chunk progress: ${progress}% (${currentChunk}/${totalChunks})`)
              updateProgress(`Uploading chunk ${currentChunk}/${totalChunks}...`, 10 + (progress * 0.2)) // 10-30% for upload
            }
          })

          const chunkedResult = await chunkedUploader.upload()

          if (!chunkedResult.success) {
            throw new Error(chunkedResult.error || 'Chunked upload failed')
          }

          // For chunked uploads, we need to get the assembled file path from the server response
          console.log('FRONTEND: Chunked upload completed successfully')
          console.log('FRONTEND: Chunked result:', chunkedResult)
          uploadResult = {
            success: true,
            fileName: chunkedResult.fileName || chunkedResult.originalName,
            originalName: chunkedResult.originalName,
            fileSize: chunkedResult.fileSize,
            fileType: chunkedResult.fileType || '',
            isVideo: chunkedResult.isVideo,
            isAudio: chunkedResult.isAudio,
            tempFilePath: chunkedResult.tempFilePath,
            chunked: chunkedResult.chunked || true,
            inMemoryProcessing: chunkedResult.inMemoryProcessing || false,
            fileBuffer: chunkedResult.fileBuffer || null,
            environment: chunkedResult.environment || 'chunked'
          }

        } catch (chunkError) {
          console.error('FRONTEND: Chunked upload failed:', chunkError)
          throw new Error(`Large file upload failed: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`)
        }

      } else {
        console.log('⭐⭐⭐ FRONTEND: Using direct upload for small file ⭐⭐⭐')

        try {
          uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })
          console.log('⭐⭐⭐ FRONTEND: Direct upload completed ⭐⭐⭐')
        } catch (fetchError) {
          console.error('FRONTEND: fetch call threw an error:', fetchError)
          console.error('FRONTEND: fetch error details:', {
            name: fetchError instanceof Error ? fetchError.name : 'unknown',
            message: fetchError instanceof Error ? fetchError.message : String(fetchError),
            stack: fetchError instanceof Error ? fetchError.stack : 'no stack trace'
          })
          throw new Error(`Network request failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
        }
      }

      // Handle response based on upload type
      if (useChunked) {
        console.log('FRONTEND: Processing chunked upload result')
        // uploadResult already set above for chunked uploads

      } else {
        console.log('FRONTEND: Processing direct upload response')
        if (!uploadResponse) {
          throw new Error('Upload response is undefined')
        }
        console.log('FRONTEND: Response details:')
        console.log('  status:', uploadResponse.status)
        console.log('  statusText:', uploadResponse.statusText)
        console.log('  ok:', uploadResponse.ok)
        console.log('  type:', uploadResponse.type)
        console.log('  url:', uploadResponse.url)
        console.log('  redirected:', uploadResponse.redirected)
        console.log('  headers:', Object.fromEntries(uploadResponse.headers.entries()))

          if (!uploadResponse.ok) {
            console.log('Upload response NOT OK, attempting to parse error...')

            let uploadError
            try {
              // Clone the response so we can read it twice if needed
              const responseClone = uploadResponse.clone()
              const responseText = await responseClone.text()
              console.log('Raw error response text:', responseText)
              console.log('Response text length:', responseText.length)

              if (responseText.trim()) {
                try {
                  uploadError = JSON.parse(responseText)
                  console.log('Parsed error object:', uploadError)
                } catch (jsonError) {
                  console.error('JSON parse failed:', jsonError)
                  console.log('Response is not valid JSON, treating as plain text error')
                  uploadError = {
                    error: 'Server returned non-JSON error',
                    details: responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText,
                    fullResponse: responseText
                  }
                }
              } else {
                console.log('Empty response body')
                uploadError = {
                  error: 'Empty response from server',
                  details: `Server returned ${uploadResponse.status} ${uploadResponse.statusText} with no content`
                }
              }
            } catch (parseError) {
              console.error('Failed to read error response:', parseError)
              uploadError = {
                error: 'Could not read server response',
                details: `Read error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
              }
            }

            // Create detailed error message from backend response
            let errorMessage = uploadError.error || 'Upload failed'
            if (uploadError.details) {
              errorMessage += ': ' + uploadError.details
            }

            // Special handling for production payload size errors
            if (uploadResponse.status === 413 || errorMessage.includes('too large')) {
              console.error('FRONTEND: File size error detected')
              if (uploadError.shouldUseChunkedUpload) {
                errorMessage = `File too large for direct upload. Switching to chunked upload automatically...`
                console.log('FRONTEND: Will retry with chunked upload')
                // Could implement automatic retry here
              }
            }

            console.error('Final error message to display:', errorMessage)
            console.error('Full error object:', uploadError)
            throw new Error(errorMessage)
          }

          console.log('Upload response OK, parsing success response...')

          try {
            const responseText = await uploadResponse.text()
            console.log('Success response text:', responseText)
            uploadResult = JSON.parse(responseText)
            console.log('Parsed upload result:', uploadResult)
          } catch (parseError) {
            console.error('Failed to parse success response:', parseError)
            throw new Error(`Success response could not be parsed: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
          }
        }

      // Continue processing after successful upload
      updateProgress('Processing audio...', 30)

      // Step 2: Start dubbing process
      const dubbingResponse = await fetch('/api/dub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadResult.originalName,
          targetLanguage: targetLanguage,
          ...(uploadResult.tempFilePath && { tempFilePath: uploadResult.tempFilePath }),
          ...(uploadResult.fileBuffer && { fileBuffer: uploadResult.fileBuffer }),
          inMemoryProcessing: uploadResult.inMemoryProcessing,
          chunked: uploadResult.chunked
        }),
      })

      updateProgress('Converting speech to text...', 50)

      await new Promise(resolve => setTimeout(resolve, 1000))
      updateProgress('Translating text...', 70)

      await new Promise(resolve => setTimeout(resolve, 1000))
      updateProgress('Generating dubbed audio...', 90)

      if (!dubbingResponse.ok) {
        const dubbingError = await dubbingResponse.json()
        const errorMessage = dubbingError.error || 'Dubbing failed'
        const failedStep = dubbingError.step || 'unknown step'
        throw new Error(`${errorMessage} (Failed at: ${failedStep})`)
      }

      const dubbingResult = await dubbingResponse.json()
      updateProgress('Complete!', 100)

      setTimeout(() => {
        setProcessing({ isProcessing: false, currentStep: '', progress: 0 })
        setResult(dubbingResult)
      }, 500)

    } catch (error) {
      console.error('❌❌❌ FRONTEND: Error caught in main try-catch ❌❌❌')
      console.error('FRONTEND: Error details:', error)
      console.error('FRONTEND: Error type:', typeof error)
      console.error('FRONTEND: Error constructor:', error?.constructor?.name)

      if (error instanceof Error) {
        console.error('FRONTEND: Error name:', error.name)
        console.error('FRONTEND: Error message:', error.message)
        console.error('FRONTEND: Error stack:', error.stack)

        // Check for specific error patterns
        if (error.message.includes('string did not match the expected pattern')) {
          console.error('FRONTEND: 🔍 FOUND THE PATTERN ERROR!')
          console.error('FRONTEND: This is likely a validation/parsing error in the frontend or Next.js')
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'An error occurred during processing'
      console.error('FRONTEND: Final error message to display:', errorMessage)

      setError(errorMessage)
      setProcessing({ isProcessing: false, currentStep: '', progress: 0 })
    }
  }

  const downloadAudio = () => {
    if (result?.audioUrl) {
      const link = document.createElement('a')
      link.href = result.audioUrl
      link.download = `dubbed_audio_${result.targetLanguage}.mp3`
      link.click()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-transparent"></div>
          <p className="text-gray-100 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Header */}
      <div className="flex justify-between items-center p-4 max-w-3xl mx-auto">
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0' }}>AI Audio Dubbing</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            backgroundColor: '#4a4a4a',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #6a6a6a',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a5a5a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4a4a4a'}
        >
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <div className="text-center mb-6">
          <p style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: '500', margin: '0' }}>Upload an audio file and generate a dubbed version in another language</p>
        </div>

        {/* Main Card */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #3a3a3a',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>

          {/* Upload Section */}
          <div className="mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-500/5'
                  : selectedFile
                    ? 'border-green-400 bg-green-500/5'
                    : 'border-[#4a4a4a] hover:border-[#5a5a5a]'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
                disabled={processing.isProcessing}
              />

              {selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="16" height="16" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '18px', margin: '0' }}>{selectedFile.name}</p>
                      <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0' }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <label
                    htmlFor="file-upload"
                    style={{
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5856eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                  >
                    Change
                  </label>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#3a3a3a',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>Drop your audio file here or </span>
                      <span style={{
                        color: '#6366f1',
                        fontSize: '16px',
                        fontWeight: '700',
                        textDecoration: 'underline'
                      }}>browse</span>
                    </label>
                    <p style={{ color: '#d1d5db', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>MP3, WAV, FLAC, M4A, AAC, OGG (max 4MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Language Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-[#3a3a3a] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg text-white font-semibold">Target Language</h3>
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={processing.isProcessing}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '500',
                  appearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px 16px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#4a4a4a'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <option value="" style={{ backgroundColor: '#1a1a1a', color: '#9ca3af' }}>Select target language</option>
                <option value="en" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇺🇸 English</option>
                <option value="ko" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇰🇷 Korean</option>
                <option value="ja" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇯🇵 Japanese</option>
                <option value="es" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇪🇸 Spanish</option>
                <option value="fr" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇫🇷 French</option>
                <option value="de" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇩🇪 German</option>
                <option value="it" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇮🇹 Italian</option>
                <option value="pt" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>🇵🇹 Portuguese</option>
              </select>
            </div>
          </div>

          {/* Start Dubbing Button */}
          <button
            onClick={startDubbing}
            disabled={!selectedFile || !targetLanguage || processing.isProcessing}
            style={{
              width: '100%',
              backgroundColor: (!selectedFile || !targetLanguage || processing.isProcessing) ? '#4a4a4a' : '#6366f1',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '700',
              border: 'none',
              cursor: (!selectedFile || !targetLanguage || processing.isProcessing) ? 'not-allowed' : 'pointer',
              opacity: (!selectedFile || !targetLanguage || processing.isProcessing) ? '0.6' : '1',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#5856eb'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#6366f1'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {processing.isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ fontWeight: '600' }}>Processing...</span>
              </div>
            ) : (
              'Start Dubbing'
            )}
          </button>

          {/* Processing Status */}
          {processing.isProcessing && (
            <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-base font-medium">{processing.currentStep}</span>
                  <span className="text-[#6366f1] font-bold text-base">{processing.progress}%</span>
                </div>
                <div className="w-full bg-[#3a3a3a] rounded-full h-2">
                  <div
                    className="bg-[#6366f1] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processing.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h3 className="text-red-300 font-bold mb-2 text-base">Error</h3>
              <p className="text-gray-100 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Results - Dubbed Audio */}
          {result && (
            <div className="mt-6">
              <div className="bg-[#1a1a1a] rounded-lg p-5 border border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#3a3a3a] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <h3 className="text-lg text-white font-bold">Dubbed Audio</h3>
                  </div>

                  <button
                    onClick={downloadAudio}
                    className="bg-[#4a4a4a] hover:bg-[#5a5a5a] px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 font-semibold text-sm border border-[#6a6a6a]"
                    style={{ color: '#ffffff' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Audio Player */}
                  <div className="bg-[#2a2a2a] p-4 rounded-lg border border-[#3a3a3a]">
                    <audio
                      controls
                      className="w-full h-10 rounded-lg"
                      src={result.audioUrl}
                      style={{
                        filter: 'invert(1) hue-rotate(180deg)',
                        borderRadius: '8px',
                        backgroundColor: 'transparent'
                      }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>

                  {/* Text Results - Only show if there's substantial content */}
                  {(result.originalText || result.translatedText) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.originalText && (
                        <div>
                          <h4 className="text-white font-bold mb-2 text-sm">Original Text</h4>
                          <div className="bg-[#2a2a2a] p-3 rounded-lg text-gray-100 text-sm max-h-20 overflow-y-auto leading-relaxed">
                            {result.originalText}
                          </div>
                        </div>
                      )}
                      {result.translatedText && (
                        <div>
                          <h4 className="text-white font-bold mb-2 text-sm">Translated Text ({result.targetLanguage.toUpperCase()})</h4>
                          <div className="bg-[#2a2a2a] p-3 rounded-lg text-gray-100 text-sm max-h-20 overflow-y-auto leading-relaxed">
                            {result.translatedText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}