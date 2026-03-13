// OpenAI API integration
// Used for text translation

interface LanguageMap {
  [key: string]: string
}

const LANGUAGE_MAP: LanguageMap = {
  'en': 'English',
  'ko': 'Korean',
  'ja': 'Japanese',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'zh': 'Chinese (Simplified)',
}

export class OpenAIService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      console.log(`Translating text to ${targetLanguage} using OpenAI...`)

      const languageName = LANGUAGE_MAP[targetLanguage] || targetLanguage

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Your task is to translate the provided text accurately into ${languageName}.

              Rules:
              1. Translate the text naturally while preserving the original meaning
              2. Maintain the tone and style of the original text
              3. Return ONLY the translated text, no explanations or additional content
              4. If the text is already in ${languageName}, return it unchanged
              5. Handle speech patterns and colloquialisms appropriately for the target language`
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API Error:', errorText)
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const translatedText = data.choices[0]?.message?.content || text

      console.log('Translation completed successfully')
      return translatedText.trim()
    } catch (error) {
      console.error('Translation error:', error)
      throw new Error('Failed to translate text')
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a language detection expert. Identify the language of the provided text and return only the two-letter ISO language code (e.g., "en" for English, "ko" for Korean, "ja" for Japanese, "es" for Spanish, etc.).'
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
      })

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content?.trim()?.toLowerCase() || 'en'
    } catch (error) {
      console.error('Language detection error:', error)
      return 'en' // Default to English
    }
  }
}