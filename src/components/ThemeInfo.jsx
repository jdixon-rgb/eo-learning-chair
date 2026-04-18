import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info, Palette } from 'lucide-react'

/**
 * Displays a theme name with an ⓘ info icon.
 * Clicking the icon opens a modal with the theme description.
 */
export default function ThemeInfo({ theme, description, className = '' }) {
  const [open, setOpen] = useState(false)

  if (!theme) return null

  return (
    <>
      <span className={className}>
        Theme: <span className="font-semibold text-primary">"{theme}"</span>
        {description && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            className="inline-flex items-center justify-center w-4 h-4 ml-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer align-middle"
            title="About this theme"
          >
            <Info className="h-2.5 w-2.5 text-primary" />
          </button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              "{theme}"
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
