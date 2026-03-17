import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'

import {
  Axis,
  BrushEvent,
  Chart,
  DomainRange,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  SettingsProps,
  TickFormatter,
} from '@elastic/charts'
import { getValueFormat } from '@baurine/grafana-value-formats'
import format from 'string-template'

import {
  MetricsQueryResponse,
  QueryConfig,
  QueryData,
  QueryOptions,
  RenderMode,
  TimeRangeValue,
  TransformNullValue,
} from './interfaces'
import {
  PromMatrixData,
  processRawData,
  resolveQueryTemplate,
} from '../utils/prometheus'
import {
  alignRange,
  DEFAULT_CHART_SETTINGS,
  timeTickFormatter,
  useChartHandle,
} from '../utils/charts'
import { enqueueRender } from '../utils/renderQueue'
import tz from '../utils/timezone'
import { useChange } from '../utils/useChange'
import { renderQueryData } from './seriesRenderer'
import { SyncChartPointerContext } from './SyncChartPointerContext'

export interface IMetricChartProps {
  queries: QueryConfig[]
  range: TimeRangeValue
  unit?: string
  nullValue?: TransformNullValue
  height?: number
  timezone?: number
  onError?: (err: Error | null) => void
  onLoading?: (isLoading: boolean) => void
  errorComponent?: (err: Error) => JSX.Element
  loadingComponent?: () => JSX.Element
  noDataComponent?: React.ReactNode
  onBrush?: (newRange: TimeRangeValue) => void
  onClickSeriesLabel?: (seriesName: string) => void
  chartSetting?: SettingsProps
  ignoreErrorData?: boolean
  fetchPromeData: (params: {
    endTimeSec: number
    query: string
    startTimeSec: number
    stepSec: number
  }) => Promise<MetricsQueryResponse>
  xAxisFormat?: TickFormatter
  xAxisDomain?: DomainRange
  xAxisNice?: boolean
  yAxisFormat?: TickFormatter
  yAxisNice?: boolean
  yAxisDomain?: DomainRange
  fixMinInterval?: boolean
  minBinWidth?: number
  renderMode?: RenderMode
  renderCommitDelayMs?: number
}

type Data = {
  meta: {
    queryOptions: QueryOptions
  }
  values: QueryData[]
}

