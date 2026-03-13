export interface User {
  id: number
  email: string
  created_at: string
}

export interface DubbingJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  originalText?: string
  translatedText?: string
  targetLanguage: string
  audioUrl?: string
  createdAt: string
}

export type SupportedLanguage = 'en' | 'ko' | 'ja' | 'es'

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
}