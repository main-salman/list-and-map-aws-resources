import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AWS Resource Scanner',
  description: 'Visualize and explore your AWS infrastructure',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="min-h-screen w-full overflow-x-hidden">
        <div className="relative min-h-screen flex flex-col">
          {/* Background gradient */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-80"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(37, 38, 43, 0.7) 0%, rgba(0, 0, 0, 0.9) 100%)',
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 flex-grow">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
