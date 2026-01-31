import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook that refreshes the page when user navigates back/forward with browser buttons
 * Uses sessionStorage to detect if page was modified
 */
export function useRefreshOnNavigation(pageKey: string) {
  const router = useRouter();

  useEffect(() => {
    // Mark that we're on this page
    sessionStorage.setItem(`page_visited_${pageKey}`, 'true');

    const handlePopState = () => {
      // Check if there's a flag indicating the other page was modified
      const otherPageModified = sessionStorage.getItem('page_modified');
      
      if (otherPageModified) {
        // Clear the flag and refresh
        sessionStorage.removeItem('page_modified');
        router.refresh();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router, pageKey]);
}

/**
 * Mark current page as modified so next page that's visited will refresh
 */
export function markPageModified() {
  sessionStorage.setItem('page_modified', 'true');
}
