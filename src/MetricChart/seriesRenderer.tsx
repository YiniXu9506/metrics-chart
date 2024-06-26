import { BarSeries, LineSeries, ScaleType, AreaSeries } from '@elastic/charts'
import { QueryData } from './interfaces'
import React from 'react'

export function renderQueryData(qd: QueryData) {
  return (
    <>
      {qd.type === 'line' && <>{renderLine(qd)}</>}
      {qd.type === 'bar_stacked' && <>{renderStackedBar(qd)}</>}
      {qd.type === 'area_stack' && <>{renderAreaStack(qd)}</>}
      {qd.type === 'area' && <>{renderArea(qd)}</>}
    </>
  )
}

function renderStackedBar(qd: QueryData) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}

function renderLine(qd: QueryData) {
  return (
    <LineSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
      lineSeriesStyle={{
        line: {
          strokeWidth: 2,
        },
        point: {
          visible: false,
        },
        ...qd.lineSeriesStyle,
      }}
    />
  )
}

function renderAreaStack(qd: QueryData) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}

function renderArea(qd: QueryData) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}
