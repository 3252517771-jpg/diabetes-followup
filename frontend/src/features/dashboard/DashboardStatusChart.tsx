import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

import type { DashboardDistributionItem } from '../../types/dashboard'

interface DashboardStatusChartProps {
  items: DashboardDistributionItem[]
}

export function DashboardStatusChart({ items }: DashboardStatusChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10 },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '45%'],
          label: { formatter: '{b}\n{c}' },
          data: items.map((item) => ({
            name: item.status,
            value: item.count,
          })),
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
