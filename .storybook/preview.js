import React from 'react'

import '../src/reset.css'
import '../.css/light_theme.css'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    expanded: true,
  },
  layout: 'fullscreen',
}

export const decorators = [
  Story => (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
        background:
          'radial-gradient(circle at top left, #f5f9ff 0%, #eef4ff 45%, #e9f0fb 100%)',
      }}
    >
      <Story />
    </div>
  ),
]
