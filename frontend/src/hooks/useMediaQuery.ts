import { useState, useEffect } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useMediaQuery(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint())

  useEffect(() => {
    const handleResize = () => setBreakpoint(getBreakpoint())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

function getBreakpoint(): Breakpoint {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1280) return 'tablet'
  return 'desktop'
}

export function useIsMobile(): boolean {
  return useMediaQuery() === 'mobile'
}
