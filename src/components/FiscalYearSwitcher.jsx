import { useFiscalYear } from '@/lib/fiscalYearContext'

export default function FiscalYearSwitcher({ onAfterChange }) {
  const { activeFiscalYear, setActiveFiscalYear, fiscalYearOptions, currentFiscalYear } = useFiscalYear()

  if (fiscalYearOptions.length <= 1) return null

  return (
    <div className="px-3">
      <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">
        Fiscal Year
      </label>
      <select
        value={activeFiscalYear}
        onChange={(e) => { setActiveFiscalYear(e.target.value); onAfterChange?.() }}
        className="w-full text-xs rounded-lg px-2.5 py-2 bg-card text-foreground border border-sidebar-border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {fiscalYearOptions.map((fy) => (
          <option key={fy} value={fy} className="bg-card text-foreground">
            {fy}{fy === currentFiscalYear ? ' (current)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
