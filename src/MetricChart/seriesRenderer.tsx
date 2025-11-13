import { BarSeries, LineSeries, ScaleType, AreaSeries } from '@elastic/charts'
import { QueryData } from './interfaces'
import React from 'react'

export function renderQueryData(
  qd: QueryData,
  xAxisNice: boolean,
  yAxisNice: boolean
) {
  return (
    <>
      {qd.type === 'line' && <>{renderLine(qd, xAxisNice, yAxisNice)}</>}
      {qd.type === 'bar_stacked' && (
        <>{renderStackedBar(qd, xAxisNice, yAxisNice)}</>
      )}
      {qd.type === 'area_stack' && (
        <>{renderAreaStack(qd, xAxisNice, yAxisNice)}</>
      )}
      {qd.type === 'area' && <>{renderArea(qd, xAxisNice, yAxisNice)}</>}
    </>
  )
}

function renderStackedBar(
  qd: QueryData,
  xAxisNice: boolean,
  yAxisNice: boolean
) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      xNice={xAxisNice}
      yNice={yAxisNice}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}

function renderLine(qd: QueryData, xAxisNice: boolean, yAxisNice: boolean) {
  return (
    <LineSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      xNice={xAxisNice}
      yNice={yAxisNice}
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

function renderAreaStack(
  qd: QueryData,
  xAxisNice: boolean,
  yAxisNice: boolean
) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      xNice={xAxisNice}
      yNice={yAxisNice}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}

function renderArea(qd: QueryData, xAxisNice: boolean, yAxisNice: boolean) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      xNice={xAxisNice}
      yNice={yAxisNice}
      data={qd.data}
      name={qd.name}
      color={typeof qd.color === 'function' ? qd.color(qd.name) : qd.color}
    />
  )
}
