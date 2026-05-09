import { useVendorStore } from '@/lib/vendorStore'
import { Star } from 'lucide-react'

// Surfaces the member-facing rating for a SAP. Ratings live on the
// linked vendor record (members rate SAPs through the Vendors page);
// this component just looks up the vendor for a given sap_id and
// shows the average + count, Google-style. Hidden entirely if no
// member has rated yet — beats showing a misleading "0.0".
export default function SAPRating({ sapId, size = 'sm' }) {
  const { vendorForSAP, averageRating, reviewCount } = useVendorStore()
  const vendor = vendorForSAP(sapId)
  if (!vendor) return null
  const count = reviewCount(vendor.id)
  if (count === 0) return null
  const avg = averageRating(vendor.id)

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs'
  const starSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} text-muted-foreground`}
      title={`${avg.toFixed(1)} from ${count} member${count === 1 ? '' : 's'}`}
    >
      <Star className={`${starSize} fill-amber-400 text-amber-400`} strokeWidth={1.5} />
      <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground/70">({count})</span>
    </span>
  )
}
