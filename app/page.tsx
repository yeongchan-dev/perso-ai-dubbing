import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          AI Dubbing Service
        </h1>
        <p className="text-gray-600 mb-8">
          AI-powered dubbing service that converts your audio or video into another language.
        </p>
        <Link
          href="/login"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors inline-block"
        >
          Get Started
        </Link>
      </div>
    </div>
  )
}