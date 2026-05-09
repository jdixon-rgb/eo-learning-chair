// Aperture brand mark — a thick ring with a precise notch. Reads
// simultaneously as the "O" of OurChapter, a camera aperture, a
// port, a precision dial. The notch is what makes it deliberate
// (not just a circle) — at sizes below 16px the notch disappears
// and the meaning with it, so don't render below that.
//
// Geometry from the v1 identity package (Claude Design 2026-05-09):
// viewBox 64×64, single arc path stroke 8.5, color via currentColor
// so callers can recolor with text-* utility classes.

export default function ApertureMark({ size = 24, className = '', strokeWidth = 8.5 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 11.33 39.52 A 22 22 0 1 1 17.86 48.85"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
    </svg>
  )
}
