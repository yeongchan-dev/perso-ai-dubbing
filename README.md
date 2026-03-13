# AI Dubbing Web Service

An AI-powered dubbing web service that converts audio or video files into different languages using speech-to-text, translation, and text-to-speech technologies.

## Features

- **File Upload**: Support for audio (MP3, WAV) and video (MP4, MOV) files
- **Multi-language Support**: English, Korean, Japanese, Spanish
- **AI Pipeline**: Speech-to-text → Translation → Text-to-speech
- **Authentication**: Google OAuth with email whitelist
- **Real-time Processing**: Live status updates during dubbing process

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, TailwindCSS
- **Database**: Turso (SQLite-compatible cloud database)
- **AI APIs**: ElevenLabs (speech processing), OpenAI (translation)
- **Authentication**: NextAuth.js with Google OAuth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. API keys for:
   - ElevenLabs API
   - OpenAI API
   - Turso database
   - Google OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your actual API keys and credentials.

4. Set up the database:
   - Create a Turso database
   - Run the schema from `db/schema.sql`
   - Add allowed user emails to the `allowed_users` table

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.example` for required environment variables.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   └── layout.tsx        # Root layout
├── components/           # Reusable UI components
├── db/                  # Database schema and utilities
├── lib/                 # Utility functions and types
└── services/           # External API integrations
```

## Deployment

1. Deploy to Vercel:
   ```bash
   npm run build
   ```

2. Set environment variables in Vercel dashboard

3. Configure your domain and SSL

## License

MIT