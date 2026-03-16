import {
  AreaSeries,
  BarSeries,
  LineSeries,
  ScaleType,
} from '@elastic/charts'
import React, { memo, useMemo } from 'react'

import { QueryData } from './interfaces'

const DEFAULT_LINE_SERIES_STYLE = {
  line: {
    strokeWidth: 2,
  },
  point: {
    visible: false,
  },
}

type QuerySeriesProps = {
  qd: QueryData
  xAxisNice?: boolean
  yAxisNice?: boolean
}

function renderStackedBar(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean
) {
  return (
    <BarSeries
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

function renderLine(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean,
  lineSeriesStyle?: QueryData['lineSeriesStyle']
) {
  return (
    <LineSeries
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
      lineSeriesStyle={lineSeriesStyle}
    />
  )
}

function renderAreaStack(
  qd: QueryData,
  xAxisNice?: boolean,
  yAxisNice?: boolean
) {
  return (
    <AreaSeries
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

function renderArea(qd: QueryData, xAxisNice?: boolean, yAxisNice?: boolean) {
  return (
    <AreaSeries
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

export const QuerySeries = memo(
  ({ qd, xAxisNice, yAxisNice }: QuerySeriesProps) => {
    const lineSeriesStyle = useMemo(
      () => ({
        ...DEFAULT_LINE_SERIES_STYLE,
        ...qd.lineSeriesStyle,
      }),
      [qd.lineSeriesStyle]
    )

    switch (qd.type) {
      case 'bar_stacked':
        return renderStackedBar(qd, xAxisNice, yAxisNice)
      case 'area_stack':
        return renderAreaStack(qd, xAxisNice, yAxisNice)
      case 'area':
        return renderArea(qd, xAxisNice, yAxisNice)
      case 'line':
      default:
        return renderLine(qd, xAxisNice, yAxisNice, lineSeriesStyle)
    }
  }
)
