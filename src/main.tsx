import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, resolveTheme } from '@/lib/theme'

// Apply the theme before first paint to avoid a flash of the wrong colors
applyTheme(resolveTheme())

createRoot(document.getElementById('root')!).render(
    <App />
)
