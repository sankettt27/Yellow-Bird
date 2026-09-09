import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppMobile from './app/AppMobile'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMobile />
  </StrictMode>,
)
