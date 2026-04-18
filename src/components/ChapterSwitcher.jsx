import { useChapter } from '@/lib/chapter'

export default function ChapterSwitcher() {
  const { allChapters, activeChapterId, setActiveChapterId } = useChapter()

  if (allChapters.length <= 1) return null

  return (
    <div className="px-3">
      <label className="text-[10px] font-bold tracking-widest text-white/30 uppercase block mb-1.5">
        Chapter
      </label>
      <select
        value={activeChapterId || ''}
        onChange={(e) => setActiveChapterId(e.target.value)}
        className="w-full text-xs rounded-lg px-2.5 py-2 bg-white/10 text-white border border-white/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {allChapters.map((ch) => (
          <option key={ch.id} value={ch.id} className="bg-ink text-white">
            {ch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
