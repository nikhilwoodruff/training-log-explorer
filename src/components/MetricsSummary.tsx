import { TrainingLogData } from '@/types/training-log'

interface MetricsSummaryProps {
  data: TrainingLogData[]
}

export default function MetricsSummary({ data }: MetricsSummaryProps) {
  if (data.length === 0) {
    return <div>No data available</div>
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
  
  const totalEntries = latestData.length
  const avgRelAbsError = latestData.reduce((sum, item) => sum + item.rel_abs_error, 0) / totalEntries
  const uniqueMetrics = new Set(filteredData.map(item => item.metric)).size
  const uniqueEpochs = selectedEpochs.length
  
  const excellentCount = latestData.filter(item => item.rel_abs_error < 0.05).length
  const goodCount = latestData.filter(item => item.rel_abs_error >= 0.05 && item.rel_abs_error < 0.20).length
  const poorCount = latestData.filter(item => item.rel_abs_error >= 0.20).length
  
  const qualityScore = ((excellentCount * 100 + goodCount * 75) / totalEntries).toFixed(1)

  return (
    <div className="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Dataset Quality Summary</h2>
      <p className="text-gray-600 mb-6">
        Assessment of how well our calibrated weights match target statistics (Epoch {maxEpoch})
        {selectedEpochs.length < allEpochs.length && (
          <span className="text-sm"> • Showing {selectedEpochs.length} of {allEpochs.length} epochs for performance</span>
        )}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="text-3xl font-bold text-blue-800">{qualityScore}%</div>
          <div className="text-sm text-blue-600">Overall Quality Score</div>
          <div className="text-xs text-gray-600 mt-1">
            Weighted average: Excellent (100%) + Good (75%)
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
          <div className="text-3xl font-bold text-gray-800">{avgRelAbsError.toFixed(3)}</div>
          <div className="text-sm text-gray-600">Avg Relative Error</div>
          <div className="text-xs text-gray-600 mt-1">
            Lower is better (target: &lt;5%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{excellentCount}</div>
          <div className="text-sm text-gray-600">Excellent</div>
          <div className="text-xs text-gray-500">&lt;5% error</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{goodCount}</div>
          <div className="text-sm text-gray-600">Good</div>
          <div className="text-xs text-gray-500">5-20% error</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{poorCount}</div>
          <div className="text-sm text-gray-600">Needs Work</div>
          <div className="text-xs text-gray-500">&gt;20% error</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Unique Metrics:</span>
          <span className="font-semibold ml-2">{uniqueMetrics}</span>
        </div>
        <div>
          <span className="text-gray-600">Training Epochs:</span>
          <span className="font-semibold ml-2">{uniqueEpochs}</span>
        </div>
      </div>
    </div>
  )
}