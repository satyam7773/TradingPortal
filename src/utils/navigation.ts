import { NavigateFunction } from 'react-router-dom'

/**
 * Navigate to a route and scroll to top
 * @param navigate - React Router navigate function
 * @param path - Path to navigate to
 * @param options - Navigation options
 */
export const navigateWithScrollToTop = (
  navigate: NavigateFunction, 
  path: string, 
  options?: { replace?: boolean; state?: any }
) => {
  // Scroll to top immediately
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  
  // Navigate after a small delay to ensure smooth scroll starts
  setTimeout(() => {
    navigate(path, options)
  }, 50)
}

/**
 * Scroll to top of the page smoothly
 */
export const scrollToTop = (behavior: 'smooth' | 'instant' = 'smooth') => {
  window.scrollTo({ top: 0, left: 0, behavior })
}

/**
 * Hook to scroll to top on route change
 */
export const useScrollToTop = () => {
  return () => {
    scrollToTop('smooth')
  }
}