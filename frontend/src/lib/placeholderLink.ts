import type { MouseEvent } from 'react'

// Links with no destination yet (the original used href="javascript:void(0)", which React blocks)
export const placeholderLinkProps = {
  href: '#',
  onClick: (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault(),
}
