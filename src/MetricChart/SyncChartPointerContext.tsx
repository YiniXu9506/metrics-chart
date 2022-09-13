import React from 'react'
import { useEventEmitter } from 'ahooks'
import { PointerEvent } from '@elastic/charts'
import { EventEmitter } from 'ahooks/lib/useEventEmitter'

export const SyncChartPointerContext = React.createContext<EventEmitter<PointerEvent>>(
  null as any
)

export const SyncChartPointer = ({ children }) => {
  const ee = useEventEmitter<PointerEvent>()
  return <SyncChartPointerContext.Provider value={ee}>{children}</SyncChartPointerContext.Provider>
}