import { useEffect } from 'react';

const BASE_TITLE = 'utreker — трекер привычек и настроения';

/**
 * Sets `document.title` for the current page.
 * On unmount, restores the base title.
 */
export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE;

    return () => {
      document.title = BASE_TITLE;
    };
  }, [pageTitle]);
}
