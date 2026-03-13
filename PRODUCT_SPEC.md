# AI Dubbing Web Service – Product Specification

## 1. Project Overview

This project builds a simple AI-powered dubbing web service.

Users can upload an audio or video file and automatically generate dubbed audio in another language.

The system performs the following steps:

1. Extract speech from uploaded media
2. Convert speech to text
3. Translate the transcript into a target language
4. Generate new speech using the translated text
5. Return the dubbed audio to the user

This application is designed as a minimal MVP demo demonstrating an AI-powered dubbing workflow.

The application must be deployable on Vercel and structured clearly for developer readability.

---

# 2. Tech Stack

The system must use the following technologies.

## Frontend / Fullstack Framework

- Next.js (App Router)
- TypeScript
- TailwindCSS

## Authentication

- Google OAuth login

## Database

- Turso (SQLite-compatible cloud database)

## AI APIs

### Speech Processing

ElevenLabs API

Used for:

- Speech-to-text
- Text-to-speech

### Translation

OpenAI API will be used for translation.

Example usage:

- Translate transcript into selected target language.

---

# 3. Core Features

## 3.1 Authentication System

The application must support Google OAuth login.

However, only whitelisted users are allowed to use the service.

### Authentication Flow

1. User clicks "Login with Google"
2. Google OAuth authentication occurs
3. Application receives the user email
4. System checks if email exists in the database whitelist
5. If email exists → allow access
6. If email does not exist → deny access

---

## 3.2 Database Design

Database: Turso

Create a table for allowed users.

Table name:

allowed_users

Fields:

id INTEGER PRIMARY KEY  
email TEXT UNIQUE  
created_at TIMESTAMP

Purpose:

Only users in this table are allowed to access the service.

---

## 3.3 File Upload System

Users must be able to upload:

- Audio files
- Video files

Example formats:

- mp3
- wav
- mp4
- mov

Uploaded files will be processed by the AI dubbing pipeline.

The UI should include:

- File upload input

---

## 3.4 Language Selection

Users must be able to select a target language.

Example supported languages:

- English
- Korean
- Japanese
- Spanish

The selected language will be used during the translation step.

---

# 4. AI Dubbing Pipeline

The core system workflow is the AI dubbing pipeline.

Pipeline steps:

Step 1  
User uploads audio or video

Step 2  
If file is video → extract audio

Step 3  
Send audio to Speech-to-Text API (ElevenLabs)

Step 4  
Receive transcript

Step 5  
Send transcript to OpenAI for translation

Step 6  
Receive translated text

Step 7  
Send translated text to ElevenLabs Text-to-Speech API

Step 8  
Generate dubbed audio

Step 9  
Return generated audio to user

---

# 5. Environment Variables

API keys must NOT be hardcoded.

They must be stored using environment variables.

Example `.env.local` file:

ELEVENLABS_API_KEY=your_key_here  
OPENAI_API_KEY=your_key_here  

Inside the code, environment variables should be accessed using:

process.env.ELEVENLABS_API_KEY  
process.env.OPENAI_API_KEY  

---

# 6. User Interface

The UI should be clean, minimal, and functional.

TailwindCSS should be used for styling.

---

## 6.1 Landing Page

Purpose:

Introduce the service.

Components:

- Title
- Short explanation
- Login button

Example text:

AI-powered dubbing service that converts your audio or video into another language.

---

## 6.2 Dashboard Page

Accessible only after login.

Features:

- File upload
- Language selection
- Start dubbing button

---

## 6.3 Processing State

While the dubbing process is running:

Display:

- Loading indicator
- Processing status

---

## 6.4 Result Section

After processing completes, display:

- Transcript
- Translated text
- Generated audio player

Also include:

- Download audio button

---

# 7. Project Structure

Example Next.js project structure:

/app  
  /api  
  /dashboard  
  /login  

/components  

/lib  

/services  

/db  

Responsibilities:

app/api → backend API routes  
services → external API integrations  
db → database connection  
components → UI components  
lib → utility functions

---

# 8. API Design

Example backend routes.

Upload API

POST /api/upload

Handles file upload.

Dubbing API

POST /api/dub

Pipeline:

1. receive uploaded file
2. convert speech to text
3. translate text
4. generate speech
5. return dubbed audio

---

# 9. Deployment

The application must be deployable on Vercel.

Environment variables required:

ELEVENLABS_API_KEY  
OPENAI_API_KEY  
DATABASE_URL  
GOOGLE_CLIENT_ID  
GOOGLE_CLIENT_SECRET  

---

# 10. UX Goals

This is an MVP developer demo.

Focus on:

- working functionality
- clean architecture
- readable code
- simple UI

Avoid unnecessary complexity.

---

# 11. Development Guidelines

The codebase should:

- be modular
- separate business logic from UI
- isolate API integrations
- maintain a clear folder structure

---

# 12. Final User Flow

User logs in  
→ Uploads media file  
→ Selects target language  
→ Starts dubbing process  
→ Receives dubbed audio