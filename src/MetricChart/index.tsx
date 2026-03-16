import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

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
import { useDeepCompareChange } from '../utils/useChange'
import { QuerySeries } from './seriesRenderer'
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
  // Fix min interval when `minInterval` was setting in the `chartSetting`, so that min interval will be fixed instead of auto computed by container size.
  // `true` by default.
  fixMinInterval?: boolean
  // Minimum bin width in pixels for calculating max data points. Smaller values allow more data points.
  // Bar charts typically need larger values (e.g., 5) for visual clarity, while line charts can use smaller values (e.g., 1-2).
  // Default is 5.
  minBinWidth?: number
  // Controls whether chart data should be committed immediately or serialized across multiple charts.
  renderMode?: RenderMode
  // Gap between serialized render commits in milliseconds.
  renderCommitDelayMs?: number
}

type Data = {
  meta: {
    queryOptions: QueryOptions
  }
  values: QueryData[]
}

const TO_PRECISION_UNITS = new Set(['short', 'none'])

const MemoizedSettings = memo((props: SettingsProps) => <Settings {...props} />)

const MemoizedAxis = memo((props: React.ComponentProps<typeof Axis>) => (
  <Axis {...props} />
))

type PlaceholderSeriesProps = {
  data: [number, null][]
  xAxisNice?: boolean
  yAxisNice?: boolean
}

