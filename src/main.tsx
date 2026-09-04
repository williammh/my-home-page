import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Preset's theme is class-based (`.dark` on <html>); follow the OS preference
// the way the previous prefers-color-scheme CSS did, and keep it live.
const media = window.matchMedia('(prefers-color-scheme: dark)')
const syncTheme = (isDark: boolean) => document.documentElement.classList.toggle('dark', isDark)
syncTheme(media.matches)
media.addEventListener('change', (e) => syncTheme(e.matches))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
