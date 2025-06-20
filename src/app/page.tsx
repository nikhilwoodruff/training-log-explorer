'use client'

import { useState, useEffect } from 'react'
import { TrainingLogData } from '@/types/training-log'
import DataTable from '@/components/DataTable'
import MetricsSummary from '@/components/MetricsSummary'
import Charts from '@/components/Charts'
import LineChart from '@/components/LineChart'
import IncomeBands from '@/components/IncomeBands'
import LocalAreas from '@/components/LocalAreas'

export default function Home() {
  const [data, setData] = useState<TrainingLogData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/training_log.csv')
      .then(response => response.text())
      .then(csvText => {
        try {
          const lines = csvText.trim().split('\n')
          if (lines.length < 2) {
            console.error('CSV file appears to be empty or malformed')
            setData([])
            setLoading(false)
            return
          }
          
          // const headers = lines[0].split(',')
          const rows = lines.slice(1)
            .filter(line => line.trim().length > 0)
            .map(line => {
              const values = line.split(',')
              if (values.length < 10) {
                console.warn('Skipping malformed row:', line)
                return null
              }
              return {
                index: values[0],
                name: values[1],
                metric: values[2],
                estimate: parseFloat(values[3]) || 0,
                target: parseFloat(values[4]) || 0,
                error: parseFloat(values[5]) || 0,
                abs_error: parseFloat(values[6]) || 0,
                rel_abs_error: parseFloat(values[7]) || 0,
                validation: values[8] === 'True',
                epoch: parseInt(values[9]) || 0
              }
            })
            .filter(row => row !== null)
          
          setData(rows as TrainingLogData[])
        } catch (error) {
          console.error('Error parsing CSV:', error)
          setData([])
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching CSV:', error)
        setData([])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-gray-700 font-mono flex items-center justify-center">
        <div className="text-lg">Loading training log...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-mono p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Training Log Explorer</h1>
        <p className="text-gray-600 text-lg">Household Survey Data Weight Calibration Assessment</p>
      </header>

      <div className="space-y-8">
        <MetricsSummary data={data} />
        <Charts data={data} />
        <IncomeBands data={data} />
        <LocalAreas data={data} />
        <LineChart data={data} />
        <DataTable data={data} />
      </div>
    </div>
  )
}
