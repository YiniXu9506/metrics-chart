import React from 'react'
import { useEventEmitter } from 'ahooks'
import { PointerEvent } from '@elastic/charts'
import { EventEmitter } from 'ahooks/lib/useEventEmitter'

export const ChartContext = React.createContext<EventEmitter<PointerEvent>>(
  null as any
)

export const SyncChartContext = ({ children }) => {
  const ee = useEventEmitter<PointerEvent>()
  return <ChartContext.Provider value={ee}>{children}</ChartContext.Provider>
}