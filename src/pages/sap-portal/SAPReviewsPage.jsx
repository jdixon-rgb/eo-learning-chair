import { useSAPContact } from '@/lib/useSAPContact'
import { useVendorStore } from '@/lib/vendorStore'
import { Star, Building2, ThumbsUp, ThumbsDown } from 'lucide-react'

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </div>
  )
}

export default function SAPReviewsPage() {
  const { partner } = useSAPContact()
  const { vendors, reviewsForVendor, averageRating, reviewCount } = useVendorStore()

  const linkedVendor = partner ? vendors.find(v => v.sap_id === partner.id) : null
  const reviews = linkedVendor ? reviewsForVendor(linkedVendor.id) : []
  const avgRating = linkedVendor ? averageRating(linkedVendor.id) : 0
  const count = linkedVendor ? reviewCount(linkedVendor.id) : 0

  if (!linkedVendor) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">Member reviews from the Vendor Exchange</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/70">Your company hasn't been linked to the Vendor Exchange yet.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Ask your chapter contact to set this up.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">What EO members are saying about {partner?.name}</p>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-muted/30 p-6 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
          <StarRating rating={avgRating} />
          <p className="text-xs text-muted-foreground/60 mt-1">{count} review{count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground/70">No reviews yet. Members can review you in the Vendor Exchange.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...reviews]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(review => (
              <div key={review.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-muted-foreground/60">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">EO Member</span>
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>
                )}
                {(review.upvotes > 0 || review.downvotes > 0) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                    {review.upvotes > 0 && (
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {review.upvotes}</span>
                    )}
                    {review.downvotes > 0 && (
                      <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" /> {review.downvotes}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
