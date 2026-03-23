import React, { useEffect, useMemo, useState } from 'react'

import { MetricsChart } from '../src'
import { SyncChartPointer } from '../src/MetricChart/SyncChartPointerContext'
import { MetricsChartTheme } from '../src/theme'

const FIXED_END_TIME_SEC = 1710000000

function buildRange(pointsPerSeries, stepSec) {
  const safePoints = Math.max(pointsPerSeries, 2)
  const safeStep = Math.max(stepSec, 1)
  return [FIXED_END_TIME_SEC - safeStep * (safePoints - 1), FIXED_END_TIME_SEC]
}

function buildQueries(queryCount) {
  return Array.from({ length: queryCount }, (_, queryIdx) => ({
    promql: `mock_metric_q${queryIdx}`,
    name: `query-${queryIdx} / {instance}`,
    type: 'line',
    color: seriesName => {
      const palette = [
        '#3274D9',
        '#E02F44',
        '#56A64B',
        '#FF9830',
        '#8F3BB8',
        '#0A7E8C',
      ]
      return palette[hashString(seriesName) % palette.length]
    },
  }))
}

function hashString(input) {
  let hash = 0
  for (let idx = 0; idx < input.length; idx += 1) {
    hash = (hash * 31 + input.charCodeAt(idx)) >>> 0
  }
  return hash
}

function createMockFetcher(seriesPerQuery, missingEvery, valueMode = 'mixed') {
  const cache = new Map()

  return async ({ endTimeSec, query, startTimeSec, stepSec }) => {
    const cacheKey = [
      query,
      startTimeSec,
      endTimeSec,
      stepSec,
      seriesPerQuery,
      missingEvery,
      valueMode,
    ].join(':')

    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const queryMatch = query.match(/q(\d+)/)
    const queryIdx = queryMatch ? Number(queryMatch[1]) : 0
    const result = []

    for (let seriesIdx = 0; seriesIdx < seriesPerQuery; seriesIdx += 1) {
      result.push({
        metric: {
          __name__: `mock_metric_${queryIdx}`,
          instance: `instance-${seriesIdx}`,
          job: `job-${queryIdx % 4}`,
        },
        values: buildSeriesValues(
          queryIdx,
          seriesIdx,
          startTimeSec,
          endTimeSec,
          stepSec,
          missingEvery,
          valueMode
        ),
      })
    }

    const response = {
      status: 'success',
      data: {
        resultType: 'matrix',
        result,
      },
    }
    cache.set(cacheKey, response)
    return response
  }
}

function createEmptyMockFetcher() {
  return async () => ({
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [],
    },
  })
}

function buildSeriesValues(
  queryIdx,
  seriesIdx,
  startTimeSec,
  endTimeSec,
  stepSec,
  missingEvery,
  valueMode
) {
  const values = []
  let pointIdx = 0
  for (let ts = startTimeSec; ts <= endTimeSec; ts += stepSec) {
    if (missingEvery > 0 && pointIdx > 0 && pointIdx % missingEvery === 0) {
      pointIdx += 1
      continue
    }

    let value
    if (valueMode === 'positive') {
      const base = 4 + queryIdx * 10 + seriesIdx * 1.25
      const wave =
        Math.abs(Math.sin(pointIdx / (4 + queryIdx))) * 18 +
        Math.abs(Math.cos(pointIdx / (6 + seriesIdx))) * 6
      const drift = 1 + pointIdx * 0.03
      value = base + wave + drift
    } else {
      const base = queryIdx * 12 + seriesIdx * 1.5
      const wave =
        Math.sin(pointIdx / (5 + queryIdx)) * 8 +
        Math.cos(pointIdx / (7 + seriesIdx)) * 3
      const drift = pointIdx * 0.015
      value = base + wave + drift
    }

    values.push([ts, String(Number(value.toFixed(3)))])
    pointIdx += 1
  }
  return values
}

