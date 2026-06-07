import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recall — Find anything at home',
  description: 'Track where you keep everything in your house. Never lose an item again.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
