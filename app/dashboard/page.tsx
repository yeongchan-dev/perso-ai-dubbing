'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

    // Pre-check file size for better UX
    const maxSizeBytes = 50 * 1024 * 1024 // 50MB general limit
    const productionMaxBytes = 4.5 * 1024 * 1024 // 4.5MB production limit

    if (selectedFile.size > maxSizeBytes) {
      console.error(`FRONTEND: File too large - ${selectedFile.size} bytes > ${maxSizeBytes} bytes`)
      setError(`File too large. Maximum size is 50MB, but your file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Please use a smaller file.`)
      return
    }

    if (selectedFile.size > productionMaxBytes) {
      console.warn(`FRONTEND: File size warning - file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB, which may fail in production (limit: 4.5MB)`)
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
      try {
        console.log('⭐⭐⭐ FRONTEND: Calling fetch now... ⭐⭐⭐')
        uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        console.log('⭐⭐⭐ FRONTEND: fetch call completed ⭐⭐⭐')
      } catch (fetchError) {
        console.error('FRONTEND: fetch call threw an error:', fetchError)
        console.error('FRONTEND: fetch error details:', {
          name: fetchError instanceof Error ? fetchError.name : 'unknown',
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : 'no stack trace'
        })
        throw new Error(`Network request failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
      }

      console.log('FRONTEND: Response received successfully')
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
          console.log('Parse error details:', {
            name: parseError instanceof Error ? parseError.name : 'unknown',
            message: parseError instanceof Error ? parseError.message : String(parseError),
            stack: parseError instanceof Error ? parseError.stack : 'no stack trace'
          })
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
          if (uploadError.environment === 'production') {
            errorMessage = `File too large for production. Maximum size is ${(uploadError.maxSize / (1024 * 1024)).toFixed(1)}MB, but your file is ${(uploadError.actualSize / (1024 * 1024)).toFixed(1)}MB. Please compress your file or use a smaller file.`
          }
        }

        // For debugging purposes, include additional information
        if (uploadError.fullResponse) {
          console.error('Full server response:', uploadError.fullResponse)
          // Don't include the full response in user-facing error to avoid overwhelming them
        }

        console.error('Final error message to display:', errorMessage)
        console.error('Full error object:', uploadError)
        throw new Error(errorMessage)
      }

      console.log('Upload response OK, parsing success response...')

      let uploadResult
      try {
        const responseText = await uploadResponse.text()
        console.log('Success response text:', responseText)
        uploadResult = JSON.parse(responseText)
        console.log('Parsed upload result:', uploadResult)
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError)
        throw new Error(`Success response could not be parsed: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      }

      updateProgress('Processing audio/video...', 30)

      // Step 2: Start dubbing process
      const dubbingResponse = await fetch('/api/dub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadResult.originalName,
          targetLanguage: targetLanguage,
          tempFilePath: uploadResult.tempFilePath
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Dubbing Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome, {session?.user?.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Upload Media
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                  disabled={processing.isProcessing}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer flex flex-col items-center ${
                    processing.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  <p className="text-gray-600 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to upload media'}
                  </p>
                  <p className="text-sm text-gray-500">MP3, WAV, MP4, MOV up to 50MB</p>
                </label>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Target Language
              </h2>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={processing.isProcessing}
              >
                <option value="">Select target language</option>
                <option value="en">English</option>
                <option value="ko">Korean</option>
                <option value="ja">Japanese</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
              </select>

              <button
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={startDubbing}
                disabled={!selectedFile || !targetLanguage || processing.isProcessing}
              >
                {processing.isProcessing ? 'Processing...' : 'Start Dubbing'}
              </button>
            </div>
          </div>

          {/* Processing Status */}
          {processing.isProcessing && (
            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Processing Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">{processing.currentStep}</span>
                  <span className="text-blue-600 font-medium">{processing.progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${processing.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-8 p-6 bg-red-50 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error
              </h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-green-800">
                  Dubbing Complete!
                </h3>
                <button
                  onClick={downloadAudio}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Original Text:</h4>
                  <p className="text-gray-700 bg-white p-3 rounded border">{result.originalText}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Translated Text ({result.targetLanguage}):</h4>
                  <p className="text-gray-700 bg-white p-3 rounded border">{result.translatedText}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Generated Audio:</h4>
                  <audio
                    controls
                    className="w-full"
                    src={result.audioUrl}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!processing.isProcessing && !result && !error && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Getting Started
              </h3>
              <div className="text-gray-600 space-y-2">
                <p>1. Upload an audio or video file</p>
                <p>2. Select your target language</p>
                <p>3. Click "Start Dubbing" to begin processing</p>
                <p className="text-sm mt-4 text-gray-500">
                  The AI will extract speech, translate it, and generate dubbed audio in your selected language.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}