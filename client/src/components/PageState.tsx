// PageState component
// Provides consistent empty/error informational state blocks

import { ReactNode } from 'react'

interface PageStateProps {
  icon?: ReactNode
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

const PageState = ({ icon, title, message, actionLabel, onAction }: PageStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-lg border border-dashed border-gray-200">
      <div className="mb-4 text-primary-600">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 max-w-md">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default PageState


