# AI Audio & Video Dubbing Service

Live Demo  
https://perso-ai-dubbing.vercel.app

## Demo

### Main Interface

![Screenshot1](./screenshot1.png)

### Dubbing Result

![Screenshot2](./screenshot2.png)

AI Audio & Video Dubbing is a web application that automatically translates spoken audio/video into another language and generates dubbed speech using AI.

Users can upload an audio file or video file, choose a target language, and the system will transcribe, translate, and generate a dubbed audio file that can be played and downloaded directly from the browser.

**NEW:** Video files are automatically processed on your device - large videos are cropped to 1 minute for mobile-friendly upload and processing.

---

# Service Overview

This service demonstrates an AI-powered pipeline that converts speech from one language into another.

The workflow is as follows:

1. Upload an audio file or video file
2. **[Video only]** Client-side processing: Crop video to 1 minute and extract audio
3. Transcribe the speech using AI (Speech-to-Text)
4. Translate the text into another language
5. Generate dubbed audio using Text-to-Speech
6. Play the generated audio in the browser
7. Download the dubbed audio file

The application provides a simple interface that allows users to perform multilingual dubbing without any technical setup.

---

# Main Features

- Upload audio files (MP3, WAV, FLAC, M4A, AAC, OGG)
- **NEW:** Upload video files (MP4, MOV, AVI, MKV, WEBM)
- **NEW:** Client-side video processing for mobile-friendly upload
- **NEW:** Automatic 1-minute cropping for large videos
- **NEW:** Real-time video processing progress with FFmpeg.wasm
- Automatic speech recognition (Speech-to-Text)
- Automatic translation into another language
- AI-generated dubbed audio (Text-to-Speech)
- In-browser audio playback
- Download generated dubbed audio
- Google authentication login
- Deployed cloud service via Vercel

---

# Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- **NEW:** FFmpeg.wasm (client-side video processing)

### AI Services
- OpenAI API (translation)
- ElevenLabs (speech-to-text, text-to-speech)

### Database
- Turso (SQLite edge database)

### Authentication
- Google OAuth

### Media Processing
- **Client-side:** FFmpeg.wasm (video cropping, audio extraction)
- **Server-side:** FFmpeg-static (audio processing backup)

### Deployment
- Vercel

---

# Local Development

### 1. Clone the repository

git clone https://github.com/yeongchan-dev/perso-ai-dubbing.git

### 2. Move into the project directory

cd perso-ai-dubbing

### 3. Install dependencies

npm install

### 4. Set environment variables

Create a `.env.local` file and add your API key.

OPENAI_API_KEY=your_api_key

See .env.example for required environment variablesa

### 5. Run the development server

npm run dev

Open in browser:

http://localhost:3000

---

# Deployed Service URL

The deployed application can be accessed here:

https://perso-ai-dubbing.vercel.app

---

# Using AI Coding Agents

This project was primarily developed using **Claude** as a coding agent for generating and implementing the core application logic and UI components.

Additional assistance from **ChatGPT** was used for debugging support, documentation guidance, and development explanations.

AI coding agents were used for:

- Generating and refining frontend UI code
- Implementing application logic
- Debugging build and runtime errors
- Improving user interface readability and usability
- Fixing deployment issues
- Assisting with project documentation

Through iterative interaction with AI coding agents, the development process became significantly faster and more efficient.

---

# Video Processing Implementation

This project now supports **both audio and video dubbing** with intelligent client-side processing.

## Client-Side Video Processing

To address serverless environment limitations, video processing is handled entirely on the client side:

- **FFmpeg.wasm** processes videos directly in the browser
- Videos longer than 60 seconds are automatically trimmed to the first 1 minute
- Audio is extracted from videos before upload
- No server-side video processing required

## Mobile Compatibility

The client-side approach ensures compatibility with mobile devices:

- Works on modern mobile browsers (iOS Safari, Android Chrome)
- Processing happens on the user's device
- No additional server resources required
- Maintains privacy by keeping video processing local

## Technical Benefits

- **Scalable:** No server resources used for video processing
- **Fast:** Parallel processing on user's device
- **Cost-effective:** Reduces server computational load
- **Privacy-friendly:** Videos never uploaded in full to servers
- **Mobile-optimized:** 1-minute limit ensures reasonable processing times

---

# Future Improvements

Possible future extensions include:

- ~~Video dubbing support~~ ✅ **COMPLETED**
- Support for longer videos (beyond 1 minute)
- Video output with lip-sync dubbing
- Multiple target language options
- Improved UI/UX design
- Audio waveform visualization
- Batch processing for multiple files
- Real-time video preview during processing