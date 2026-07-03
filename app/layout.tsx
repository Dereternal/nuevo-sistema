import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProtectedLayout } from '@/components/ProtectedLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Valencia en Contingencia',
  description: 'Inventario en tiempo real del Centro de Acopio de la Alcaldía de Valencia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ProtectedLayout>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6 bg-gray-50 min-h-screen">
                {children}
              </main>
            </div>
          </div>
        </ProtectedLayout>
      </body>
    </html>
  )
}
