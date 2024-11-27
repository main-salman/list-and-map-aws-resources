import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={`${inter.className} min-h-screen w-full`}>
        <div className="flex min-h-screen flex-col items-center justify-start">
          {children}
        </div>
      </body>
    </html>
  )
}
