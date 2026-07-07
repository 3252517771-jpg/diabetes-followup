import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

import type { GlucoseTrendPoint } from '../../types/glucose'

interface GlucoseTrendChartProps {
  points: GlucoseTrendPoint[]
}

export function GlucoseTrendChart({ points }: GlucoseTrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2563eb', '#16a34a', '#f59e0b', '#737373'],
      grid: { top: 24, right: 18, bottom: 28, left: 38 },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((item) => item.date.slice(5)),
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'mmol/L',
        min: 0,
        splitLine: { lineStyle: { color: '#eeeeee' } },
      },
      series: [
        { name: '空腹', type: 'line', smooth: true, data: points.map((item) => item.fasting_avg) },
        {
          name: '餐后',
          type: 'line',
          smooth: true,
          data: points.map((item) => item.postprandial_avg),
        },
        { name: '睡前', type: 'line', smooth: true, data: points.map((item) => item.bedtime_avg) },
        { name: '随机', type: 'line', smooth: true, data: points.map((item) => item.random_avg) },
      ],
    })

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [points])

  return <div ref={chartRef} className="glucose-chart" />
}
