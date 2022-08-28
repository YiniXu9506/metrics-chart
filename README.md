# Metrics Chart

A chart based on [elastic chart](https://github.com/elastic/elastic-charts) visualize promethues data.

## How To Install

npm install -S metrics-chart

## How To Use

### Sync cross hair for each metrics chart on `PointerEvent` triggered

```
import { MetricsChart, SyncChartContext } from 'metrics-chart'

<SyncChartContext>
    {metricsList.map((metrics) => (
        <MetricsChart
            queries={m.metrics}
            range={range}
            ...
        />
    ))}
</SyncChartContext>
```

### Use metrics chart without event sync

```
import { MetricsChart } from 'metrics-chart'

<>
    {metricsList.map((metrics) => (
        <MetricsChart
            queries={m.metrics}
            range={range}
            ...
        />
    ))}
</>

```
