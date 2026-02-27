import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export function usePageParameters() {
  const location = useLocation();
  const urlParams = useParams();
  
  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const params: Record<string, any> = {};
    
    searchParams.forEach((value, key) => {
      // Try to parse as JSON, fallback to string
      try {
        params[key] = JSON.parse(value);
      } catch {
        // If it's a number, parse it
        if (!isNaN(Number(value)) && value.trim() !== '') {
          params[key] = Number(value);
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          params[key] = value.toLowerCase() === 'true';
        } else {
          params[key] = value;
        }
      }
    });
    
    return params;
  }, [location.search]);

  const routeParams = useMemo(() => {
    const params: Record<string, any> = {};
    
    Object.entries(urlParams).forEach(([key, value]) => {
      if (value !== undefined) {
        // Try to parse as number or boolean
        if (!isNaN(Number(value)) && value.trim() !== '') {
          params[key] = Number(value);
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          params[key] = value.toLowerCase() === 'true';
        } else {
          params[key] = value;
        }
      }
    });
    
    return params;
  }, [urlParams]);

  const allParams = useMemo(() => ({
    ...routeParams,
    ...queryParams
  }), [routeParams, queryParams]);

  return {
    queryParams,
    routeParams,
    allParams,
    getParameter: (name: string, defaultValue?: any) => {
      return allParams[name] ?? defaultValue;
    }
  };
}