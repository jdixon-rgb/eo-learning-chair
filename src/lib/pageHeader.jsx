import { createContext, useContext, useEffect, useState } from 'react'

const PageHeaderContext = createContext(null)

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({ title: null, subtitle: null })
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)?.header || { title: null, subtitle: null }
}

/**
 * Hook variant of PageHeader for pages whose in-body title is interactive
 * (e.g. EventDetailPage where the h1 is click-to-edit). Pushes title +
 * subtitle into context so the TopBar shows them on desktop, without
 * rendering anything in-body. The page keeps its own custom title block.
 */
export function useSetPageHeader(title, subtitle) {
  const ctx = useContext(PageHeaderContext)
  const setHeader = ctx?.setHeader
  useEffect(() => {
    if (!setHeader) return
    setHeader({ title, subtitle })
    return () => setHeader({ title: null, subtitle: null })
  }, [title, subtitle, setHeader])
}

/**
 * Drop-in replacement for in-page page-title blocks.
 *
 * On mobile (`<md`) it renders the title + subtitle in-body, where the
 * sidebar is collapsed and the TopBar is showing the chapter name.
 *
 * On desktop (`md:` and up) it renders nothing in-body — the title and
 * subtitle are surfaced in the TopBar via React context, reusing the
 * white space the chapter name used to occupy.
 *
 * Usage:
 *   <PageHeader title="SAPs" subtitle={`${count} active partners`} />
 *
 * `subtitle` accepts a string or any ReactNode (e.g. with icons).
 */
export default function PageHeader({ title, subtitle }) {
  const ctx = useContext(PageHeaderContext)
  const setHeader = ctx?.setHeader

  useEffect(() => {
    if (!setHeader) return
    setHeader({ title, subtitle })
    return () => setHeader({ title: null, subtitle: null })
  }, [title, subtitle, setHeader])

  return (
    <div className="md:hidden">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  )
}
