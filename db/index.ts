// Database connection and utilities
// Using Turso (SQLite-compatible cloud database)

import { createClient } from '@libsql/client'
import type { User } from '@/lib/types'

export class Database {
  private client

  constructor() {
    const url = process.env.DATABASE_URL
    const authToken = process.env.DATABASE_AUTH_TOKEN

    if (!url) {
      // In development, use a placeholder - actual database operations will fail gracefully
      if (process.env.NODE_ENV === 'development') {
        console.warn('DATABASE_URL is not set - database operations will be mocked in development')
        this.client = null
        return
      }
      throw new Error('DATABASE_URL is not set')
    }

    this.client = createClient({
      url,
      authToken,
    })
  }

  async isUserAllowed(email: string): Promise<boolean> {
    // Mock allowed users in development
    if (!this.client) {
      console.log(`Checking if ${email} is allowed (mocked in development)`)
      // Allow a few test emails for development
      const allowedEmails = ['admin@example.com', 'test@example.com', 'user@example.com', 'jangyeongchan0723@gmail.com']
      return allowedEmails.includes(email)
    }

    try {
      const result = await this.client.execute({
        sql: 'SELECT id FROM allowed_users WHERE email = ?',
        args: [email],
      })

      return result.rows.length > 0
    } catch (error) {
      console.error('Database error:', error)
      return false
    }
  }

  async addAllowedUser(email: string): Promise<User | null> {
    // Mock functionality in development
    if (!this.client) {
      console.log(`Adding ${email} to allowed users (mocked in development)`)
      return {
        id: 1,
        email,
        created_at: new Date().toISOString(),
      }
    }

    try {
      const result = await this.client.execute({
        sql: 'INSERT INTO allowed_users (email) VALUES (?) RETURNING *',
        args: [email],
      })

      if (result.rows.length > 0) {
        const row = result.rows[0]
        return {
          id: row.id as number,
          email: row.email as string,
          created_at: row.created_at as string,
        }
      }

      return null
    } catch (error) {
      console.error('Database error:', error)
      return null
    }
  }
}

export const db = new Database()