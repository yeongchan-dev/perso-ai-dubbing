import { promises as fs } from 'fs'
import path from 'path'

// ElevenLabs API integration
// Used for speech-to-text and text-to-speech

export class ElevenLabsService {
  private apiKey: string
  private baseUrl = 'https://api.elevenlabs.io/v1'

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set')
    }
  }

  async speechToText(audioFilePath: string): Promise<string> {
    try {
      console.log('=== ELEVENLABS STT DEBUG START ===')
      console.log(`Reading audio file: ${audioFilePath}`)

      // Check if file exists
      try {
        await fs.access(audioFilePath)
      } catch (error) {
        console.error('Audio file does not exist:', error)
        throw new Error(`Audio file not found: ${audioFilePath}`)
      }

      const audioBuffer = await fs.readFile(audioFilePath)
      console.log(`Audio file size: ${audioBuffer.length} bytes`)
      console.log(`File extension: ${path.extname(audioFilePath)}`)

      // Determine MIME type based on file extension
      const extension = path.extname(audioFilePath).toLowerCase()
      let mimeType = 'audio/wav' // default
      if (extension === '.mp3') mimeType = 'audio/mpeg'
      else if (extension === '.m4a') mimeType = 'audio/mp4'
      else if (extension === '.ogg') mimeType = 'audio/ogg'
      else if (extension === '.flac') mimeType = 'audio/flac'

      console.log(`Using MIME type: ${mimeType}`)

      const formData = new FormData()
      const audioBlob = new Blob([audioBuffer], { type: mimeType })
      const fileName = path.basename(audioFilePath)

      console.log(`File name for upload: ${fileName}`)

      // ElevenLabs API expects 'file' parameter and model_id in form data body
      formData.append('file', audioBlob, fileName)
      formData.append('model_id', 'scribe_v2')

      console.log('FormData prepared, sending to ElevenLabs...')
      console.log(`API URL: ${this.baseUrl}/speech-to-text`)
      console.log(`API Key present: ${!!this.apiKey}`)
      console.log('FormData contents:')
      console.log('- file:', fileName)
      console.log('- model_id: scribe_v2')

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      })

      console.log(`Response status: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ElevenLabs STT API Error Response:', errorText)
        console.error('Response status:', response.status)
        console.error('Response statusText:', response.statusText)
        throw new Error(`Speech-to-text API failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Raw API response:', result)

      if (!result.text) {
        console.warn('No text field in response, available fields:', Object.keys(result))
        throw new Error('No transcript returned from ElevenLabs API')
      }

      console.log(`Transcript: "${result.text}"`)
      console.log('=== ELEVENLABS STT DEBUG END ===')
      return result.text
    } catch (error) {
      console.error('=== ELEVENLABS STT ERROR ===')
      console.error('Error details:', error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      throw new Error(`Speech-to-text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async textToSpeech(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      console.log('Converting text to speech using ElevenLabs...')

      // Use a default voice ID - you can make this configurable later
      const voiceId = 'pNInz6obpgDQGcFmaJgB' // Default voice (Adam)

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ElevenLabs TTS Error:', errorText)
        throw new Error(`Text-to-speech failed: ${response.status} ${errorText}`)
      }

      const audioBuffer = await response.arrayBuffer()
      const base64Audio = Buffer.from(audioBuffer).toString('base64')

      console.log('Text-to-speech completed successfully')
      return base64Audio
    } catch (error) {
      console.error('Text-to-speech error:', error)
      throw new Error('Failed to convert text to speech')
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get voices: ${response.status}`)
      }

      const result = await response.json()
      return result.voices || []
    } catch (error) {
      console.error('Error getting voices:', error)
      return []
    }
  }
}