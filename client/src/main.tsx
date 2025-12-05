import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/styles/design-system.css'
import './assets/styles/dark-theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
