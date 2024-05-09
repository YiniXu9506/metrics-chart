import React, { useEffect } from 'react'

const LIGHT_TOKEN = 'metrics-chart-light'
const DARK_TOKEN = 'metrics-chart-dark'

export const MetricsChartTheme: React.FC<{ value: 'light' | 'dark' }> = ({
  value,
  children,
}) => {
  useEffect(() => {
    if (value === 'light') {
      window.document.body.classList.remove(DARK_TOKEN)
      window.document.body.classList.add(LIGHT_TOKEN)
    } else {
      window.document.body.classList.remove(LIGHT_TOKEN)
      window.document.body.classList.add(DARK_TOKEN)
    }
  }, [value])
  return <>{children}</>
}
