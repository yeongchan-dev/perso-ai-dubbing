import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import SessionProvider from '@/components/SessionProvider'
import { authOptions } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Dubbing Service',
  description: 'AI-powered dubbing service that converts your audio or video into another language',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}