import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

/**
 * Lets a page render its primary action(s) into the shared Header.
 * Pass a JSX node; it's cleared automatically on unmount.
 */
export default function useHeaderActions(node, deps = []) {
  const { setActions } = useOutletContext()
  useEffect(() => {
    setActions(node)
    return () => setActions(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
