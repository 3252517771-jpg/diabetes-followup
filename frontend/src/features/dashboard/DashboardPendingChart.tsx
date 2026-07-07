import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

import type { DashboardPendingItem } from '../../types/dashboard'

interface DashboardPendingChartProps {
  items: DashboardPendingItem[]
}

export function DashboardPendingChart({ items }: DashboardPendingChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2563eb'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 12, right: 12, bottom: 12, left: 84 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#ececec' } },
      },
      yAxis: {
        type: 'category',
        axisTick: { show: false },
        data: items.map((item) => item.label),
      },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          borderRadius: 6,
          data: items.map((item) => item.count),
          label: { show: true, position: 'right' },
        },
      ],
    })

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [items])

  return <div ref={chartRef} className="dashboard-chart dashboard-chart--compact" />
}
