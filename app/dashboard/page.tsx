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
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
      setError(null)
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
    if (!selectedFile || !targetLanguage) {
      setError('Please select a file and target language')
      return
    }

    setError(null)
    setResult(null)
    setProcessing({ isProcessing: true, currentStep: 'Uploading file...', progress: 10 })

    try {
      // Step 1: Upload file
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.error || 'Upload failed')
      }

      const uploadResult = await uploadResponse.json()
      updateProgress('Processing audio/video...', 30)

      // Step 2: Start dubbing process
      const dubbingResponse = await fetch('/api/dub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadResult.fileName,
          targetLanguage: targetLanguage,
          filePath: uploadResult.filePath
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
      console.error('Dubbing error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during processing')
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