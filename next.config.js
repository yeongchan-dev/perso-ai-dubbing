/** @type {import('next').NextConfig} */
const nextConfig = {
  // No need for experimental.appDir in Next.js 14+
  experimental: {
    // Enable support for server components with file uploads
    serverComponentsExternalPackages: ['ffmpeg-static'],
  },
  // Configure API routes for larger payloads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
}