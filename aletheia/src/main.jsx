import './styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DemoProvider } from './context/DemoContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DemoProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </DemoProvider>
  </StrictMode>,
)
