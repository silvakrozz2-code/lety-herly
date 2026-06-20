import { Inter } from 'next/font/google'
import './globals.css'
import PlanoGuard from '@/components/PlanoGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Lety Harley Lashdesigner',
  description: 'Extensões de cílios profissionais',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <PlanoGuard>
          {children}
        </PlanoGuard>
      </body>
    </html>
  )
}
