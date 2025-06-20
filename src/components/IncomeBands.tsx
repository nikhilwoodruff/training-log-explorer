/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { TrainingLogData } from '@/types/training-log'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface IncomeBandsProps {
  data: TrainingLogData[]
}

interface IncomeBand {
  bandNumber: number
  range: string
  lowerBound: number
  upperBound: number | null
  displayRange: string
}

interface IncomeBandData {
  band: IncomeBand
  estimate: number
  target: number
  error: number
  rel_abs_error: number
}

export default function IncomeBands({ data }: IncomeBandsProps) {
  // Find max epoch safely without spread operator
  const maxEpoch = data.length > 0 ? data.reduce((max, item) => Math.max(max, item.epoch), 0) : 0
  
  // Get unique epochs and filter to reasonable subset (max 100 epochs)
  const allEpochs = Array.from(new Set(data.map(item => item.epoch))).sort((a, b) => a - b)
  const epochStep = Math.max(1, Math.floor(allEpochs.length / 100))
  const selectedEpochs = allEpochs.filter((_, index) => index % epochStep === 0 || allEpochs[index] === maxEpoch)
  
  // Filter data to only include selected epochs
  const filteredData = data.filter(item => selectedEpochs.includes(item.epoch))
  const latestData = filteredData.filter(item => item.epoch === maxEpoch)

  // Extract income sources
  const incomeSourcesSet = new Set<string>()
  latestData.forEach(item => {
    const metric = item.metric
    if (metric.includes('income_band_')) {
      const parts = metric.split('/')
      if (parts.length >= 2) {
        const metricPart = parts[1]
        // Extract income source (everything before _income_band or _count_income_band)
        const match = metricPart.match(/^(.+?)_(?:count_)?income_band_/)
        if (match) {
          incomeSourcesSet.add(match[1])
        }
      }
    }
  })
  
  const incomeSources = Array.from(incomeSourcesSet).sort()
  
  const [selectedSource, setSelectedSource] = useState(incomeSources[0] || '')
  const [metricType, setMetricType] = useState<'amount' | 'count'>('amount')
  const [viewType, setViewType] = useState<'absolute' | 'relative'>('absolute')

  // Parse income bands and create structured data
  const parseBand = (bandString: string): IncomeBand | null => {
    const match = bandString.match(/income_band_(\d+)_(.+)/)
    if (!match) return null
    
    const bandNumber = parseInt(match[1])
    const range = match[2]
    const [lowerStr, upperStr] = range.split('_to_')
    
    const lowerBound = parseFloat(lowerStr.replace(/_/g, ''))
    const upperBound = upperStr === 'inf' ? null : parseFloat(upperStr.replace(/_/g, ''))
    
    let displayRange: string
    if (upperBound === null) {
      displayRange = `£${lowerBound.toLocaleString()}+`
    } else {
      displayRange = `£${lowerBound.toLocaleString()} - £${upperBound.toLocaleString()}`
    }
    
    return {
      bandNumber,
      range,
      lowerBound,
      upperBound,
      displayRange
    }
  }

  const bandsData = useMemo(() => {
    if (!selectedSource) return []
    
    const prefix = metricType === 'amount' 
      ? `hmrc/${selectedSource}_income_band_`
      : `hmrc/${selectedSource}_count_income_band_`
    
    const bandMetrics = latestData.filter(item => item.metric.startsWith(prefix))
    
    const bands: IncomeBandData[] = []
    
    bandMetrics.forEach(item => {
      const band = parseBand(item.metric)
      if (band && band.bandNumber !== 55) { // Exclude total band (55)
        bands.push({
          band,
          estimate: item.estimate,
          target: item.target,
          error: item.error,
          rel_abs_error: item.rel_abs_error
        })
      }
    })
    
    return bands.sort((a, b) => a.band.lowerBound - b.band.lowerBound)
  }, [latestData, selectedSource, metricType])

  const formatValue = (value: number, type: 'amount' | 'count') => {
    if (type === 'count') {
      if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
      if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
      return Math.round(value).toLocaleString()
    } else {
      if (value >= 1e9) return '£' + (value / 1e9).toFixed(1) + 'B'
      if (value >= 1e6) return '£' + (value / 1e6).toFixed(1) + 'M'
      if (value >= 1e3) return '£' + (value / 1e3).toFixed(1) + 'K'
      return '£' + Math.round(value).toLocaleString()
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Income Distribution Analysis</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  if (incomeSources.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Income Distribution Analysis</h2>
        <p className="text-gray-600">No income band data found</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Income Distribution Analysis</h2>
      <p className="text-gray-600 mb-6">
        Compare estimated vs target income distributions across bands (Epoch {maxEpoch})
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Income Source</label>
          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            {incomeSources.map(source => (
              <option key={source} value={source}>
                {source.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metric Type</label>
          <select 
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as 'amount' | 'count')}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            <option value="amount">Income Amount</option>
            <option value="count">Count of People</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
          <select 
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'absolute' | 'relative')}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            <option value="absolute">Absolute Values</option>
            <option value="relative">Relative Differences (%)</option>
          </select>
        </div>
      </div>

      {bandsData.length > 0 ? (
        <div className="space-y-6">
          <div className="h-96 w-full">
            <Plot
              data={viewType === 'absolute' ? [
                {
                  x: bandsData.map(d => d.band.displayRange) as any,
                  y: bandsData.map(d => d.estimate) as any,
                  type: 'bar' as const,
                  name: 'Estimate',
                  marker: { color: '#3b82f6' },
                  text: bandsData.map(d => formatValue(d.estimate, metricType)),
                  textposition: 'outside'
                },
                {
                  x: bandsData.map(d => d.band.displayRange) as any,
                  y: bandsData.map(d => d.target) as any,
                  type: 'bar' as const,
                  name: 'Target',
                  marker: { color: '#ef4444' },
                  text: bandsData.map(d => formatValue(d.target, metricType)),
                  textposition: 'outside'
                }
              ] : [
                {
                  x: bandsData.map(d => d.band.displayRange) as any,
                  y: bandsData.map(d => (d.rel_abs_error * 100)) as any,
                  type: 'bar' as const,
                  name: 'Relative Error %',
                  marker: { 
                    color: bandsData.map(d => 
                      d.rel_abs_error < 0.05 ? '#22c55e' : 
                      d.rel_abs_error < 0.20 ? '#eab308' : '#ef4444'
                    )
                  },
                  text: bandsData.map(d => `${(d.rel_abs_error * 100).toFixed(1)}%`),
                  textposition: 'outside'
                }
              ]}
              layout={{
                width: undefined,
                height: 400,
                autosize: true,
                margin: { l: 80, r: 20, t: 40, b: 120 },
                font: { family: 'JetBrains Mono, monospace', size: 11 },
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(0,0,0,0)',
                xaxis: {
                  title: 'Income Band',
                  tickangle: -45,
                  gridcolor: '#e5e7eb'
                },
                yaxis: {
                  title: viewType === 'absolute' 
                    ? (metricType === 'amount' ? 'Income Amount (£)' : 'Count of People')
                    : 'Relative Error (%)',
                  gridcolor: '#e5e7eb',
                  tickformat: viewType === 'absolute' ? '.2s' : '.1f'
                },
                barmode: viewType === 'absolute' ? 'group' : undefined,
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary Statistics</h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bands:</span>
                  <span className="font-semibold">{bandsData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Rel Error:</span>
                  <span className="font-semibold">
                    {(bandsData.reduce((sum, d) => sum + d.rel_abs_error, 0) / bandsData.length * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Band:</span>
                  <span className="font-semibold text-xs">
                    {bandsData.reduce((best, d) => d.rel_abs_error < best.rel_abs_error ? d : best).band.displayRange}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Worst Band:</span>
                  <span className="font-semibold text-xs">
                    {bandsData.reduce((worst, d) => d.rel_abs_error > worst.rel_abs_error ? d : worst).band.displayRange}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Breakdown</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Excellent (<5%)', color: 'text-green-600', count: bandsData.filter(d => d.rel_abs_error < 0.05).length },
                  { label: 'Good (5-20%)', color: 'text-yellow-600', count: bandsData.filter(d => d.rel_abs_error >= 0.05 && d.rel_abs_error < 0.20).length },
                  { label: 'Needs Work (>20%)', color: 'text-red-600', count: bandsData.filter(d => d.rel_abs_error >= 0.20).length }
                ].map(({ label, color, count }) => (
                  <div key={label} className="flex justify-between">
                    <span className={color}>{label}</span>
                    <span className={`font-semibold ${color}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-gray-500">
          No income band data available for selected source
        </div>
      )}
    </div>
  )
}