const PlaceholderSeries = memo(
  ({ data, xAxisNice, yAxisNice }: PlaceholderSeriesProps) => (
    <LineSeries
      id="_placeholder"
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      hideInLegend
      data={data}
      xNice={xAxisNice}
      yNice={yAxisNice}
    />
  )
)

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
  const ee = useContext(SyncChartPointerContext)

  ee.useSubscription(e => chartRef.current?.dispatchExternalPointerEvent(e))

  const requestedMinInterval =
    (chartSetting?.xDomain as DomainRange | undefined)?.minInterval

  const getQueryOptions = useCallback(
    (nextRange: TimeRangeValue): QueryOptions => {
      const calcInterval = chartHandle.calcIntervalSec(nextRange)
      const settingInterval = requestedMinInterval
        ? requestedMinInterval / 1000
        : calcInterval
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
    },
    [chartHandle, fixMinInterval, requestedMinInterval]
  )

  const [data, setData] = useState<Data | null>(() => ({
    meta: {
      queryOptions: getQueryOptions(range),
    },
    values: [],
  }))

  useDeepCompareChange(() => {
    const queryOptions = getQueryOptions(range)
    const visibleRangeMs = [range[0] * 1000, range[1] * 1000] as TimeRangeValue
    let active = true
    let cancelScheduledCommit: (() => void) | undefined

    async function queryMetric(
      queryConfig: QueryConfig,
      fillIdx: number,
      fillInto: (PromMatrixData | null)[]
    ) {
      const query = resolveQueryTemplate(queryConfig.promql, queryOptions)
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
          queries.map((queryConfig, idx) =>
            queryMetric(queryConfig, idx, dataSets)
          )
        )
        allFailed = ret.every(v => !v)
      } finally {
        // keep loading state until the final render commit finishes
      }

      if (!active) {
        return
      }

      if (allFailed && ignoreErrorData) {
        onLoading?.(false)
        setIsLoading(false)
        return
      }

      const seriesData: QueryData[] = []
      dataSets.forEach((matrixData, queryIdx) => {
        if (!matrixData) {
          return
        }

        const queryConfig = queries[queryIdx]
        matrixData.result.forEach((promResult, seriesIdx) => {
          const normalizedData = processRawData(
            promResult,
            queryOptions,
            visibleRangeMs,
            nullValue
          )
          if (normalizedData === null) {
            return
          }

          seriesData.push({
            id: `${queryIdx}_${seriesIdx}`,
            name: format(queryConfig.name, promResult.metric),
            data: normalizedData,
            type: queryConfig.type,
            color: queryConfig.color,
            lineSeriesStyle: queryConfig.lineSeriesStyle,
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
          values: seriesData,
        })
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
  }, [
    range,
    queries,
    nullValue,
    ignoreErrorData,
    fetchPromeData,
    getQueryOptions,
    onLoading,
    renderCommitDelayMs,
    renderMode,
  ])

  useEffect(() => {
    if (typeof timezone === 'number') {
      tz.setTimeZone(timezone)
    }
  }, [timezone])

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

  const handleLegendItemClick = useCallback(
    e => {
      const seriesName = e[0].specId
      onClickSeriesLabel?.(seriesName)
    },
    [onClickSeriesLabel]
  )

  const handlePointerUpdate = useCallback(
    e => {
      ee.emit(e)
      chartSetting?.onPointerUpdate?.(e)
    },
    [chartSetting, ee]
  )

  const settingsProps = useMemo<SettingsProps>(
    () => ({
      ...DEFAULT_CHART_SETTINGS,
      ...chartSetting,
      animateData:
        chartSetting?.animateData ?? DEFAULT_CHART_SETTINGS.animateData,
      pointerUpdateDebounce:
        chartSetting?.pointerUpdateDebounce ??
        DEFAULT_CHART_SETTINGS.pointerUpdateDebounce,
      onPointerUpdate: handlePointerUpdate,
      onBrushEnd: ev => {
        handleBrushEnd(ev)
        chartSetting?.onBrushEnd?.(ev)
      },
      onLegendItemClick: ev => {
        handleLegendItemClick(ev)
        chartSetting?.onLegendItemClick?.(ev)
      },
      xDomain: {
        ...chartSetting?.xDomain,
        min: range[0] * 1000,
        max: range[1] * 1000,
        minInterval:
          fixMinInterval && data ? data.meta.queryOptions.step * 1000 : undefined,
      },
    }),
    [
      chartSetting,
      data,
      fixMinInterval,
      handleBrushEnd,
      handleLegendItemClick,
      handlePointerUpdate,
      range,
    ]
  )

  const xAxisTickFormat = useMemo(
    () => xAxisFormat ?? timeTickFormatter(range),
    [range, xAxisFormat]
  )
  const valueFormatter = useMemo(() => getValueFormat(unit || 'none'), [unit])
  const defaultYAxisTickFormat = useCallback(
    v => {
      const currentUnit = unit || 'none'
      if (TO_PRECISION_UNITS.has(currentUnit) && v < 1) {
        return v.toPrecision(3)
      }
      return valueFormatter(v, 2)
    },
    [unit, valueFormatter]
  )

  const xAxisProps = useMemo(
    () => ({
      id: 'bottom',
      position: Position.Bottom,
      tickFormat: xAxisTickFormat,
      ticks: 7,
      domain: xAxisDomain,
    }),
    [xAxisDomain, xAxisTickFormat]
  )
  const yAxisProps = useMemo(
    () => ({
      id: 'left',
      position: Position.Left,
      domain: yAxisDomain,
      tickFormat: yAxisFormat ?? defaultYAxisTickFormat,
      ticks: 5,
    }),
    [defaultYAxisTickFormat, yAxisDomain, yAxisFormat]
  )
  const chartSize = useMemo(() => ({ height }), [height])
  const placeholderData = useMemo<[number, null][]>(
    () =>
      data
        ? [
            [data.meta.queryOptions.start * 1000, null],
            [data.meta.queryOptions.end * 1000, null],
          ]
        : [],
    [data]
  )

  return (
    <div ref={chartContainerRef}>
      {isLoading && loadingComponent ? (
        <div style={{ height }}>{loadingComponent()}</div>
      ) : error && errorComponent ? (
        <div style={{ height }}>{errorComponent(error)}</div>
      ) : !data.values.length && !!noDataComponent ? (
        <div style={{ height }}>{noDataComponent}</div>
      ) : (
        <Chart size={chartSize} ref={chartRef}>
          <MemoizedSettings {...settingsProps} />
          <MemoizedAxis {...xAxisProps} />
          <MemoizedAxis {...yAxisProps} />
          {children}
          {data?.values.map(qd => (
            <QuerySeries
              key={qd.id}
              qd={qd}
              xAxisNice={xAxisNice}
              yAxisNice={yAxisNice}
            />
          ))}
          {data && (
            <PlaceholderSeries
              data={placeholderData}
              xAxisNice={xAxisNice}
              yAxisNice={yAxisNice}
            />
          )}
        </Chart>
      )}
    </div>
  )
}

export default MetricsChart
