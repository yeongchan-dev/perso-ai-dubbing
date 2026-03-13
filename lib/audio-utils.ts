import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

// Get FFmpeg path - handle both local and production environments
function getFFmpegPath(): string | null {
  try {
    // Try to get the ffmpeg-static binary path
    const ffmpegStatic = require('ffmpeg-static')
    console.log('ffmpeg-static result:', ffmpegStatic)

    if (ffmpegStatic && typeof ffmpegStatic === 'string') {
      // Handle incorrect path resolution in Next.js environment
      let actualPath = ffmpegStatic
      if (actualPath.includes('/ROOT/')) {
        // Replace /ROOT/ with actual project root
        actualPath = actualPath.replace('/ROOT/', process.cwd() + '/')
        console.log('Corrected FFmpeg path:', actualPath)
      }

      // Verify the binary exists and is executable
      const fs = require('fs')
      try {
        fs.accessSync(actualPath, fs.constants.F_OK | fs.constants.X_OK)
        console.log('Using ffmpeg-static binary at:', actualPath)
        return actualPath
      } catch (accessError) {
        console.warn('FFmpeg binary not accessible at corrected path:', accessError)

        // Try the original path as fallback
        try {
          fs.accessSync(ffmpegStatic, fs.constants.F_OK | fs.constants.X_OK)
          console.log('Using original ffmpeg-static binary at:', ffmpegStatic)
          return ffmpegStatic
        } catch (originalError) {
          console.warn('Original FFmpeg binary not accessible:', originalError)
        }
      }
    }
  } catch (error) {
    console.warn('ffmpeg-static not available:', error)
  }

  // Check if system ffmpeg is available
  try {
    const { execSync } = require('child_process')
    execSync('which ffmpeg', { stdio: 'ignore' })
    console.log('Using system ffmpeg')
    return 'ffmpeg'
  } catch (error) {
    console.warn('System ffmpeg not available:', error)
  }

  console.error('No FFmpeg binary available')
  return null
}

export interface AudioExtractionResult {
  audioPath: string
  originalPath: string
  cleanup: () => Promise<void>
}

export async function extractAudioFromVideo(
  videoPath: string,
  outputDir: string = '/tmp'
): Promise<AudioExtractionResult> {
  return new Promise((resolve, reject) => {
    console.log('=== FFMPEG AUDIO EXTRACTION DEBUG START ===')

    const outputPath = path.join(outputDir, `audio_${Date.now()}.wav`)
    console.log(`Input video path: ${videoPath}`)
    console.log(`Output audio path: ${outputPath}`)

    const ffmpegPath = getFFmpegPath()
    if (!ffmpegPath) {
      console.error('FFmpeg path resolution failed')
      reject(new Error('FFmpeg not available - please install FFmpeg'))
      return
    }

    console.log(`Using FFmpeg binary: ${ffmpegPath}`)

    // Check if input file exists
    const fs = require('fs')
    if (!fs.existsSync(videoPath)) {
      console.error(`Input video file does not exist: ${videoPath}`)
      reject(new Error(`Input video file not found: ${videoPath}`))
      return
    }

    const videoStats = fs.statSync(videoPath)
    console.log(`Video file size: ${videoStats.size} bytes`)

    // Check if FFmpeg binary is executable
    try {
      fs.accessSync(ffmpegPath, fs.constants.X_OK)
      console.log('FFmpeg binary is executable')
    } catch (error) {
      console.error('FFmpeg binary is not executable:', error)
      reject(new Error(`FFmpeg binary not executable: ${ffmpegPath}`))
      return
    }

    const ffmpegArgs = [
      '-i', videoPath,
      '-vn', // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit little-endian
      '-ar', '16000', // 16kHz sample rate (good for speech recognition)
      '-ac', '1', // Mono channel
      '-f', 'wav',
      outputPath
    ]

    console.log('FFmpeg command:', ffmpegPath, ffmpegArgs.join(' '))

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs)

    let stderr = ''
    let stdout = ''

    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log('FFmpeg stdout:', data.toString())
    })

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
      console.log('FFmpeg stderr:', data.toString())
    })

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg process exited with code: ${code}`)
      console.log(`Full stderr output: ${stderr}`)

      if (code === 0) {
        // Check if output file was created
        if (fs.existsSync(outputPath)) {
          const audioStats = fs.statSync(outputPath)
          console.log(`Output audio file size: ${audioStats.size} bytes`)

          if (audioStats.size > 0) {
            console.log('=== FFMPEG AUDIO EXTRACTION SUCCESS ===')
            resolve({
              audioPath: outputPath,
              originalPath: videoPath,
              cleanup: async () => {
                try {
                  await fs.promises.unlink(outputPath)
                  await fs.promises.unlink(videoPath)
                  console.log('Cleanup completed successfully')
                } catch (error) {
                  console.error('Cleanup error:', error)
                }
              }
            })
          } else {
            console.error('Output audio file is empty')
            reject(new Error('Audio extraction produced empty file'))
          }
        } else {
          console.error('Output audio file was not created')
          reject(new Error('Audio extraction failed - no output file created'))
        }
      } else {
        console.error('=== FFMPEG AUDIO EXTRACTION FAILED ===')
        reject(new Error(`FFmpeg failed with exit code ${code}: ${stderr}`))
      }
    })

    ffmpeg.on('error', (error: NodeJS.ErrnoException) => {
      console.error('=== FFMPEG SPAWN ERROR ===')
      console.error('Spawn error:', error)
      console.error('Error code:', error.code || 'unknown')
      console.error('Error syscall:', error.syscall || 'unknown')
      console.error('Error path:', error.path || 'unknown')
      // Additional spawn-specific error properties
      const spawnError = error as any
      if (spawnError.signal) {
        console.error('Error signal:', spawnError.signal)
      }
      reject(new Error(`FFmpeg spawn error: ${error.message}`))
    })
  })
}

export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  const ext = path.extname(filename).toLowerCase()
  return videoExtensions.includes(ext)
}

export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
  const ext = path.extname(filename).toLowerCase()
  return audioExtensions.includes(ext)
}

export async function saveBase64Audio(
  base64Data: string,
  filename: string,
  outputDir: string = '/tmp'
): Promise<string> {
  const audioBuffer = Buffer.from(base64Data, 'base64')
  const outputPath = path.join(outputDir, `dubbed_${Date.now()}_${filename}`)
  await fs.writeFile(outputPath, audioBuffer)
  return outputPath
}