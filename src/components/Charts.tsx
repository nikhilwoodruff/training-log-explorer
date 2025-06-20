'use client'

import { TrainingLogData } from '@/types/training-log'

interface ChartsProps {
  data: TrainingLogData[]
}

export default function Charts({ data }: ChartsProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-2 text-gray-800">Error Distribution</h2>
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }
  
  // Find max epoch safely without spread operator
  const maxEpoch = data.reduce((max, item) => Math.max(max, item.epoch), 0)
  
  // Get unique epochs and filter to reasonable subset (max 100 epochs)
  const allEpochs = Array.from(new Set(data.map(item => item.epoch))).sort((a, b) => a - b)
  const epochStep = Math.max(1, Math.floor(allEpochs.length / 100))
  const selectedEpochs = allEpochs.filter((_, index) => index % epochStep === 0 || allEpochs[index] === maxEpoch)
  
  // Filter data to only include selected epochs
  const filteredData = data.filter(item => selectedEpochs.includes(item.epoch))
  const latestData = filteredData.filter(item => item.epoch === maxEpoch)
  
  const errorBins = [0, 0.05, 0.1, 0.20, 0.3, 0.5, 1.0, Infinity]
  
  const getErrorDistribution = () => {
    const distribution = errorBins.slice(0, -1).map((bin, i) => {
      const nextBin = errorBins[i + 1]
      const count = latestData.filter(item => 
        item.rel_abs_error >= bin && item.rel_abs_error < nextBin
      ).length
      return {
        range: nextBin === Infinity ? `${(bin*100).toFixed(0)}%+` : `${(bin*100).toFixed(0)}-${(nextBin*100).toFixed(0)}%`,
        count,
        percentage: (count / latestData.length * 100).toFixed(1),
        color: bin < 0.05 ? 'bg-green-500' : bin < 0.20 ? 'bg-yellow-500' : 'bg-red-500'
      }
    })
    return distribution
  }

  const distribution = getErrorDistribution()
  const maxCount = Math.max(...distribution.map(d => d.count))
  const metrics = Array.from(new Set(latestData.map(item => item.metric)))

  return (
    <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Error Distribution</h2>
      <p className="text-gray-600 mb-6">
        Distribution of relative absolute errors for Epoch {maxEpoch}
      </p>

      <div className="space-y-3">
        {distribution.map((bin, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="w-20 text-right text-sm font-mono text-gray-700">
              {bin.range}
            </div>
            <div className="flex-1 bg-gray-200 h-8 relative overflow-hidden rounded-lg">
              <div 
                className={`${bin.color} h-full transition-all duration-300`}
                style={{ width: `${(bin.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-24 text-right text-sm font-mono text-gray-700">
              {bin.count} ({bin.percentage}%)
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Targets</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Excellent: &lt;5% error</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
              <span className="text-gray-600">Good: 5-20% error</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-600">Needs work: &gt;20% error</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Metrics by Count</h3>
          <div className="font-mono space-y-1 text-sm">
            {metrics.slice(0, 5).map(metric => {
              const count = latestData.filter(d => d.metric === metric).length
              return (
                <div key={metric} className="flex justify-between text-gray-600">
                  <span className="truncate">{metric.replace('hmrc/', '')}</span>
                  <span>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}