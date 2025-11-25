// FeedbackBanner component
// Displays contextual alerts for errors, warnings, or info states
import React from 'react'

type FeedbackType = 'info' | 'success' | 'warning' | 'error'

interface FeedbackBannerProps {
  type?: FeedbackType
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
}

const styles: Record<FeedbackType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
}

const buttonStyles: Record<FeedbackType, string> = {
  info: 'text-blue-700 hover:text-blue-900',
  success: 'text-green-700 hover:text-green-900',
  warning: 'text-yellow-700 hover:text-yellow-900',
  error: 'text-red-700 hover:text-red-900',
}

const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  type = 'info',
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  return (
    <div className={`border rounded-lg px-4 py-3 flex items-start gap-3 ${styles[type]}`}>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`mt-2 text-sm font-medium underline ${buttonStyles[type]}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default FeedbackBanner


