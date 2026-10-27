// src/main.jsx
// OTel DEBE importarse antes que cualquier otra cosa para instrumentar todos los fetch
import './services/otel'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
