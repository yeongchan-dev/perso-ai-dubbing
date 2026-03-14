import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, unlink, access } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import { validateFile, VERCEL_MAX_PAYLOAD_SIZE } from '@/lib/upload-utils'

// Chunked upload endpoint for large files
export async function POST(request: NextRequest) {
  console.log('🔄 [CHUNK-UPLOAD] Chunked upload endpoint called')

  try {
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    const uploadId = formData.get('uploadId') as string

    console.log(`[CHUNK-UPLOAD] Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`)
    console.log(`[CHUNK-UPLOAD] Chunk size: ${chunk.size} bytes`)
    console.log(`[CHUNK-UPLOAD] Upload ID: ${uploadId}`)

    if (!chunk || chunkIndex === undefined || !totalChunks || !fileName || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required chunk parameters' },
        { status: 400 }
      )
    }

    // Validate chunk size
    if (chunk.size > VERCEL_MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { error: 'Chunk too large', maxChunkSize: VERCEL_MAX_PAYLOAD_SIZE },
        { status: 413 }
      )
    }

    // Create temp directory for this upload
    const tempDir = path.join(tmpdir(), 'chunks', uploadId)
    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`)

    // Ensure temp directory exists
    const { mkdir } = await import('fs/promises')
    await mkdir(tempDir, { recursive: true })

    // Save chunk to temporary file
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
    await writeFile(chunkPath, chunkBuffer)

    console.log(`[CHUNK-UPLOAD] Saved chunk ${chunkIndex} to ${chunkPath}`)

    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      console.log(`[CHUNK-UPLOAD] Final chunk received, assembling file...`)

      // Validate file before assembly
      const dummyFile = { name: fileName, size: fileSize, type: '' } as File
      const validation = validateFile(dummyFile)
      if (!validation.valid) {
        // Clean up chunks
        await cleanupChunks(tempDir)
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      // Assemble all chunks into final file
      const finalFilePath = path.join(tmpdir(), `assembled_${uploadId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`)

      try {
        await assembleChunks(tempDir, totalChunks, finalFilePath)

        // Clean up chunk files
        await cleanupChunks(tempDir)

        console.log(`[CHUNK-UPLOAD] File assembled successfully: ${finalFilePath}`)

        // Verify file size matches expected
        const stats = await import('fs').then(fs => fs.promises.stat(finalFilePath))
        if (stats.size !== fileSize) {
          console.error(`[CHUNK-UPLOAD] Size mismatch: expected ${fileSize}, got ${stats.size}`)
          await unlink(finalFilePath).catch(() => {})
          return NextResponse.json(
            { error: 'File assembly failed: size mismatch' },
            { status: 500 }
          )
        }

        // Determine file types
        const lowerFileName = fileName.toLowerCase()
        const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].some(ext => lowerFileName.endsWith(ext))
        const isAudio = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].some(ext => lowerFileName.endsWith(ext))

        return NextResponse.json({
          success: true,
          message: 'File uploaded and assembled successfully',
          fileName: fileName,
          originalName: fileName,
          tempFilePath: finalFilePath,
          fileSize: stats.size,
          fileType: '', // We don't have MIME type from chunks
          isVideo,
          isAudio,
          uploadId,
          chunked: true,
          inMemoryProcessing: false,  // Chunked uploads use file system
          fileBuffer: null,  // Chunked uploads don't use buffers
          environment: 'chunked'  // Indicate this came from chunked upload
        })

      } catch (assemblyError) {
        console.error(`[CHUNK-UPLOAD] Assembly failed:`, assemblyError)
        await cleanupChunks(tempDir)
        await unlink(finalFilePath).catch(() => {})

        return NextResponse.json(
          { error: 'File assembly failed', details: assemblyError instanceof Error ? assemblyError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Not the final chunk, just acknowledge receipt
    return NextResponse.json({
      success: true,
      chunkIndex,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`
    })

  } catch (error) {
    console.error('[CHUNK-UPLOAD] Error:', error)
    return NextResponse.json(
      { error: 'Chunk upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function assembleChunks(tempDir: string, totalChunks: number, outputPath: string): Promise<void> {
  const { createWriteStream } = await import('fs')
  const writeStream = createWriteStream(outputPath)

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk_${i}`)
      const chunkData = await readFile(chunkPath)

      await new Promise<void>((resolve, reject) => {
        writeStream.write(chunkData, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((error?: Error | null) => {
        if (error) reject(error)
        else resolve()
      })
    })

  } catch (error) {
    writeStream.destroy()
    throw error
  }
}

async function cleanupChunks(tempDir: string): Promise<void> {
  try {
    const { rm } = await import('fs/promises')
    await rm(tempDir, { recursive: true, force: true })
    console.log(`[CHUNK-UPLOAD] Cleaned up temp directory: ${tempDir}`)
  } catch (error) {
    console.warn(`[CHUNK-UPLOAD] Failed to cleanup temp directory: ${tempDir}`, error)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'