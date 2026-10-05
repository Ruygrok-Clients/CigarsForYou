import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bindDocumentClicks, consumeAnalyticsQueryFlags, trackPageView } from '../lib/analytics';

export function AnalyticsRouteListener() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cleaned = consumeAnalyticsQueryFlags(location.search);
    if (cleaned.changed) {
      navigate(
        { pathname: location.pathname, search: cleaned.search, hash: location.hash },
        { replace: true }
      );
      return;
    }
    if (location.pathname.startsWith('/admin')) return;
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => bindDocumentClicks(), []);

  return null;
}
