import { useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import config from '../../clientConfig';
import { RouteComponentProps } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}


const GoogleAnalytics = ({ location, history }: RouteComponentProps) => {
  useEffect(() => {
    const gtag = window.gtag;

    if (history.action === 'PUSH' && gtag && typeof gtag === 'function') {
      gtag('config', config.googleAnalyticsTrackingId, {
        page_title: document.title,
        page_location: window.location.href,
        page_path: location.pathname,
      });
    }
  }, [location, history]);

  return null;
};

export default withRouter(GoogleAnalytics);
