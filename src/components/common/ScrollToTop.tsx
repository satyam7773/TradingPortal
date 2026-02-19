import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Component that automatically scrolls to top when route changes
 * Add this component to your App.tsx to enable global scroll-to-top behavior
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}

export default ScrollToTop