const MetricsChart = ({
  queries,
  range,
  unit,
  nullValue = TransformNullValue.NULL,
  height = 200,
  timezone,
  onBrush,
  onError,
  onLoading,
  errorComponent,
  loadingComponent,
  noDataComponent,
  ignoreErrorData = false,
  fetchPromeData,
  onClickSeriesLabel,
  chartSetting,
  xAxisFormat,
  xAxisNice,
  xAxisDomain,
  yAxisFormat,
  yAxisNice,
  yAxisDomain,
  fixMinInterval = true,
  minBinWidth = 5,
  renderMode = 'immediate',
  renderCommitDelayMs = 16,
  children,
}: React.PropsWithChildren<IMetricChartProps>) => {
  const chartRef = useRef<Chart>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartHandle] = useChartHandle(chartContainerRef, 150, minBinWidth)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [committedMinInterval, setCommittedMinInterval] = useState<
    number | undefined
  >((chartSetting?.xDomain as DomainRange | undefined)?.minInterval)
  const ee = useContext(SyncChartPointerContext)

  ee.useSubscription(e => chartRef.current?.dispatchExternalPointerEvent(e))

  const getQueryOptions = (nextRange: TimeRangeValue): QueryOptions => {
    const calcInterval = chartHandle.calcIntervalSec(nextRange)
    const settingInterval =
      (chartSetting?.xDomain as DomainRange | undefined)?.minInterval / 1000 ||
      calcInterval
    const interval = fixMinInterval
      ? settingInterval
      : settingInterval > calcInterval
      ? settingInterval
      : calcInterval
    const rangeSnapshot = alignRange(nextRange, interval)

    return {
      start: rangeSnapshot[0],
      end: rangeSnapshot[1],
      step: interval,
    }
  }

  const [data, setData] = useState<Data | null>(() => ({
    meta: {
      queryOptions: getQueryOptions(range),
    },
    values: [],
  }))

  useChange(() => {
    const queryOptions = getQueryOptions(range)
    const currentMinInterval = (chartSetting?.xDomain as DomainRange | undefined)
      ?.minInterval
    let active = true
    let cancelScheduledCommit: (() => void) | undefined

    async function queryMetric(
      queryTemplate: string,
      fillIdx: number,
      fillInto: (PromMatrixData | null)[]
    ) {
      const query = resolveQueryTemplate(queryTemplate, queryOptions)
      const params = {
        endTimeSec: queryOptions.end,
        query,
        startTimeSec: queryOptions.start,
        stepSec: queryOptions.step,
      }

      try {
        const resp = await fetchPromeData(params)
        let responseData: PromMatrixData | null = null
        if (resp.status === 'success') {
          responseData = resp.data as any
          if (responseData?.resultType !== 'matrix') {
            responseData = null
          }
        }
        fillInto[fillIdx] = responseData
        return true
      } catch (e) {
        fillInto[fillIdx] = null
        if (active) {
          onError?.(e)
          setError(e)
        }
        return false
      }
    }

    async function queryAllMetrics() {
      onLoading?.(true)
      setIsLoading(true)
      setError(null)
      const dataSets: (PromMatrixData | null)[] = []
      let allFailed = false

      try {
        const ret = await Promise.all(
          queries.map((q, idx) => queryMetric(q.promql, idx, dataSets))
        )
        allFailed = ret.every(v => !v)
      } finally {
        // keep loading state until final commit
      }

      if (!active) {
        return
      }

      if (allFailed && ignoreErrorData) {
        onLoading?.(false)
        setIsLoading(false)
        return
      }

      const sd: QueryData[] = []
      const rangeMs = range.map(t => t * 1000)
      dataSets.forEach((responseData, queryIdx) => {
        if (!responseData) {
          return
        }

        responseData.result.forEach((promResult, seriesIdx) => {
          const seriesData = processRawData(promResult, queryOptions)
          if (seriesData === null) {
            return
          }

          const dataInTimeRange = seriesData.filter(
            d => d[0] >= rangeMs[0] && d[0] <= rangeMs[1]
          )
          const transformedData =
            nullValue === TransformNullValue.AS_ZERO
              ? dataInTimeRange.map(d => {
                  if (d[1] !== null) {
                    return d
                  }
                  d[1] = 0
                  return d
                })
              : dataInTimeRange

          sd.push({
            id: `${queryIdx}_${seriesIdx}`,
            name: format(queries[queryIdx].name, promResult.metric),
            data: transformedData,
            type: queries[queryIdx].type,
            color: queries[queryIdx].color,
            lineSeriesStyle: queries[queryIdx].lineSeriesStyle,
          })
        })
      })

      if (!active) {
        return
      }

      const commitRender = () => {
        if (!active) {
          return
        }

        setData({
          meta: {
            queryOptions,
          },
          values: sd,
        })
        setCommittedMinInterval(currentMinInterval)
        onLoading?.(false)
        setIsLoading(false)
      }

      if (renderMode === 'serialized') {
        cancelScheduledCommit = enqueueRender(commitRender, renderCommitDelayMs)
        return
      }

      commitRender()
    }

    queryAllMetrics()

    return () => {
      active = false
      cancelScheduledCommit?.()
    }
  }, [range, renderMode, renderCommitDelayMs])

  useEffect(() => {
    if (typeof timezone === 'number') {
      tz.setTimeZone(timezone)
    }
  }, [])

  const handleBrushEnd = useCallback(
    (ev: BrushEvent) => {
      if (!ev.x) {
        return
      }
      const timeRange: TimeRangeValue = [
        Math.floor((ev.x[0] as number) / 1000),
        Math.floor((ev.x[1] as number) / 1000),
      ]
      onBrush?.(alignRange(timeRange))
    },
    [onBrush]
  )

  const handleLegendItemClick = e => {
    const seriesName = e[0].specId
    onClickSeriesLabel?.(seriesName)
  }

  const toPrecisionUnits = ['short', 'none']

  return (
    <div ref={chartContainerRef}>
      {isLoading && loadingComponent ? (
        <div style={{ height }}>{loadingComponent()}</div>
      ) : error && errorComponent ? (
        <div style={{ height }}>{errorComponent(error)}</div>
      ) : !data.values.length && !!noDataComponent ? (
        <div style={{ height }}>{noDataComponent}</div>
      ) : (
        <Chart size={{ height }} ref={chartRef}>
          <Settings
            {...DEFAULT_CHART_SETTINGS}
            onPointerUpdate={e => {
              ee.emit(e)
              chartSetting?.onPointerUpdate?.(e)
            }}
            xDomain={{ min: range[0] * 1000, max: range[1] * 1000 }}
            onBrushEnd={handleBrushEnd}
            onLegendItemClick={e => {
              handleLegendItemClick(e)
              chartSetting?.onLegendItemClick?.(e)
            }}
            {...{
              ...chartSetting,
              xDomain: chartSetting?.xDomain
                ? {
                    min: range[0] * 1000,
                    max: range[1] * 1000,
                    ...chartSetting.xDomain,
                    minInterval: fixMinInterval ? committedMinInterval : undefined,
                  }
                : { min: range[0] * 1000, max: range[1] * 1000 },
            }}
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            tickFormat={xAxisFormat ? xAxisFormat : timeTickFormatter(range)}
            ticks={7}
            domain={xAxisDomain}
          />
          <Axis
            id="left"
            position={Position.Left}
            domain={yAxisDomain}
            tickFormat={
              yAxisFormat
                ? yAxisFormat
                : v => {
                    const currentUnit = unit || 'none'
                    if (toPrecisionUnits.includes(currentUnit) && v < 1) {
                      return v.toPrecision(3)
                    }
                    return getValueFormat(currentUnit)(v, 2)
                  }
            }
            ticks={5}
          />
          {children}
          {data?.values.map((qd, idx) => (
            <React.Fragment key={idx}>
              {renderQueryData(qd, xAxisNice, yAxisNice)}
            </React.Fragment>
          ))}
          {data && (
            <LineSeries
              id="_placeholder"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              hideInLegend
              data={[
                [data.meta.queryOptions.start * 1000, null],
                [data.meta.queryOptions.end * 1000, null],
              ]}
              xNice={xAxisNice}
              yNice={yAxisNice}
            />
          )}
        </Chart>
      )}
    </div>
  )
}

export default MetricsChart
