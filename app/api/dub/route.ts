import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/services/elevenlabs'
import { OpenAIService } from '@/services/openai'
import { extractAudioFromVideo, isVideoFile, isAudioFile, saveBase64Audio } from '@/lib/audio-utils'
import { getUploadStrategy } from '@/lib/upload-utils'
import path from 'path'
import { writeFile, unlink, access } from 'fs/promises'
import { tmpdir } from 'os'

export async function POST(request: NextRequest) {
  let tempFiles: string[] = []
  let audioExtractionResult: any = null
  let processingStep = 'initialization'
  const strategy = getUploadStrategy()

  try {
    console.log('=== PRODUCTION-SAFE DUBBING PIPELINE START ===')
    console.log(`Environment: ${strategy.environment}`)
    processingStep = 'parsing request'

    const body = await request.json()
    const { fileName, targetLanguage, tempFilePath, fileBuffer, inMemoryProcessing, chunked } = body

    console.log(`Received request:`)
    console.log(`- fileName: ${fileName}`)
    console.log(`- targetLanguage: ${targetLanguage}`)
    console.log(`- tempFilePath: ${tempFilePath}`)
    console.log(`- inMemoryProcessing: ${inMemoryProcessing}`)
    console.log(`- chunked: ${chunked}`)

    if (!fileName || !targetLanguage) {
      const missingParams = []
      if (!fileName) missingParams.push('fileName')
      if (!targetLanguage) missingParams.push('targetLanguage')

      return NextResponse.json(
        {
          error: `Missing required parameters: ${missingParams.join(', ')}`,
          step: processingStep,
          environment: strategy.environment
        },
        { status: 400 }
      )
    }

    // Handle different processing modes
    let actualFilePath: string

    if (inMemoryProcessing && fileBuffer) {
      // Production mode: create temp file from buffer
      processingStep = 'creating temp file from buffer'
      console.log('[DUB] Production mode: creating temp file from in-memory buffer')

      try {
        const tempFileName = `prod_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        actualFilePath = path.join(tmpdir(), tempFileName)

        const buffer = Buffer.from(fileBuffer, 'base64')
        await writeFile(actualFilePath, buffer)
        tempFiles.push(actualFilePath)

        console.log(`[DUB] Created temp file from buffer: ${actualFilePath} (${buffer.length} bytes)`)

      } catch (error) {
        console.error('[DUB] Failed to create temp file from buffer:', error)
        return NextResponse.json(
          {
            error: 'File processing failed',
            details: 'Could not process uploaded file data',
            step: processingStep,
            environment: strategy.environment
          },
          { status: 500 }
        )
      }

    } else if (tempFilePath) {
      // Development mode or chunked upload: verify file exists
      processingStep = 'file verification'
      try {
        await access(tempFilePath)
        actualFilePath = tempFilePath
        tempFiles.push(tempFilePath) // Add to cleanup list
        console.log(`Temp file verified: ${tempFilePath}`)
      } catch (error) {
        console.error(`Temp file not found: ${tempFilePath}`, error)
        return NextResponse.json(
          {
            error: 'Uploaded file not found',
            details: 'The uploaded file has expired or was not found. Please upload again.',
            step: processingStep,
            environment: strategy.environment
          },
          { status: 404 }
        )
      }

    } else {
      return NextResponse.json(
        {
          error: 'No file data provided',
          details: 'Either tempFilePath or fileBuffer must be provided',
          step: processingStep,
          environment: strategy.environment
        },
        { status: 400 }
      )
    }

    console.log(`Starting dubbing pipeline for ${fileName} to ${targetLanguage}`)

    // Initialize services
    processingStep = 'initializing services'
    console.log('Initializing AI services...')

    let elevenLabs: ElevenLabsService
    let openAI: OpenAIService

    try {
      elevenLabs = new ElevenLabsService()
      openAI = new OpenAIService()
      console.log('AI services initialized successfully')
    } catch (error) {
      console.error('Failed to initialize AI services:', error)
      throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    let audioFilePath = actualFilePath

    // Step 1: Determine file type and handle accordingly
    processingStep = 'file type detection'
    console.log(`Detecting file type for: ${fileName}`)

    const isVideo = isVideoFile(fileName)
    const isAudio = isAudioFile(fileName)

    console.log(`File type detection results:`)
    console.log(`- Is video: ${isVideo}`)
    console.log(`- Is audio: ${isAudio}`)

    if (!isVideo && !isAudio) {
      throw new Error(`Unsupported file type: ${fileName}. Supported types: audio (MP3, WAV, M4A, AAC, OGG) and video (MP4, MOV, AVI, MKV, WEBM)`)
    }

    // Step 1a: Extract audio from video if necessary
    if (isVideo) {
      processingStep = 'video audio extraction'
      console.log('=== VIDEO PROCESSING FLOW ===')
      console.log('Video file detected, extracting audio...')

      try {
        audioExtractionResult = await extractAudioFromVideo(actualFilePath, tmpdir())
        audioFilePath = audioExtractionResult.audioPath
        tempFiles.push(audioExtractionResult.audioPath)

        console.log(`Audio extraction successful:`)
        console.log(`- Original video: ${actualFilePath}`)
        console.log(`- Extracted audio: ${audioFilePath}`)
      } catch (error) {
        console.error('Audio extraction failed:', error)
        throw new Error(`Video audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (isAudio) {
      processingStep = 'audio file processing'
      console.log('=== AUDIO PROCESSING FLOW ===')
      console.log('Audio file detected, proceeding with speech-to-text...')
    }

    // Step 2: Speech to Text
    processingStep = 'speech to text'
    console.log('=== SPEECH-TO-TEXT STEP ===')
    console.log(`Converting speech to text from: ${audioFilePath}`)

    let originalText: string
    try {
      originalText = await elevenLabs.speechToText(audioFilePath)
      console.log(`Speech-to-text successful. Transcript length: ${originalText.length} characters`)
      console.log(`Transcript preview: ${originalText.substring(0, 100)}${originalText.length > 100 ? '...' : ''}`)
    } catch (error) {
      console.error('Speech-to-text failed:', error)
      throw new Error(`Speech-to-text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    if (!originalText || originalText.trim().length === 0) {
      throw new Error('No speech detected in the audio file. Please ensure the file contains clear speech.')
    }

    // Step 3: Translate text
    processingStep = 'translation'
    console.log('=== TRANSLATION STEP ===')
    console.log(`Translating text to ${targetLanguage}...`)
    console.log(`Original text to translate: ${originalText}`)

    let translatedText: string
    try {
      translatedText = await openAI.translateText(originalText, targetLanguage)
      console.log(`Translation successful. Translated text length: ${translatedText.length} characters`)
      console.log(`Translation preview: ${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}`)
    } catch (error) {
      console.error('Translation failed:', error)
      throw new Error(`Text translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Step 4: Text to Speech
    processingStep = 'text to speech'
    console.log('=== TEXT-TO-SPEECH STEP ===')
    console.log(`Converting translated text to speech...`)

    let base64Audio: string
    try {
      base64Audio = await elevenLabs.textToSpeech(translatedText, targetLanguage)
      console.log(`Text-to-speech successful. Audio data size: ${base64Audio.length} characters`)
    } catch (error) {
      console.error('Text-to-speech failed:', error)
      throw new Error(`Text-to-speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Step 5: Save the generated audio in production-safe way
    processingStep = 'saving generated audio'
    console.log('=== SAVING GENERATED AUDIO ===')

    const outputFileName = `dubbed_${Date.now()}_${targetLanguage}.mp3`
    let outputPath: string
    let publicUrl: string

    if (strategy.environment === 'production') {
      // In production, save to temp directory and return as data URL or base64
      outputPath = path.join(tmpdir(), outputFileName)
      console.log(`Production mode: saving audio to temp: ${outputPath}`)

      const audioBuffer = Buffer.from(base64Audio, 'base64')
      await writeFile(outputPath, audioBuffer)
      tempFiles.push(outputPath)

      // Create data URL for production
      publicUrl = `data:audio/mpeg;base64,${base64Audio}`
      console.log(`Production mode: using data URL for audio (${base64Audio.length} chars)`)

    } else {
      // In development, save to public directory
      const outputDir = path.join(process.cwd(), 'public', 'generated')
      try {
        const { mkdir } = await import('fs/promises')
        await mkdir(outputDir, { recursive: true })
        console.log(`Development mode: created output directory: ${outputDir}`)
      } catch (error) {
        // Directory might already exist
      }

      outputPath = path.join(outputDir, outputFileName)
      publicUrl = `/generated/${outputFileName}`
      console.log(`Development mode: saving audio to: ${outputPath}`)

      const audioBuffer = Buffer.from(base64Audio, 'base64')
      await writeFile(outputPath, audioBuffer)
    }

    console.log('Dubbing pipeline completed successfully')

    const result = {
      success: true,
      originalText: originalText,
      translatedText: translatedText,
      audioUrl: publicUrl,
      targetLanguage: targetLanguage,
      processingTime: Date.now(),
      environment: strategy.environment,
      outputFileName: outputFileName
    }

    // Clean up temporary files (but not the output file in development)
    console.log('Starting cleanup of temporary files...')
    setTimeout(async () => {
      for (const tempFile of tempFiles) {
        try {
          await unlink(tempFile)
          console.log(`Cleaned up temporary file: ${tempFile}`)
        } catch (error) {
          console.error(`Failed to cleanup ${tempFile}:`, error)
        }
      }
    }, 2000) // Give a bit more time before cleanup

    return NextResponse.json(result)

  } catch (error) {
    console.error(`=== DUBBING PIPELINE FAILED ===`)
    console.error(`Failed at step: ${processingStep}`)
    console.error('Error details:', error)

    // Clean up temporary files on error
    console.log('Cleaning up temporary files due to error...')
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile)
        console.log(`Cleaned up temporary file: ${tempFile}`)
      } catch (cleanupError) {
        console.error(`Failed to cleanup ${tempFile}:`, cleanupError)
      }
    }

    if (audioExtractionResult?.cleanup) {
      try {
        await audioExtractionResult.cleanup()
        console.log('Audio extraction cleanup completed')
      } catch (cleanupError) {
        console.error('Failed to cleanup audio extraction:', cleanupError)
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    // Return detailed error information
    return NextResponse.json(
      {
        error: errorMessage,
        step: processingStep,
        environment: strategy.environment,
        details: {
          step: processingStep,
          timestamp: new Date().toISOString(),
          message: errorMessage
        }
      },
      { status: 500 }
    )
  }
}

// Configure route segment options for App Router
export const maxDuration = 300 // 5 minutes timeout for long processing
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'