import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/db'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user email is in the allowed_users table
          const isAllowed = await db.isUserAllowed(user.email)
          return isAllowed
        } catch (error) {
          console.error('Error checking user permissions:', error)
          return false
        }
      }
      return false
    },
    async session({ session, user }) {
      return session
    },
    async jwt({ token, user }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}