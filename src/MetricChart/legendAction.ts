// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import { LegendPath, SeriesIdentifier } from '@elastic/charts'

// HACK: Use elastic-charts internal api for the legend hover
// sync with https://github.com/elastic/elastic-charts/blob/master/packages/charts/src/state/actions/legend.ts

export const ON_TOGGLE_DESELECT_SERIES = 'ON_TOGGLE_DESELECT_SERIES'


export interface ToggleDeselectSeriesAction {
  type: typeof ON_TOGGLE_DESELECT_SERIES
  legendItemIds: SeriesIdentifier[]
  negate: boolean
}

export function onToggleDeselectSeriesAction(
  legendItemIds: SeriesIdentifier[],
  negate = true
): ToggleDeselectSeriesAction {
  return { type: ON_TOGGLE_DESELECT_SERIES, legendItemIds, negate }
}

let prevSelectedId

export const onToggleDeselectSeries = (chart, selectedSeriesId) => {
  const legendItems = chart.chartStore
    .getState()
    .internalChartState.getLegendItems(chart.chartStore.getState())

  if (!legendItems?.length) {
    return
  }

  const selectedItem = legendItems.find((it) => {
    return it.seriesIdentifiers[0].specId === selectedSeriesId
  })
  if (!selectedItem) {
    return
  }

  const selectedItemSeriesIdentifier = [
    {
      specId: selectedItem.seriesIdentifiers[0].specId,
      key: selectedItem.seriesIdentifiers[0].key
    }
  ]

  setTimeout(() => {
    if (prevSelectedId === selectedSeriesId) {
      const legendItemIds = legendItems.map((i) => {
        return {
          specId: i.seriesIdentifiers[0].specId,
          key: i.seriesIdentifiers[0].key
        }
      })
      chart.chartStore.dispatch(
        onToggleDeselectSeriesAction(legendItemIds)
      )
      prevSelectedId = null
      return
    }

    prevSelectedId = selectedSeriesId
    chart.chartStore.dispatch(onToggleDeselectSeriesAction(selectedItemSeriesIdentifier))
  })
}
