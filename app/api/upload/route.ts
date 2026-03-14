import { NextRequest, NextResponse } from 'next/server'
import { processUploadedFile, getUploadStrategy } from '@/lib/upload-utils'

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
        return NextResponse.json(
          {
            error: 'File too large for upload',
            details: `File size ${(payloadSize / (1024 * 1024)).toFixed(2)}MB exceeds the ${(strategy.maxPayloadSize / (1024 * 1024)).toFixed(2)}MB limit for production deployment. Please compress your file or use a smaller file.`,
            maxSize: strategy.maxPayloadSize,
            actualSize: payloadSize,
            environment: strategy.environment
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
           parseError.message.includes('body limit') ||
           parseError.message.includes('request entity too large'))) {
        return NextResponse.json(
          {
            error: 'File too large',
            details: 'The uploaded file exceeds the server limits. Please use a smaller file (max 4.5MB in production).',
            environment: strategy.environment
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

    // Process the file using our production-safe utility
    console.log('[UPLOAD API] Processing file with production-safe strategy...')
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
    console.log(`[UPLOAD API] Upload completed successfully in ${processingTime}ms`)

    // Return success response
    const responseData = {
      success: true,
      fileName: uploadResult.tempFilePath ? uploadResult.tempFilePath.split('/').pop() : file.name,
      originalName: uploadResult.originalName,
      fileSize: uploadResult.fileSize,
      fileType: uploadResult.fileType,
      isVideo: uploadResult.isVideo,
      isAudio: uploadResult.isAudio,
      tempFilePath: uploadResult.tempFilePath, // This will be used by the dubbing endpoint
      processingTimeMs: processingTime,
      environment: strategy.environment,
      uploadStrategy: strategy
    }

    console.log('[UPLOAD API] Success response:', JSON.stringify(responseData, null, 2))
    return NextResponse.json(responseData)

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
                 error.message.includes('entity too large') ||
                 error.message.includes('request entity too large')) {
        errorMessage = 'File too large'
        errorDetails = `File exceeds the ${(strategy.maxPayloadSize / (1024 * 1024)).toFixed(2)}MB limit for ${strategy.environment} environment.`
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
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

// Configure the route for production deployment
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'