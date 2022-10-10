import { BarSeries, LineSeries, ScaleType, AreaSeries, BubbleSeries } from '@elastic/charts'
import { QueryData } from './interfaces'
import React from 'react'

export function renderQueryData(qd: QueryData) {
  return (
    <>
      {qd.type === 'line' && <>{renderLine(qd)}</>}
      {qd.type === 'bar_stacked' && <>{renderStackedBar(qd)}</>}
      {qd.type === 'area_stack' && <>{renderAreaStack(qd)}</>}
      {qd.type === 'point' && <>{renderPoint(qd)}</>}
    </>
  )
}

function renderStackedBar(qd: QueryData) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.name}
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
      id={qd.name}
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
      }}
    />
  )
}

function renderAreaStack(qd: QueryData) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.name}
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

function renderPoint(qd: QueryData) {
  return (
    <BubbleSeries
        id="bubbles"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        data={qd.data}
        name={qd.name}
        pointStyleAccessor={() => {
          return {
            shape: 'circle',
            fill: '__use__series__color__',
            radius: 5,
          };
        }}
      />
  )
}

