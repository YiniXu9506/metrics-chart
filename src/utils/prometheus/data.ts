// Copyright Grafana. Licensed under Apache-2.0.

// Extracted from:
// https://github.com/grafana/grafana/blob/c986aaa0a8e7fb167b9d10304129f6aea85ad45c/public/app/plugins/datasource/prometheus/result_transformer.ts

import { DEFAULT_MIN_INTERVAL_SEC } from '.'
import { isMatrixData, MatrixOrVectorResult } from './types'

import {
  DataPoint,
  QueryOptions,
  TimeRangeValue,
  TransformNullValue,
} from '../../MetricChart/interfaces'

const POSITIVE_INFINITY_SAMPLE_VALUE = '+Inf'
const NEGATIVE_INFINITY_SAMPLE_VALUE = '-Inf'

function parseSampleValue(value: string): number {
  switch (value) {
    case POSITIVE_INFINITY_SAMPLE_VALUE:
      return Number.POSITIVE_INFINITY
    case NEGATIVE_INFINITY_SAMPLE_VALUE:
      return Number.NEGATIVE_INFINITY
    default:
      return parseFloat(value)
  }
}

function normalizeValue(
  value: number | null,
  nullValue: TransformNullValue
): number | null {
  return value === null && nullValue === TransformNullValue.AS_ZERO ? 0 : value
}

function fillNullPoints(
  dps: DataPoint[],
  startMs: number,
  endExclusiveMs: number,
  stepMs: number,
  rangeStartMs: number,
  rangeEndMs: number,
  nullValue: TransformNullValue
) {
  if (startMs >= endExclusiveMs) {
    return
  }

  const visibleEndExclusiveMs = Math.min(endExclusiveMs, rangeEndMs + stepMs)
  if (visibleEndExclusiveMs <= rangeStartMs) {
    return
  }

  let firstTimestamp = startMs
  if (rangeStartMs > startMs) {
    const skippedSteps = Math.ceil((rangeStartMs - startMs) / stepMs)
    firstTimestamp = startMs + skippedSteps * stepMs
  }

  for (let t = firstTimestamp; t < visibleEndExclusiveMs; t += stepMs) {
    dps.push([t, normalizeValue(null, nullValue)])
  }
}

export function processRawData(
  data: MatrixOrVectorResult,
  options: QueryOptions,
  range: TimeRangeValue = [options.start * 1000, options.end * 1000],
  nullValue: TransformNullValue = TransformNullValue.NULL
): DataPoint[] | null {
  if (isMatrixData(data)) {
    const stepMs = options.step ? options.step * 1000 : NaN
    let baseTimestamp = options.start * 1000
    const dps: DataPoint[] = []
    const [rangeStartMs, rangeEndMs] = range

    for (const value of data.values) {
      let dpValue: number | null = parseSampleValue(value[1])

      if (isNaN(dpValue)) {
        dpValue = null
      }

      const timestamp = value[0] * 1000
      fillNullPoints(
        dps,
        baseTimestamp,
        timestamp,
        stepMs,
        rangeStartMs,
        rangeEndMs,
        nullValue
      )
      baseTimestamp = timestamp + stepMs

      if (timestamp >= rangeStartMs && timestamp <= rangeEndMs) {
        dps.push([timestamp, normalizeValue(dpValue, nullValue)])
      }
    }

    const endTimestamp = options.end * 1000
    fillNullPoints(
      dps,
      baseTimestamp,
      endTimestamp + stepMs,
      stepMs,
      rangeStartMs,
      rangeEndMs,
      nullValue
    )

    return dps
  }
  return null
}

export function resolveQueryTemplate(
  template: string,
  options: QueryOptions
): string {
  return template.replace(
    /\$__rate_interval/g,
    `${Math.max(options.step, 4 * DEFAULT_MIN_INTERVAL_SEC)}s`
  )
}
