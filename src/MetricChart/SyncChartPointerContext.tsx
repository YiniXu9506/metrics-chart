import React from 'react'
import { useEventEmitter } from 'ahooks'
import { PointerEvent } from '@elastic/charts'
import { EventEmitter } from 'ahooks/lib/useEventEmitter'

const NOOP_EVENT_EMITTER: Pick<EventEmitter<PointerEvent>, 'emit' | 'useSubscription'> =
  {
    emit: () => {},
    useSubscription: () => {},
  }

export const SyncChartPointerContext =
  React.createContext<EventEmitter<PointerEvent>>(
    NOOP_EVENT_EMITTER as EventEmitter<PointerEvent>
  )

export const SyncChartPointer = ({ children }) => {
  const ee = useEventEmitter<PointerEvent>()
  return <SyncChartPointerContext.Provider value={ee}>{children}</SyncChartPointerContext.Provider>
}