function StressHarness({
  animateData,
  chartCount,
  height,
  missingEvery,
  parentRerenderMs,
  pointsPerSeries,
  queryCount,
  renderCommitDelayMs,
  renderMode,
  seriesPerQuery,
  stepSec,
}) {
  const [renderTick, setRenderTick] = useState(0)

  useEffect(() => {
    if (!parentRerenderMs) {
      return undefined
    }
    const timer = window.setInterval(() => {
      setRenderTick(prev => prev + 1)
    }, parentRerenderMs)
    return () => window.clearInterval(timer)
  }, [parentRerenderMs])

  const range = useMemo(
    () => buildRange(pointsPerSeries, stepSec),
    [pointsPerSeries, stepSec]
  )
  const queries = useMemo(() => buildQueries(queryCount), [queryCount])
  const fetchPromeData = useMemo(
    () => createMockFetcher(seriesPerQuery, missingEvery),
    [missingEvery, seriesPerQuery]
  )
  const chartSetting = useMemo(
    () => ({
      animateData,
      showLegend: true,
      legendSize: 160,
      xDomain: {
        minInterval: stepSec * 1000,
      },
    }),
    [animateData, stepSec]
  )

  const charts = useMemo(
    () =>
      Array.from({ length: chartCount }, (_, chartIdx) => (
        <div
          key={`chart-${chartIdx}`}
          style={{
            border: '1px solid rgba(50, 116, 217, 0.12)',
            borderRadius: 18,
            background: '#fff',
            boxShadow: '0 14px 36px rgba(18, 52, 86, 0.08)',
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              fontFamily: 'Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              color: '#47607a',
            }}
          >
            <span>Chart {chartIdx + 1}</span>
            <span>
              {queryCount * seriesPerQuery} series / about{' '}
              {queryCount * seriesPerQuery * pointsPerSeries} raw points
            </span>
          </div>
          <MetricsChart
            queries={queries}
            range={range}
            height={height}
            unit="none"
            fetchPromeData={fetchPromeData}
            chartSetting={chartSetting}
            noDataComponent={<div>No data</div>}
            renderMode={renderMode}
            renderCommitDelayMs={renderCommitDelayMs}
          />
        </div>
      )),
    [
      chartCount,
      chartSetting,
      fetchPromeData,
      height,
      pointsPerSeries,
      queries,
      queryCount,
      range,
      renderCommitDelayMs,
      renderMode,
      seriesPerQuery,
    ]
  )

  return (
    <MetricsChartTheme value="light">
      <SyncChartPointer>
        <div
          style={{
            display: 'grid',
            gap: 16,
          }}
        >
          <section
            style={{
              background: '#0f2740',
              color: '#dbe8f8',
              borderRadius: 18,
              padding: 20,
              fontFamily: 'Menlo, Monaco, Consolas, monospace',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 12, color: '#ffffff' }}>
              MetricsChart Stress Lab
            </div>
            <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
              <div>
                {chartCount} charts, {queryCount} queries per chart,{' '}
                {seriesPerQuery} series per query
              </div>
              <div>
                Approx raw points per chart:{' '}
                {queryCount * seriesPerQuery * pointsPerSeries}
              </div>
              <div>
                Range: {new Date(range[0] * 1000).toISOString()} to{' '}
                {new Date(range[1] * 1000).toISOString()}
              </div>
              <div>
                Step: {stepSec}s, missing every {missingEvery || 'never'} points,
                parent rerender every {parentRerenderMs || 'off'} ms
              </div>
              <div>
                Render mode: {renderMode}, commit delay:{' '}
                {renderCommitDelayMs} ms
              </div>
              <div>Parent render tick: {renderTick}</div>
            </div>
          </section>
          {charts}
        </div>
      </SyncChartPointer>
    </MetricsChartTheme>
  )
}

function EmptyStateHarness() {
  const range = useMemo(() => buildRange(300, 30), [])
  const queries = useMemo(() => buildQueries(1), [])
  const fetchPromeData = useMemo(() => createEmptyMockFetcher(), [])

  return (
    <MetricsChartTheme value="light">
      <div
        style={{
          border: '1px solid rgba(50, 116, 217, 0.12)',
          borderRadius: 18,
          background: '#fff',
          boxShadow: '0 14px 36px rgba(18, 52, 86, 0.08)',
          padding: 16,
        }}
      >
        <MetricsChart
          queries={queries}
          range={range}
          height={260}
          unit="none"
          fetchPromeData={fetchPromeData}
          noDataComponent={
            <div
              style={{
                height: 260,
                display: 'grid',
                placeItems: 'center',
                color: '#6b7c93',
                fontFamily: 'Menlo, Monaco, Consolas, monospace',
                fontSize: 14,
                background:
                  'linear-gradient(180deg, rgba(245,249,255,0.9) 0%, rgba(236,243,252,0.95) 100%)',
                borderRadius: 12,
              }}
            >
              No data
            </div>
          }
        />
      </div>
    </MetricsChartTheme>
  )
}

function PlaceholderHarness() {
  const range = useMemo(() => buildRange(300, 30), [])
  const queries = useMemo(() => buildQueries(1), [])
  const fetchPromeData = useMemo(() => createEmptyMockFetcher(), [])

  return (
    <MetricsChartTheme value="light">
      <div
        style={{
          border: '1px solid rgba(50, 116, 217, 0.12)',
          borderRadius: 18,
          background: '#fff',
          boxShadow: '0 14px 36px rgba(18, 52, 86, 0.08)',
          padding: 16,
        }}
      >
        <MetricsChart
          queries={queries}
          range={range}
          height={260}
          unit="none"
          fetchPromeData={fetchPromeData}
        />
      </div>
    </MetricsChartTheme>
  )
}

