
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from "next-themes"
import App from './App.tsx'
import './index.css'
import './components/WhirlpoolLoader.css'
import { ReactFlowProvider } from '@xyflow/react'
import { registerAllNodes } from './lib/register-nodes'

// Register all nodes before the app starts
registerAllNodes();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
