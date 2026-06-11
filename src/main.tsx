import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyThemePref, getThemePref } from '@/lib/theme'

// Apply the saved preference before first paint. 'system' leaves it to CSS,
// which follows the OS scheme.
applyThemePref(getThemePref())

createRoot(document.getElementById('root')!).render(
    <App />
)
