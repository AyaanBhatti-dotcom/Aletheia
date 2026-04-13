/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const DemoContext = createContext(null)

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  function toggleDemo() {
    setIsDemoMode((currentValue) => !currentValue)
  }

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)

  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider')
  }

  return context
}
