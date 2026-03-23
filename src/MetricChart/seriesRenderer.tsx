import { AreaSeries, BarSeries, LineSeries, ScaleType } from '@elastic/charts'
import React from 'react'

import { QueryData } from './interfaces'

type YScaleType = typeof ScaleType.Linear | typeof ScaleType.Log

export function renderQueryData(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  yScaleType: YScaleType = ScaleType.Linear
) {
  return (
    <>
      {qd.type === 'line' && <>{renderLine(qd, xAxisNice, yAxisNice, yScaleType)}</>}
      {qd.type === 'bar_stacked' && (
        <>{renderStackedBar(qd, xAxisNice, yAxisNice, yScaleType)}</>
      )}
      {qd.type === 'area_stack' && (
        <>{renderAreaStack(qd, xAxisNice, yAxisNice, yScaleType)}</>
      )}
      {qd.type === 'area' && <>{renderArea(qd, xAxisNice, yAxisNice, yScaleType)}</>}
    </>
  )
}

function renderStackedBar(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  yScaleType: YScaleType = ScaleType.Linear
) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={yScaleType}
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

function renderLine(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  yScaleType: YScaleType = ScaleType.Linear
) {
  return (
    <LineSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={yScaleType}
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
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  yScaleType: YScaleType = ScaleType.Linear
) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={yScaleType}
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

function renderArea(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  yScaleType: YScaleType = ScaleType.Linear
) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={yScaleType}
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
