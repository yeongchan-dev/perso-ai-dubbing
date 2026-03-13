import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/services/elevenlabs'
import { OpenAIService } from '@/services/openai'
import { extractAudioFromVideo, isVideoFile, isAudioFile } from '@/lib/audio-utils'
import path from 'path'
import { writeFile, unlink } from 'fs/promises'

export async function POST(request: NextRequest) {
  let tempFiles: string[] = []
  let audioExtractionResult: any = null
  let processingStep = 'initialization'

  try {
    console.log('=== DUBBING PIPELINE START ===')
    processingStep = 'parsing request'

    const body = await request.json()
    const { fileName, targetLanguage, filePath } = body

    console.log(`Received request:`)
    console.log(`- fileName: ${fileName}`)
    console.log(`- targetLanguage: ${targetLanguage}`)
    console.log(`- filePath: ${filePath}`)

    if (!fileName || !targetLanguage || !filePath) {
      const missingParams = []
      if (!fileName) missingParams.push('fileName')
      if (!targetLanguage) missingParams.push('targetLanguage')
      if (!filePath) missingParams.push('filePath')

      return NextResponse.json(
        {
          error: `Missing required parameters: ${missingParams.join(', ')}`,
          step: processingStep
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

    let audioFilePath = filePath

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
        audioExtractionResult = await extractAudioFromVideo(filePath)
        audioFilePath = audioExtractionResult.audioPath
        tempFiles.push(audioExtractionResult.audioPath, audioExtractionResult.originalPath)

        console.log(`Audio extraction successful:`)
        console.log(`- Original video: ${filePath}`)
        console.log(`- Extracted audio: ${audioFilePath}`)
      } catch (error) {
        console.error('Audio extraction failed:', error)
        throw new Error(`Video audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else if (isAudio) {
      processingStep = 'audio file processing'
      console.log('=== AUDIO PROCESSING FLOW ===')
      console.log('Audio file detected, proceeding with speech-to-text...')
      tempFiles.push(filePath)
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

    // Step 5: Save the generated audio
    const outputDir = path.join(process.cwd(), 'public', 'generated')
    try {
      const { mkdir } = await import('fs/promises')
      await mkdir(outputDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    const outputFileName = `dubbed_${Date.now()}_${targetLanguage}.mp3`
    const outputPath = path.join(outputDir, outputFileName)
    const publicUrl = `/generated/${outputFileName}`

    // Convert base64 to file
    const audioBuffer = Buffer.from(base64Audio, 'base64')
    await writeFile(outputPath, audioBuffer)

    console.log('Dubbing pipeline completed successfully')

    // Clean up temporary files
    setTimeout(async () => {
      for (const tempFile of tempFiles) {
        try {
          await unlink(tempFile)
          console.log(`Cleaned up temporary file: ${tempFile}`)
        } catch (error) {
          console.error(`Failed to cleanup ${tempFile}:`, error)
        }
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      originalText: originalText,
      translatedText: translatedText,
      audioUrl: publicUrl,
      targetLanguage: targetLanguage,
      processingTime: Date.now()
    })

  } catch (error) {
    console.error(`=== DUBBING PIPELINE FAILED ===`)
    console.error(`Failed at step: ${processingStep}`)
    console.error('Error details:', error)

    // Clean up temporary files on error
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