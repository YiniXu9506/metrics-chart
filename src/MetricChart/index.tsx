import React, { useRef, useState } from "react"
import {
  TimeRangeValue,
  IQueryOption,
  GraphType,
  TransformNullValue,
  MetricsQueryResponse,
  QueryOptions,
  QueryData,
} from "./types"
import {
  processRawData,
  PromMatrixData,
  resolveQueryTemplate,
} from "../utils/prometheus"
import { AxiosPromise } from "axios"
import { Chart, Settings, Position, Axis } from "@elastic/charts"

import { getValueFormat } from "@baurine/grafana-value-formats"

import {
  alignRange,
  DEFAULT_CHART_SETTINGS,
  timeTickFormatter,
  useChartHandle,
} from "../utils/charts"

import { useChange } from "../utils/useChange"

import { renderQueryData } from "./seriesRenderer"

export interface IMetricChartProps {
  queries: IQueryOption[]
  range: TimeRangeValue
  unit?: string
  type: GraphType
  nullValue?: TransformNullValue
  height?: number
  onBrush?: (newRange: TimeRangeValue) => void
  onError: (err: Error | null) => void
  fetchPromeData: (params: {
    endTimeSec: number
    query: string
    startTimeSec: number
    stepSec: number
  }) => AxiosPromise<MetricsQueryResponse>
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
  type,
  nullValue = TransformNullValue.NULL,
  height = 200,
  onBrush,
  onError,
  fetchPromeData,
}: IMetricChartProps) => {
  const chartRef = useRef<Chart>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartHandle] = useChartHandle(chartContainerRef, 150)
  const [data, setData] = useState<Data | null>(null)

  useChange(() => {
    const interval = chartHandle.calcIntervalSec(range)
    const rangeSnapshot = alignRange(range, interval) // Align the range according to calculated interval
    const queryOptions: QueryOptions = {
      start: rangeSnapshot[0],
      end: rangeSnapshot[1],
      step: interval,
    }

    async function queryMetric(
      queryTemplate: string,
      fillIdx: number,
      fillInto: (PromMatrixData | null)[]
    ) {
      const query = resolveQueryTemplate(queryTemplate, queryOptions)
      const pramas = {
        endTimeSec: queryOptions.end,
        query: query,
        startTimeSec: queryOptions.start,
        stepSec: queryOptions.step,
      }
      try {
        const resp = await fetchPromeData(pramas)
        let data: PromMatrixData | null = null
        if (resp.data.status === "success") {
          data = resp.data.data as any
          if (data?.resultType !== "matrix") {
            // unsupported
            data = null
          }
        }
        fillInto[fillIdx] = data
      } catch (e) {
        fillInto[fillIdx] = null
        onError(e)
      }
    }

    async function queryAllMetrics() {
      const dataSets: (PromMatrixData | null)[] = []
      try {
        await Promise.all(
          queries.map((q, idx) => queryMetric(q.promql, idx, dataSets))
        )
      } finally {
        // setLoading(false);
      }

      // Transform response into data
      const sd: QueryData[] = []
      dataSets.forEach((data, queryIdx) => {
        if (!data) {
          return
        }
        data.result.forEach((promResult, seriesIdx) => {
          const data = processRawData(promResult, queryOptions)
          if (data === null) {
            return
          }

          // transform data according to nullValue config
          const transformedData =
            nullValue === TransformNullValue.AS_ZERO
              ? data.map((d) => {
                  if (d[1] !== null) {
                    return d
                  }
                  d[1] = 0
                  return d
                })
              : data

          const d: QueryData = {
            id: `${queryIdx}_${seriesIdx}`,
            name: format(queries[queryIdx].name, promResult.metric),
            data: transformedData,
            type: queries[queryIdx].type,
          }
          const colorOrFn = queries[queryIdx].color

          d.color = typeof colorOrFn === "function" ? colorOrFn(d) : colorOrFn
          sd.push(d)
        })
      })
      setData({
        meta: {
          queryOptions,
        },
        values: sd,
      })
    }

    queryAllMetrics()
  }, [range])

  let inner = null

  inner = (
    <>
      <Chart size={{ height }} ref={chartRef}>
        <Settings
          {...DEFAULT_CHART_SETTINGS}
          legendPosition={Position.Right}
          legendSize={130}
          pointerUpdateDebounce={0}
          xDomain={{ min: range[0] * 1000, max: range[1] * 1000 }}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={timeTickFormatter(range)}
        />
        <Axis
          id="left"
          position={Position.Left}
          showOverlappingTicks
          tickFormat={(v) =>
            unit ? getValueFormat(unit)(v, 1) : getValueFormat("none")(v)
          }
          ticks={5}
        />
        {data?.values.map((qd) => renderQueryData(type, qd))}
      </Chart>
    </>
  )

  return <div ref={chartContainerRef}>{inner}</div>
}

export default MetricsChart
