/**
 * Options Entry Point for AI Consul Lite
 * Mounts React app to the options page
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import OptionsPage from './options.jsx'

// Mount React app
const container = document.getElementById('root')
const root = createRoot(container)
root.render(React.createElement(OptionsPage))
