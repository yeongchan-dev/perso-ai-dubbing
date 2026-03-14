// Client-side chunked upload for large files
import { randomBytes } from 'crypto'

export interface ChunkedUploadConfig {
  chunkSize: number
  maxRetries: number
  onProgress?: (progress: number, currentChunk: number, totalChunks: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
}

export interface ChunkedUploadResult {
  success: boolean
  tempFilePath?: string
  originalName: string
  fileName?: string
  fileSize: number
  fileType?: string
  isVideo: boolean
  isAudio: boolean
  error?: string
  uploadId: string
  chunked?: boolean
  inMemoryProcessing?: boolean
  fileBuffer?: string | null
  environment?: string
}

const DEFAULT_CHUNK_SIZE = 3.5 * 1024 * 1024 // 3.5MB chunks (safely under 4.5MB limit)

export class ChunkedUploader {
  private file: File
  private config: ChunkedUploadConfig
  private uploadId: string
  private finalChunkResult: any = null

  constructor(file: File, config: Partial<ChunkedUploadConfig> = {}) {
    this.file = file
    this.config = {
      chunkSize: config.chunkSize || DEFAULT_CHUNK_SIZE,
      maxRetries: config.maxRetries || 3,
      onProgress: config.onProgress,
      onChunkComplete: config.onChunkComplete
    }
    this.uploadId = this.generateUploadId()
  }

  private generateUploadId(): string {
    // Generate a unique upload ID for tracking chunks
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 15)
    return `upload_${timestamp}_${random}`
  }

  async upload(): Promise<ChunkedUploadResult> {
    console.log(`[CHUNKED-UPLOAD] Starting chunked upload for ${this.file.name}`)
    console.log(`[CHUNKED-UPLOAD] File size: ${this.file.size} bytes`)
    console.log(`[CHUNKED-UPLOAD] Chunk size: ${this.config.chunkSize} bytes`)

    const totalChunks = Math.ceil(this.file.size / this.config.chunkSize)
    console.log(`[CHUNKED-UPLOAD] Total chunks: ${totalChunks}`)

    // Upload chunks sequentially
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.config.chunkSize
      const end = Math.min(start + this.config.chunkSize, this.file.size)
      const chunk = this.file.slice(start, end)

      console.log(`[CHUNKED-UPLOAD] Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes)`)

      const success = await this.uploadChunkWithRetry(chunk, chunkIndex, totalChunks)
      if (!success) {
        return {
          success: false,
          originalName: this.file.name,
          fileSize: this.file.size,
          isVideo: this.isVideo(),
          isAudio: this.isAudio(),
          error: `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`,
          uploadId: this.uploadId
        }
      }

      // Report progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      this.config.onProgress?.(progress, chunkIndex + 1, totalChunks)
      this.config.onChunkComplete?.(chunkIndex, totalChunks)
    }

    console.log(`[CHUNKED-UPLOAD] All chunks uploaded successfully for ${this.file.name}`)

    // The last chunk response should contain the assembled file info
    return {
      success: true,
      tempFilePath: this.finalChunkResult?.tempFilePath,
      originalName: this.file.name,
      fileSize: this.file.size,
      isVideo: this.isVideo(),
      isAudio: this.isAudio(),
      uploadId: this.uploadId
    }
  }

  private async uploadChunkWithRetry(chunk: Blob, chunkIndex: number, totalChunks: number): Promise<boolean> {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const success = await this.uploadSingleChunk(chunk, chunkIndex, totalChunks)
        if (success) return true

        console.warn(`[CHUNKED-UPLOAD] Chunk ${chunkIndex} upload failed, attempt ${attempt + 1}/${this.config.maxRetries}`)
      } catch (error) {
        console.error(`[CHUNKED-UPLOAD] Chunk ${chunkIndex} upload error (attempt ${attempt + 1}):`, error)
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.config.maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return false
  }

  private async uploadSingleChunk(chunk: Blob, chunkIndex: number, totalChunks: number): Promise<boolean> {
    const formData = new FormData()
    formData.append('chunk', new File([chunk], `chunk_${chunkIndex}`, { type: this.file.type }))
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', totalChunks.toString())
    formData.append('fileName', this.file.name)
    formData.append('fileSize', this.file.size.toString())
    formData.append('uploadId', this.uploadId)

    try {
      const response = await fetch('/api/upload-chunk', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error(`[CHUNKED-UPLOAD] Chunk ${chunkIndex} failed:`, errorData)
        return false
      }

      const result = await response.json()
      console.log(`[CHUNKED-UPLOAD] Chunk ${chunkIndex} response:`, result)

      // Store the final chunk result if this is the last chunk
      if (chunkIndex === totalChunks - 1 && result.tempFilePath) {
        this.finalChunkResult = result
        console.log(`[CHUNKED-UPLOAD] Stored final chunk result:`, this.finalChunkResult)
      }

      return result.success
    } catch (error) {
      console.error(`[CHUNKED-UPLOAD] Network error for chunk ${chunkIndex}:`, error)
      return false
    }
  }

  private isVideo(): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
    return videoExtensions.some(ext => this.file.name.toLowerCase().endsWith(ext))
  }

  private isAudio(): boolean {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
    return audioExtensions.some(ext => this.file.name.toLowerCase().endsWith(ext))
  }
}

// Utility function to determine if a file should use chunked upload
export function shouldUseChunkedUpload(file: File, environment: string = 'production'): boolean {
  const productionLimit = 4.5 * 1024 * 1024 // 4.5MB
  const developmentLimit = 50 * 1024 * 1024 // 50MB

  const limit = environment === 'production' ? productionLimit : developmentLimit
  return file.size > limit
}