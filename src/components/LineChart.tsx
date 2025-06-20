/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { TrainingLogData } from '@/types/training-log'
import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface LineChartProps {
  data: TrainingLogData[]
}

export default function LineChart({ data }: LineChartProps) {
  // Find max epoch safely without spread operator
  const maxEpoch = data.length > 0 ? data.reduce((max, item) => Math.max(max, item.epoch), 0) : 0
  
  // Get unique epochs and filter to reasonable subset (max 100 epochs)
  const allEpochs = Array.from(new Set(data.map(item => item.epoch))).sort((a, b) => a - b)
  const epochStep = Math.max(1, Math.floor(allEpochs.length / 100))
  const selectedEpochs = allEpochs.filter((_, index) => index % epochStep === 0 || allEpochs[index] === maxEpoch)
  
  // Filter data to only include selected epochs
  const filteredData = data.filter(item => selectedEpochs.includes(item.epoch))
  
  const metrics = Array.from(new Set(filteredData.map(item => item.metric)))
  const [selectedMetric, setSelectedMetric] = useState(metrics[0] || '')
  const [selectedLocation, setSelectedLocation] = useState('')
  
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Metric Over Time</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  const metricData = filteredData.filter(item => item.metric === selectedMetric)
  const locations = Array.from(new Set(metricData.map(item => item.name))).sort()
  
  const chartData = selectedLocation 
    ? metricData.filter(item => item.name === selectedLocation).sort((a, b) => a.epoch - b.epoch)
    : []

  const formatValue = (value: number) => {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B'
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
    return value.toFixed(0)
  }

  return (
    <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Metric Over Time</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
          <select 
            value={selectedMetric}
            onChange={(e) => {
              setSelectedMetric(e.target.value)
              setSelectedLocation('')
            }}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            {metrics.map(metric => (
              <option key={metric} value={metric}>
                {metric.replace('hmrc/', '')}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
            disabled={!selectedMetric}
          >
            <option value="">Select a location...</option>
            {locations.map(location => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="relative">
          <div className="h-96 w-full">
            <Plot
              data={[
                {
                  x: chartData.map(d => d.epoch) as any,
                  y: chartData.map(d => d.estimate) as any,
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  name: 'Estimate',
                  line: { color: '#3b82f6', width: 3 },
                  marker: { color: '#3b82f6', size: 6 }
                } as any,
                {
                  x: chartData.map(d => d.epoch) as any,
                  y: chartData.map(d => d.target) as any,
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  name: 'Target',
                  line: { color: '#ef4444', width: 3, dash: 'dash' },
                  marker: { color: '#ef4444', size: 6 }
                } as any
              ] as any}
              layout={{
                width: undefined,
                height: 400,
                autosize: true,
                margin: { l: 60, r: 20, t: 40, b: 60 },
                font: { family: 'JetBrains Mono, monospace', size: 12 },
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(0,0,0,0)',
                xaxis: {
                  title: 'Epoch',
                  gridcolor: '#e5e7eb',
                  zeroline: false
                },
                yaxis: {
                  title: selectedMetric.replace('hmrc/', ''),
                  gridcolor: '#e5e7eb',
                  zeroline: false,
                  tickformat: '.2s'
                },
                legend: {
                  x: 0,
                  y: 1,
                  bgcolor: 'rgba(255,255,255,0.8)'
                },
                hovermode: 'x unified'
              } as any}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
                responsive: true
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          
          {chartData.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded text-sm font-mono">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-600">Location:</span>
                  <span className="font-semibold ml-2 block text-xs">{selectedLocation}</span>
                </div>
                <div>
                  <span className="text-gray-600">Latest Estimate:</span>
                  <span className="font-semibold ml-2 block">
                    {formatValue(chartData[chartData.length - 1].estimate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Target:</span>
                  <span className="font-semibold ml-2 block">
                    {formatValue(chartData[chartData.length - 1].target)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Rel. Error:</span>
                  <span className={`font-semibold ml-2 block ${
                    chartData[chartData.length - 1].rel_abs_error < 0.05 ? 'text-green-600' : 
                    chartData[chartData.length - 1].rel_abs_error < 0.20 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(chartData[chartData.length - 1].rel_abs_error * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-96 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-gray-500">
          {selectedMetric ? 'Select a location to view the chart' : 'Select a metric to get started'}
        </div>
      )}
    </div>
  )
}