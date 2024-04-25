# Metrics Chart

A chart based on [elastic chart](https://github.com/elastic/elastic-charts) visualize promethues data.

## How To Install

npm install -S metrics-chart

## How To Use

### Sync cross hair for each metrics chart on `PointerEvent` triggered

```
import { MetricsChart, SyncChartContext } from 'metrics-chart'
import { MetricsChartTheme } from 'metrics-chart/theme'

<MetricsChartTheme value="light">
    <SyncChartPointer>
        {metricsList.map((metrics) => (
            <MetricsChart
                queries={m.metrics}
                range={range}
                ...
            />
        ))}
    </SyncChartPointer>
</MetricsChartTheme>
```

## How to Publish Package

```
npm install
npm run build
npm publish --access public
```
