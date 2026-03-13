# AI Dubbing Service - Testing Guide

## ✅ Complete AI Dubbing Pipeline Implementation

The AI dubbing pipeline has been fully implemented with the following features:

### 🔄 **Complete Pipeline Flow:**

1. **File Upload** → Upload audio/video files (MP3, WAV, MP4, MOV)
2. **Audio Extraction** → Automatically extract audio from video files using FFmpeg
3. **Speech-to-Text** → Convert speech to text using ElevenLabs API
4. **Translation** → Translate text to target language using OpenAI GPT-4
5. **Text-to-Speech** → Generate dubbed audio using ElevenLabs API
6. **Result Display** → Show transcript, translation, audio player, and download

## 🧪 **Testing the Complete Flow**

### Prerequisites:
- ✅ Google OAuth configured and working
- ✅ Your email (`jangyeongchan0723@gmail.com`) added to whitelist
- ✅ API keys configured in `.env.local`:
  - `ELEVENLABS_API_KEY` (configured)
  - `OPENAI_API_KEY` (configured)
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` (configured)

### Test Steps:

1. **Access Dashboard:**
   - Go to `http://localhost:3000`
   - Click "Get Started" → Login with Google
   - You should reach the dashboard successfully

2. **Upload Test File:**
   - Upload an audio file (MP3/WAV) or video file (MP4/MOV)
   - Select target language (English, Korean, Japanese, Spanish, etc.)
   - Click "Start Dubbing"

3. **Monitor Processing:**
   - Watch the progress bar and status updates:
     - "Uploading file..." (10%)
     - "Processing audio/video..." (30%)
     - "Converting speech to text..." (50%)
     - "Translating text..." (70%)
     - "Generating dubbed audio..." (90%)
     - "Complete!" (100%)

4. **View Results:**
   - Original transcript
   - Translated text
   - Audio player with dubbed audio
   - Download button for the generated MP3

## 📁 **Files Modified/Created:**

### **API Layer:**
- `app/api/upload/route.ts` - File upload handling with validation
- `app/api/dub/route.ts` - Complete dubbing pipeline orchestration

### **Service Layer:**
- `services/elevenlabs.ts` - Speech-to-text and text-to-speech integration
- `services/openai.ts` - Translation service with language detection
- `lib/audio-utils.ts` - Audio extraction and file utilities

### **Frontend:**
- `app/dashboard/page.tsx` - Complete UI with processing states and results
- `components/SessionProvider.tsx` - Authentication wrapper
- `lib/auth.ts` - NextAuth configuration with email whitelist

### **Infrastructure:**
- `uploads/` - Temporary file storage
- `public/generated/` - Generated audio file storage

## 🔧 **Environment Variables Required:**

```bash
# API Keys (already configured)
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key

# Google OAuth (already configured)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth (already configured)
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Database (using mocked data in development)
# DATABASE_URL=your_turso_url
# DATABASE_AUTH_TOKEN=your_turso_token
```

## 🎯 **Key Features Implemented:**

### **File Processing:**
- ✅ Audio file support (MP3, WAV, FLAC, M4A, AAC, OGG)
- ✅ Video file support (MP4, MOV, AVI, MKV, WEBM, M4V)
- ✅ Automatic audio extraction from video using FFmpeg
- ✅ File validation (type, size limits)

### **AI Pipeline:**
- ✅ ElevenLabs Speech-to-Text with multilingual support
- ✅ OpenAI GPT-4 translation with context awareness
- ✅ ElevenLabs Text-to-Speech with voice synthesis
- ✅ Error handling and cleanup

### **User Experience:**
- ✅ Real-time processing status updates
- ✅ Progress bar with detailed steps
- ✅ Error messages and validation
- ✅ Audio player for results
- ✅ Download functionality
- ✅ Responsive design

### **Security:**
- ✅ Google OAuth authentication
- ✅ Email whitelist verification
- ✅ Session-based access control
- ✅ File upload validation

## 🧪 **Test Cases:**

### **1. Audio File Test:**
- Upload an MP3/WAV file with clear speech
- Select a target language different from the audio
- Verify complete pipeline execution

### **2. Video File Test:**
- Upload an MP4/MOV file with speech
- Verify audio extraction works
- Check that the dubbing process completes successfully

### **3. Multi-language Test:**
- Test different language combinations:
  - English → Korean
  - Korean → English
  - English → Spanish
  - Japanese → English

### **4. Error Handling Test:**
- Upload invalid file types
- Upload files over 50MB
- Test without selecting language
- Test API failures

## 🚀 **Next Steps for Production:**

1. **Database Setup:**
   - Configure Turso database
   - Add production email whitelist
   - Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN`

2. **Deployment:**
   - Deploy to Vercel
   - Configure environment variables
   - Update OAuth URLs for production domain

3. **Monitoring:**
   - Add logging and analytics
   - Monitor API usage and costs
   - Set up error tracking

## 📞 **Support:**

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs in the terminal
3. Verify all environment variables are set correctly
4. Ensure your Google account email is in the whitelist

The complete AI dubbing pipeline is now ready for testing! 🎉