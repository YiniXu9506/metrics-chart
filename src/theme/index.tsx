import React from 'react'

export const MetricsChartTheme: React.FC<{ value: 'light' | 'dark' }> = ({
  value,
  children,
}) => {
  return (
    <div
      className={
        value === 'light' ? 'metrics-chart-light' : 'metrics-chart-dark'
      }
    >
      {children}
    </div>
  )
}
