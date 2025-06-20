/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { TrainingLogData } from '@/types/training-log'
import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface LocalAreasProps {
  data: TrainingLogData[]
}

interface LocalAreaData {
  constituency: string
  dataPoints: Array<{
    category: string
    estimate: number
    target: number
    error: number
    rel_abs_error: number
  }>
  totalError: number
  avgRelError: number
}

export default function LocalAreas({ data }: LocalAreasProps) {
  // Find max epoch safely without spread operator
  const maxEpoch = data.length > 0 ? data.reduce((max, item) => Math.max(max, item.epoch), 0) : 0
  
  // Get unique epochs and filter to reasonable subset (max 100 epochs)
  const allEpochs = Array.from(new Set(data.map(item => item.epoch))).sort((a, b) => a - b)
  const epochStep = Math.max(1, Math.floor(allEpochs.length / 100))
  const selectedEpochs = allEpochs.filter((_, index) => index % epochStep === 0 || allEpochs[index] === maxEpoch)
  
  // Filter data to only include selected epochs
  const filteredData = data.filter(item => selectedEpochs.includes(item.epoch))
  const latestData = filteredData.filter(item => item.epoch === maxEpoch)

  // Get all constituencies
  const constituencies = Array.from(new Set(latestData.map(item => item.name))).sort()
  
  const [selectedConstituency, setSelectedConstituency] = useState(constituencies[0] || '')
  const [analysisType, setAnalysisType] = useState<'age' | 'employment'>('age')
  const [viewMode, setViewMode] = useState<'single' | 'comparison'>('single')
  const [comparisonConstituency, setComparisonConstituency] = useState(constituencies[1] || '')

  // Age bands mapping
  const ageBands = [
    { metric: 'age/0_10', label: '0-10 years', range: '0-10' },
    { metric: 'age/10_20', label: '10-20 years', range: '10-20' },
    { metric: 'age/20_30', label: '20-30 years', range: '20-30' },
    { metric: 'age/30_40', label: '30-40 years', range: '30-40' },
    { metric: 'age/40_50', label: '40-50 years', range: '40-50' },
    { metric: 'age/50_60', label: '50-60 years', range: '50-60' },
    { metric: 'age/60_70', label: '60-70 years', range: '60-70' },
    { metric: 'age/70_80', label: '70-80 years', range: '70-80' }
  ]

  // Employment income bands mapping
  const employmentBands = [
    { metric: 'hmrc/employment_income/amount/20000_30000', label: '£20K-£30K', range: '20000-30000' },
    { metric: 'hmrc/employment_income/amount/30000_40000', label: '£30K-£40K', range: '30000-40000' },
    { metric: 'hmrc/employment_income/amount/40000_50000', label: '£40K-£50K', range: '40000-50000' },
    { metric: 'hmrc/employment_income/amount/50000_70000', label: '£50K-£70K', range: '50000-70000' },
    { metric: 'hmrc/employment_income/amount/70000_100000', label: '£70K-£100K', range: '70000-100000' },
    { metric: 'hmrc/employment_income/amount/100000_150000', label: '£100K-£150K', range: '100000-150000' }
  ]

  const getLocalAreaData = useCallback((constituency: string): LocalAreaData => {
    const constituencyData = latestData.filter(item => item.name === constituency)
    const bands = analysisType === 'age' ? ageBands : employmentBands
    
    const dataPoints = bands.map(band => {
      const item = constituencyData.find(d => d.metric === band.metric)
      return {
        category: band.label,
        estimate: item?.estimate || 0,
        target: item?.target || 0,
        error: item?.error || 0,
        rel_abs_error: item?.rel_abs_error || 0
      }
    }).filter(point => point.target > 0) // Only include bands with data
    
    const totalError = dataPoints.reduce((sum, point) => sum + Math.abs(point.error), 0)
    const avgRelError = dataPoints.length > 0 
      ? dataPoints.reduce((sum, point) => sum + point.rel_abs_error, 0) / dataPoints.length 
      : 0

    return {
      constituency,
      dataPoints,
      totalError,
      avgRelError
    }
  }, [latestData, analysisType, ageBands, employmentBands])

  const primaryData = useMemo(() => 
    getLocalAreaData(selectedConstituency), 
    [selectedConstituency, getLocalAreaData]
  )

  const comparisonData = useMemo(() => 
    viewMode === 'comparison' ? getLocalAreaData(comparisonConstituency) : null, 
    [comparisonConstituency, viewMode, getLocalAreaData]
  )

  const formatValue = (value: number, type: 'age' | 'employment') => {
    if (type === 'age') {
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

  // Get top/bottom performers for overview
  const overviewData = useMemo(() => {
    const allAreas = constituencies.map(constituency => getLocalAreaData(constituency))
    const sorted = allAreas.filter(area => area.dataPoints.length > 0)
      .sort((a, b) => a.avgRelError - b.avgRelError)
    
    return {
      best: sorted.slice(0, 5),
      worst: sorted.slice(-5).reverse(),
      average: sorted.reduce((sum, area) => sum + area.avgRelError, 0) / sorted.length
    }
  }, [constituencies, getLocalAreaData])

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Local Area Analysis</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  if (constituencies.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Local Area Analysis</h2>
        <p className="text-gray-600">No constituency data found</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Local Area Analysis</h2>
      <p className="text-gray-600 mb-6">
        Analyze {analysisType === 'age' ? 'age demographics' : 'employment income distribution'} by constituency (Epoch {maxEpoch})
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
          <select 
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as 'age' | 'employment')}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            <option value="age">Age Demographics</option>
            <option value="employment">Employment Income</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'single' | 'comparison')}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            <option value="single">Single Area</option>
            <option value="comparison">Compare Areas</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Constituency</label>
          <select 
            value={selectedConstituency}
            onChange={(e) => setSelectedConstituency(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
          >
            {constituencies.map(constituency => (
              <option key={constituency} value={constituency}>
                {constituency}
              </option>
            ))}
          </select>
        </div>

        {viewMode === 'comparison' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compare With</label>
            <select 
              value={comparisonConstituency}
              onChange={(e) => setComparisonConstituency(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded font-mono text-sm"
            >
              {constituencies.filter(c => c !== selectedConstituency).map(constituency => (
                <option key={constituency} value={constituency}>
                  {constituency}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {primaryData.dataPoints.length > 0 ? (
        <div className="space-y-6">
          <div className="h-96 w-full">
            <Plot
              data={viewMode === 'single' ? [
                {
                  x: primaryData.dataPoints.map(d => d.category) as any,
                  y: primaryData.dataPoints.map(d => d.estimate) as any,
                  type: 'bar' as const,
                  name: 'Estimate',
                  marker: { color: '#3b82f6' },
                  text: primaryData.dataPoints.map(d => formatValue(d.estimate, analysisType)),
                  textposition: 'outside'
                },
                {
                  x: primaryData.dataPoints.map(d => d.category) as any,
                  y: primaryData.dataPoints.map(d => d.target) as any,
                  type: 'bar' as const,
                  name: 'Target',
                  marker: { color: '#ef4444' },
                  text: primaryData.dataPoints.map(d => formatValue(d.target, analysisType)),
                  textposition: 'outside'
                }
              ] : [
                {
                  x: primaryData.dataPoints.map(d => d.category) as any,
                  y: primaryData.dataPoints.map(d => d.estimate) as any,
                  type: 'bar' as const,
                  name: `${selectedConstituency} (Est)`,
                  marker: { color: '#3b82f6' }
                },
                {
                  x: primaryData.dataPoints.map(d => d.category) as any,
                  y: primaryData.dataPoints.map(d => d.target) as any,
                  type: 'bar' as const,
                  name: `${selectedConstituency} (Target)`,
                  marker: { color: '#93c5fd' }
                },
                ...(comparisonData ? [
                  {
                    x: comparisonData.dataPoints.map(d => d.category) as any,
                    y: comparisonData.dataPoints.map(d => d.estimate) as any,
                    type: 'bar' as const,
                    name: `${comparisonConstituency} (Est)`,
                    marker: { color: '#ef4444' }
                  },
                  {
                    x: comparisonData.dataPoints.map(d => d.category) as any,
                    y: comparisonData.dataPoints.map(d => d.target) as any,
                    type: 'bar' as const,
                    name: `${comparisonConstituency} (Target)`,
                    marker: { color: '#fca5a5' }
                  }
                ] : [])
              ]}
              layout={{
                width: undefined,
                height: 400,
                autosize: true,
                margin: { l: 80, r: 20, t: 40, b: 100 },
                font: { family: 'JetBrains Mono, monospace', size: 11 },
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(0,0,0,0)',
                xaxis: {
                  title: analysisType === 'age' ? 'Age Band' : 'Income Band',
                  tickangle: -45,
                  gridcolor: '#e5e7eb'
                },
                yaxis: {
                  title: analysisType === 'age' ? 'Population Count' : 'Income Amount (£)',
                  gridcolor: '#e5e7eb',
                  tickformat: '.2s'
                },
                barmode: 'group',
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {selectedConstituency} Statistics
              </h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Rel Error:</span>
                  <span className={`font-semibold ${
                    primaryData.avgRelError < 0.05 ? 'text-green-600' : 
                    primaryData.avgRelError < 0.20 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(primaryData.avgRelError * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Points:</span>
                  <span className="font-semibold">{primaryData.dataPoints.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Band:</span>
                  <span className="font-semibold text-xs">
                    {primaryData.dataPoints.reduce((best, d) => 
                      d.rel_abs_error < best.rel_abs_error ? d : best
                    ).category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Worst Band:</span>
                  <span className="font-semibold text-xs">
                    {primaryData.dataPoints.reduce((worst, d) => 
                      d.rel_abs_error > worst.rel_abs_error ? d : worst
                    ).category}
                  </span>
                </div>
              </div>
            </div>

            {viewMode === 'comparison' && comparisonData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {comparisonConstituency} Statistics
                </h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Rel Error:</span>
                    <span className={`font-semibold ${
                      comparisonData.avgRelError < 0.05 ? 'text-green-600' : 
                      comparisonData.avgRelError < 0.20 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(comparisonData.avgRelError * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Points:</span>
                    <span className="font-semibold">{comparisonData.dataPoints.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">vs Primary:</span>
                    <span className={`font-semibold ${
                      comparisonData.avgRelError < primaryData.avgRelError ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparisonData.avgRelError < primaryData.avgRelError ? 'Better' : 'Worse'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {analysisType === 'age' ? 'Age' : 'Income'} Analysis Overview
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">UK Average Error:</span>
                  <span className="font-semibold">
                    {(overviewData.average * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="text-gray-600">Best Performers:</div>
                  {overviewData.best.slice(0, 3).map((area, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate text-green-600 max-w-24">
                        {area.constituency.split(' ')[0]}
                      </span>
                      <span className="text-green-600">
                        {(area.avgRelError * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-gray-500">
          No {analysisType === 'age' ? 'age demographic' : 'employment income'} data available for selected constituency
        </div>
      )}
    </div>
  )
}