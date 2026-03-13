import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { isAudioFile, isVideoFile } from '@/lib/audio-utils'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const isValidAudio = isAudioFile(file.name)
    const isValidVideo = isVideoFile(file.name)

    if (!isValidAudio && !isValidVideo) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio or video file.' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${safeFileName}`
    const filePath = path.join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    console.log(`File uploaded successfully: ${fileName}`)

    return NextResponse.json({
      success: true,
      fileName: fileName,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isVideo: isValidVideo,
      isAudio: isValidAudio,
      filePath: filePath
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}

// Note: In Next.js App Router, body parsing is handled automatically
// File size limits are configured in next.config.js if needed