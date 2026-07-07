import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

import type { DashboardTrendPoint } from '../../types/dashboard'

interface DashboardTrendChartProps {
  points: DashboardTrendPoint[]
}

export function DashboardTrendChart({ points }: DashboardTrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2563eb', '#16a34a'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10 },
      grid: { top: 42, right: 18, bottom: 24, left: 42 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisTick: { show: false },
        data: points.map((item) => item.date.slice(5)),
      },
      yAxis: {
        type: 'value',
        name: 'mmol/L',
        splitLine: { lineStyle: { color: '#ececec' } },
      },
      series: [
        {
          name: '空腹均值',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: { color: 'rgba(37, 99, 235, 0.08)' },
          data: points.map((item) => item.fasting_avg),
        },
        {
          name: '餐后均值',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: { color: 'rgba(22, 163, 74, 0.08)' },
          data: points.map((item) => item.postprandial_avg),
        },
      ],
    })

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [points])

  return <div ref={chartRef} className="dashboard-chart" />
}
