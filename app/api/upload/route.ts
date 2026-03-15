import { NextRequest, NextResponse } from 'next/server'
import { processUploadedFile, getUploadStrategy, VERCEL_MAX_PAYLOAD_SIZE } from '@/lib/upload-utils'

export async function POST(request: NextRequest) {
  console.log('🚀 [UPLOAD API] Production-safe upload endpoint called')

  const startTime = Date.now()
  const strategy = getUploadStrategy()

  console.log(`[UPLOAD API] Environment: ${strategy.environment}`)
  console.log(`[UPLOAD API] Max payload size: ${(strategy.maxPayloadSize / (1024 * 1024)).toFixed(2)}MB`)

  try {
    // Check Content-Length header first (before parsing)
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const payloadSize = parseInt(contentLength, 10)
      console.log(`[UPLOAD API] Payload size: ${(payloadSize / (1024 * 1024)).toFixed(2)}MB`)

      if (payloadSize > strategy.maxPayloadSize) {
        console.error(`[UPLOAD API] Payload too large: ${payloadSize} bytes (max: ${strategy.maxPayloadSize})`)

        // Suggest chunked upload for large files
        return NextResponse.json(
          {
            error: 'File too large for direct upload',
            details: `File size ${(payloadSize / (1024 * 1024)).toFixed(2)}MB exceeds the ${(strategy.maxPayloadSize / (1024 * 1024)).toFixed(2)}MB limit. Use chunked upload for files larger than ${(VERCEL_MAX_PAYLOAD_SIZE / (1024 * 1024)).toFixed(1)}MB.`,
            maxSize: strategy.maxPayloadSize,
            actualSize: payloadSize,
            environment: strategy.environment,
            shouldUseChunkedUpload: true,
            chunkSize: Math.floor(VERCEL_MAX_PAYLOAD_SIZE * 0.8) // 80% of max for safety
          },
          { status: 413 }
        )
      }
    }

    // Parse form data
    console.log('[UPLOAD API] Parsing form data...')
    let formData: FormData

    try {
      formData = await request.formData()
      console.log('[UPLOAD API] FormData parsed successfully')
    } catch (parseError) {
      console.error('[UPLOAD API] Failed to parse FormData:', parseError)

      // Check if it's a payload too large error
      if (parseError instanceof Error &&
          (parseError.message.includes('PayloadTooLargeError') ||
           parseError.message.includes('FUNCTION_PAYLOAD_TOO_LARGE') ||
           parseError.message.includes('body limit') ||
           parseError.message.includes('request entity too large'))) {
        return NextResponse.json(
          {
            error: 'File too large',
            details: 'The uploaded file exceeds the server limits. Use chunked upload for large files.',
            environment: strategy.environment,
            shouldUseChunkedUpload: true,
            chunkSize: Math.floor(VERCEL_MAX_PAYLOAD_SIZE * 0.8)
          },
          { status: 413 }
        )
      }

      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: `Request parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          environment: strategy.environment
        },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    if (!file) {
      console.error('[UPLOAD API] No file found in request')
      return NextResponse.json(
        {
          error: 'No file provided',
          details: 'Please select a file to upload'
        },
        { status: 400 }
      )
    }

    console.log(`[UPLOAD API] File received: ${file.name} (${file.size} bytes, ${file.type})`)

    // For production, process small files in-memory instead of temp files
    // This avoids the file system sharing issue between serverless functions
    if (strategy.environment === 'production') {
      console.log('[UPLOAD API] Production mode: processing file in-memory')

      // Convert file to buffer immediately
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      // Validate file - audio only
      const lowerFileName = file.name.toLowerCase()
      const isAudio = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].some(ext => lowerFileName.endsWith(ext))

      if (!isAudio) {
        return NextResponse.json(
          {
            error: 'Invalid file type',
            details: `Only audio files are supported. Supported formats: mp3, wav, flac, m4a, aac, ogg`
          },
          { status: 400 }
        )
      }

      const processingTime = Date.now() - startTime
      console.log(`[UPLOAD API] Production upload completed in ${processingTime}ms`)

      // Return the file data directly for immediate processing
      const responseData = {
        success: true,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isVideo: false,
        isAudio: true,
        // Pass the file buffer as base64 for production processing
        fileBuffer: fileBuffer.toString('base64'),
        processingTimeMs: processingTime,
        environment: strategy.environment,
        inMemoryProcessing: true,
        chunked: false,  // Production small files are not chunked
        tempFilePath: null  // Production doesn't use temp file paths
      }

      console.log('[UPLOAD API] Production response (in-memory):', {
        ...responseData,
        fileBuffer: `[${responseData.fileBuffer.length} chars]` // Don't log full buffer
      })

      return NextResponse.json(responseData)

    } else {
      // Development mode: use file system as before
      console.log('[UPLOAD API] Development mode: using file system processing')

      const uploadResult = await processUploadedFile(file)

      if (!uploadResult.success) {
        console.error('[UPLOAD API] File processing failed:', uploadResult.error)
        return NextResponse.json(
          {
            error: 'File processing failed',
            details: uploadResult.error || 'Unknown processing error'
          },
          { status: 400 }
        )
      }

      const processingTime = Date.now() - startTime
      console.log(`[UPLOAD API] Development upload completed in ${processingTime}ms`)

      const responseData = {
        success: true,
        fileName: uploadResult.tempFilePath ? uploadResult.tempFilePath.split('/').pop() : file.name,
        originalName: uploadResult.originalName,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        isVideo: false,
        isAudio: true,
        tempFilePath: uploadResult.tempFilePath,
        processingTimeMs: processingTime,
        environment: strategy.environment,
        inMemoryProcessing: false,
        chunked: false,  // Development direct uploads are not chunked
        fileBuffer: null  // Development doesn't use file buffers
      }

      console.log('[UPLOAD API] Development response:', responseData)
      return NextResponse.json(responseData)
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[UPLOAD API] Upload failed after ${processingTime}ms:`, error)

    // Detailed error analysis
    let errorMessage = 'Upload failed'
    let errorDetails = 'An unexpected error occurred'
    let statusCode = 500

    if (error instanceof Error) {
      console.error(`[UPLOAD API] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      // Handle specific error types
      if (error.message.includes('ENOSPC')) {
        errorMessage = 'Insufficient server storage'
        errorDetails = 'The server is out of storage space. Please try again later.'
      } else if (error.message.includes('PayloadTooLargeError') ||
                 error.message.includes('FUNCTION_PAYLOAD_TOO_LARGE') ||
                 error.message.includes('entity too large') ||
                 error.message.includes('request entity too large')) {
        errorMessage = 'File too large'
        errorDetails = `File exceeds the ${(strategy.maxPayloadSize / (1024 * 1024)).toFixed(2)}MB limit for ${strategy.environment} environment. Use chunked upload for large files.`
        statusCode = 413
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        errorMessage = 'Server busy'
        errorDetails = 'The server is currently busy. Please try again in a few moments.'
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        environment: strategy.environment,
        maxPayloadSize: strategy.maxPayloadSize,
        timestamp: new Date().toISOString(),
        shouldUseChunkedUpload: statusCode === 413
      },
      { status: statusCode }
    )
  }
}

// Configure the route for production deployment
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'