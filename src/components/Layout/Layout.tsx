// filepath: src/components/Layout/Layout.tsx
import { ReactNode } from 'react'
import { Navbar } from '../Navbar'
import { Footer } from '../Footer'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  )
}