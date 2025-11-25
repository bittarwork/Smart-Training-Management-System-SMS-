// PageLoader component
// Shows a centered spinner with optional label text
import React from 'react'

interface PageLoaderProps {
  label?: string
  fullHeight?: boolean
}

const PageLoader: React.FC<PageLoaderProps> = ({ label = 'Loading data...', fullHeight = false }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full ${
        fullHeight ? 'min-h-[240px]' : 'py-12'
      }`}
    >
      <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      <p className="mt-4 text-sm text-gray-500">{label}</p>
    </div>
  )
}

export default PageLoader


