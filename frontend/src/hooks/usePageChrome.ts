import { useLayoutEffect } from 'react'

// Each layout styles <body> (and optionally <html>) differently; apply its classes while it is mounted
export function usePageChrome(bodyClassName: string, htmlClassName = '') {
  useLayoutEffect(() => {
    document.body.className = bodyClassName
    document.documentElement.className = htmlClassName
  }, [bodyClassName, htmlClassName])
}
