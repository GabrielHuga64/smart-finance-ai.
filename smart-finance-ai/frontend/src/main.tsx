import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios'

// Bypass localtunnel warning for all API requests
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
