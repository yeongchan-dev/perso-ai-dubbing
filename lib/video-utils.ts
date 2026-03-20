'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export class VideoProcessor {
  private ffmpeg: FFmpeg | null = null
  private loaded = false

  async loadFFmpeg(): Promise<void> {
    if (this.loaded) return

    this.ffmpeg = new FFmpeg()

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    this.loaded = true
  }

  async getVideoDuration(file: File): Promise<number> {
    // For client-side processing, we'll use a simpler approach
    // Since we're cropping to 1 minute anyway, we can assume any video > 60s needs cropping
    // This avoids the complexity of parsing FFmpeg logs in the browser

    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }

      video.onerror = () => {
        // If we can't get duration, assume it needs processing
        resolve(120) // Default to 2 minutes to trigger cropping
      }

      video.src = URL.createObjectURL(file)
    })
  }

  async cropVideoTo1Minute(file: File, onProgress?: (progress: number) => void): Promise<File> {
    await this.loadFFmpeg()
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    const inputName = 'input.' + file.name.split('.').pop()
    const outputName = 'output.mp4'

    await this.ffmpeg.writeFile(inputName, await fetchFile(file))

    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100))
      })
    }

    // Crop to first 60 seconds
    await this.ffmpeg.exec([
      '-i', inputName,
      '-t', '60',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      '-crf', '28',
      outputName
    ])

    const data = await this.ffmpeg.readFile(outputName) as Uint8Array
    const croppedBlob = new Blob([new Uint8Array(data)], { type: 'video/mp4' })

    return new File([croppedBlob], `cropped_${file.name}`, { type: 'video/mp4' })
  }

  async extractAudioFromVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
    await this.loadFFmpeg()
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    const inputName = 'input.' + file.name.split('.').pop()
    const outputName = 'output.mp3'

    await this.ffmpeg.writeFile(inputName, await fetchFile(file))

    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100))
      })
    }

    await this.ffmpeg.exec([
      '-i', inputName,
      '-vn', // No video
      '-acodec', 'mp3',
      '-ab', '128k',
      outputName
    ])

    const data = await this.ffmpeg.readFile(outputName) as Uint8Array
    const audioBlob = new Blob([new Uint8Array(data)], { type: 'audio/mp3' })

    return new File([audioBlob], `${file.name.split('.')[0]}.mp3`, { type: 'audio/mp3' })
  }

  async processVideoForUpload(file: File, onProgress?: (step: string, progress: number) => void): Promise<File> {
    const MAX_DURATION = 60 // 60 seconds (duration-based cropping only)

    console.log('🎬 VIDEO PROCESSING START 🎬')
    console.log(`Original file: ${file.name}`)
    console.log(`Original size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`)

    // Check video duration
    onProgress?.('Analyzing video duration...', 5)
    const duration = await this.getVideoDuration(file)
    console.log(`Original duration: ${duration.toFixed(1)} seconds`)
    console.log(`Duration threshold: ${MAX_DURATION} seconds`)

    // Determine if cropping is needed (duration-based only)
    const needsCropping = duration > MAX_DURATION

    console.log(`Duration exceeds ${MAX_DURATION}s: ${needsCropping}`)
    console.log(`Cropping required: ${needsCropping}`)

    if (!needsCropping) {
      // Just extract audio if no cropping needed
      console.log(`✅ Video duration (${duration.toFixed(1)}s) is within 60s limit, extracting audio directly...`)
      onProgress?.('Video ≤60s - extracting audio...', 10)
      const audioFile = await this.extractAudioFromVideo(file, (progress) => {
        onProgress?.('Extracting audio from video...', 10 + (progress * 0.9))
      })
      onProgress?.('Audio extraction complete', 100)
      console.log(`✅ Audio extracted successfully: ${audioFile.name} (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB)`)
      return audioFile
    }

    // Crop video first, then extract audio
    const cropReason = `duration (${duration.toFixed(1)}s) exceeds 60s limit`

    console.log(`🔪 CROPPING NEEDED: ${cropReason}`)
    onProgress?.('Trimming video to first 60 seconds...', 10)

    const croppedVideo = await this.cropVideoTo1Minute(file, (progress) => {
      onProgress?.('Trimming video to first 60 seconds...', 10 + (progress * 0.5))
    })

    console.log(`🔪 Video trimmed: ${croppedVideo.name} (${(croppedVideo.size / (1024 * 1024)).toFixed(2)}MB)`)

    onProgress?.('Extracting audio from trimmed video...', 60)
    const audioFile = await this.extractAudioFromVideo(croppedVideo, (progress) => {
      onProgress?.('Extracting audio from trimmed video...', 60 + (progress * 0.4))
    })

    onProgress?.('Video processing complete', 100)
    console.log(`✅ Final audio: ${audioFile.name} (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB)`)
    console.log('🎬 VIDEO PROCESSING COMPLETE 🎬')
    return audioFile
  }
}

export function isVideoFile(fileName: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp']
  return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
}

export function isAudioFile(fileName: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
  return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
}

export async function shouldProcessVideo(file: File): Promise<{ needsProcessing: boolean, reason: string, willCrop: boolean }> {
  if (!isVideoFile(file.name)) {
    return { needsProcessing: false, reason: 'Not a video file', willCrop: false }
  }

  // All videos need processing to extract audio
  // Duration check will happen during actual processing to determine if cropping is needed
  return {
    needsProcessing: true,
    willCrop: false, // Duration check will determine this during processing
    reason: 'Video needs audio extraction for dubbing'
  }
}