function ScaleHarness({ yAxisScaleType, logBase }) {
  const range = useMemo(() => buildRange(240, 60), [])
  const queries = useMemo(() => buildQueries(2), [])
  const fetchPromeData = useMemo(() => createMockFetcher(4, 0, 'positive'), [])
  const chartSetting = useMemo(
    () => ({
      showLegend: true,
      legendSize: 160,
      xDomain: {
        minInterval: 60 * 1000,
      },
    }),
    []
  )

  return (
    <MetricsChartTheme value="light">
      <div
        style={{
          border: '1px solid rgba(50, 116, 217, 0.12)',
          borderRadius: 18,
          background: '#fff',
          boxShadow: '0 14px 36px rgba(18, 52, 86, 0.08)',
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            fontFamily: 'Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            color: '#47607a',
          }}
        >
          <span>Y Axis Scale Demo</span>
          <span>
            scale: {yAxisScaleType}, log base: {logBase}
          </span>
        </div>
        <MetricsChart
          queries={queries}
          range={range}
          height={320}
          unit="short"
          fetchPromeData={fetchPromeData}
          chartSetting={chartSetting}
          yAxisScaleType={yAxisScaleType}
          logBase={logBase}
        />
      </div>
    </MetricsChartTheme>
  )
}

export default {
  title: 'Stress/MetricsChart',
  component: StressHarness,
  parameters: {
    controls: {
      sort: 'requiredFirst',
    },
  },
  args: {
    animateData: true,
    chartCount: 2,
    queryCount: 4,
    seriesPerQuery: 12,
    pointsPerSeries: 2500,
    stepSec: 30,
    missingEvery: 31,
    height: 260,
    parentRerenderMs: 0,
    renderMode: 'immediate',
    renderCommitDelayMs: 24,
  },
  argTypes: {
    animateData: { control: 'boolean' },
    chartCount: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    queryCount: { control: { type: 'range', min: 1, max: 8, step: 1 } },
    seriesPerQuery: { control: { type: 'range', min: 1, max: 256, step: 1 } },
    pointsPerSeries: {
      control: { type: 'range', min: 200, max: 6000, step: 100 },
    },
    stepSec: { control: { type: 'range', min: 1, max: 120, step: 1 } },
    missingEvery: { control: { type: 'range', min: 0, max: 120, step: 1 } },
    height: { control: { type: 'range', min: 160, max: 420, step: 10 } },
    parentRerenderMs: {
      control: { type: 'range', min: 0, max: 2000, step: 100 },
    },
    renderMode: {
      control: { type: 'inline-radio' },
      options: ['immediate', 'serialized'],
    },
    renderCommitDelayMs: {
      control: { type: 'range', min: 0, max: 200, step: 4 },
    },
  },
}

export const Default = {}

export const Extreme = {
  args: {
    chartCount: 3,
    queryCount: 6,
    seriesPerQuery: 20,
    pointsPerSeries: 4000,
    stepSec: 15,
    missingEvery: 0,
    height: 300,
  },
}

export const ParentRerenderPressure = {
  args: {
    chartCount: 2,
    queryCount: 4,
    seriesPerQuery: 10,
    pointsPerSeries: 2000,
    stepSec: 30,
    missingEvery: 17,
    parentRerenderMs: 500,
  },
}

export const SerializedCommit = {
  args: {
    chartCount: 3,
    queryCount: 6,
    seriesPerQuery: 16,
    pointsPerSeries: 3000,
    stepSec: 15,
    missingEvery: 0,
    renderMode: 'serialized',
    renderCommitDelayMs: 32,
  },
}

export const TenCharts128Series300Points = {
  args: {
    chartCount: 10,
    queryCount: 1,
    seriesPerQuery: 128,
    pointsPerSeries: 300,
    stepSec: 30,
    missingEvery: 0,
    height: 220,
    renderMode: 'serialized',
    renderCommitDelayMs: 16,
  },
}

export const EmptyState = {
  render: () => <EmptyStateHarness />,
}

export const PlaceholderOnly = {
  render: () => <PlaceholderHarness />,
}

export const YAxisScale = {
  render: args => <ScaleHarness {...args} />,
  args: {
    yAxisScaleType: 'linear',
    logBase: 'base10',
  },
  argTypes: {
    yAxisScaleType: {
      control: { type: 'inline-radio' },
      options: ['linear', 'log'],
    },
    logBase: {
      control: { type: 'inline-radio' },
      options: ['base10', 'base2', 'baseE'],
    },
  },
}
