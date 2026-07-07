import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface DailyRecordChartProps {
  items: Array<{ date: string; count: number }>
}

export function DailyRecordChart({ items }: DailyRecordChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2563eb'],
      grid: { top: 18, right: 12, bottom: 24, left: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: items.map((item) => item.date.slice(5)),
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#eeeeee' } },
      },
      series: [
        {
          name: '记录数',
          type: 'bar',
          barWidth: 18,
          data: items.map((item) => item.count),
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

  return <div ref={chartRef} className="glucose-chart glucose-chart--compact" />
}
