'use client'

import { useState } from 'react'

export function ScanForm() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    if (!url) {
      setError('Please enter a URL to scan')
      setIsLoading(false)
      return
    }

    try {
      // Validate URL format
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
      if (!urlPattern.test(url)) {
        setError('Please enter a valid URL (e.g., https://example.com)')
        setIsLoading(false)
        return
      }

      // Add protocol if missing
      const fullUrl = url.startsWith('http') ? url : `https://${url}`

      // Submit scan request
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fullUrl,
          scanType: 'FULL',
          wcagLevel: 'AA',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit scan request')
      }

      const result = await response.json()

      setSuccess(`Scan submitted! Your scan for ${fullUrl} has been queued.`)
      setUrl('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            Website URL
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              https://
            </span>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="w-full pl-24 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="flex items-center mt-2 text-sm text-green-600">
              ✅ {success}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isLoading || !url}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Queuing Scan...' : 'Start WCAG Scan'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUrl('')
              setError('')
              setSuccess('')
            }}
            disabled={isLoading}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">What You'll Get:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Comprehensive WCAG 2.2 AA compliance analysis</li>
          <li>• AI-powered violation explanations and remediation suggestions</li>
          <li>• Confidence scoring for result reliability</li>
          <li>• PDF and JSON report export options</li>
          <li>• Industry benchmark comparisons</li>
        </ul>
      </div>
    </div>
  )
}
