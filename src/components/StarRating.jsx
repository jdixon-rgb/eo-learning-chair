import { useState } from 'react'
import { Star } from 'lucide-react'

// Star-rating control matched to the venues / speakers pattern.
// Click a star to set, click the same star again to clear.
export default function StarRating({ value = 0, onChange, size = 'sm', readonly = false }) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star === value ? 0 : star)}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
