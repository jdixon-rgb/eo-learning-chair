import { useFiscalYear } from '@/lib/fiscalYearContext'

export default function FiscalYearSwitcher() {
  const { activeFiscalYear, setActiveFiscalYear, fiscalYearOptions, currentFiscalYear } = useFiscalYear()

  if (fiscalYearOptions.length <= 1) return null

  return (
    <div className="px-3">
      <label className="text-[10px] font-bold tracking-widest text-white/30 uppercase block mb-1.5">
        Fiscal Year
      </label>
      <select
        value={activeFiscalYear}
        onChange={(e) => setActiveFiscalYear(e.target.value)}
        className="w-full text-xs rounded-lg px-2.5 py-2 bg-white/10 text-white border border-white/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {fiscalYearOptions.map((fy) => (
          <option key={fy} value={fy} className="bg-ink text-white">
            {fy}{fy === currentFiscalYear ? ' (current)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
