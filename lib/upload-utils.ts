// Production-safe upload utilities for Vercel deployment
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { randomBytes } from 'crypto'

// Vercel constraints
export const VERCEL_MAX_PAYLOAD_SIZE = 4.5 * 1024 * 1024 // 4.5MB (safely under 5MB limit)
export const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB total limit

export interface ChunkUploadResult {
  success: boolean
  tempFilePath?: string
  originalName: string
  fileSize: number
  fileType: string
  isVideo: boolean
  isAudio: boolean
  error?: string
  cleanup: () => Promise<void>
}

// Generate a secure temporary file path
export function generateTempFilePath(originalName: string): string {
  const timestamp = Date.now()
  const randomId = randomBytes(8).toString('hex')
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const tempFileName = `upload_${timestamp}_${randomId}_${sanitizedName}`
  return path.join(tmpdir(), tempFileName)
}

// Validate file before processing
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB, but file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    }
  }

  // Check file type
  const fileName = file.name.toLowerCase()
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']

  const isAudio = audioExtensions.some(ext => fileName.endsWith(ext))

  if (!isAudio) {
    return {
      valid: false,
      error: `Invalid file type. Only audio files are supported: ${audioExtensions.join(', ')}`
    }
  }

  return { valid: true }
}

// Process file directly from FormData without storing in project directory
export async function processUploadedFile(file: File): Promise<ChunkUploadResult> {
  console.log(`[UPLOAD-UTILS] Processing file: ${file.name} (${file.size} bytes)`)

  // Validate file first
  const validation = validateFile(file)
  if (!validation.valid) {
    return {
      success: false,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isVideo: false,
      isAudio: false,
      error: validation.error,
      cleanup: async () => {}
    }
  }

  const tempFilePath = generateTempFilePath(file.name)
  console.log(`[UPLOAD-UTILS] Temporary file path: ${tempFilePath}`)

  try {
    // Convert file to buffer and write to temp location
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[UPLOAD-UTILS] Writing ${buffer.length} bytes to temp file...`)
    await writeFile(tempFilePath, buffer)

    // Determine file type - audio only
    const fileName = file.name.toLowerCase()
    const isAudio = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].some(ext => fileName.endsWith(ext))

    console.log(`[UPLOAD-UTILS] File processed successfully: ${file.name}`)

    return {
      success: true,
      tempFilePath,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isVideo: false,
      isAudio: true,
      cleanup: async () => {
        try {
          await unlink(tempFilePath)
          console.log(`[UPLOAD-UTILS] Cleaned up temp file: ${tempFilePath}`)
        } catch (error) {
          console.warn(`[UPLOAD-UTILS] Failed to clean up temp file: ${tempFilePath}`, error)
        }
      }
    }

  } catch (error) {
    console.error(`[UPLOAD-UTILS] Failed to process file:`, error)
    return {
      success: false,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isVideo: false,
      isAudio: false,
      error: error instanceof Error ? error.message : 'Unknown processing error',
      cleanup: async () => {}
    }
  }
}

// Check if we're running in a production environment (Vercel)
export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

// Get appropriate upload strategy based on environment
export function getUploadStrategy() {
  const isProduction = isProductionEnvironment()
  const strategy = {
    maxPayloadSize: isProduction ? VERCEL_MAX_PAYLOAD_SIZE : 50 * 1024 * 1024,
    useChunking: isProduction,
    useTempStorage: true,
    environment: isProduction ? 'production' : 'development'
  }

  console.log(`[UPLOAD-UTILS] Upload strategy for ${strategy.environment}:`, strategy)
  return strategy
}