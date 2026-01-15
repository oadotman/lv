import { useEffect, useState } from 'react';

export function useOrganization() {
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stub implementation
    setLoading(false);
  }, []);

  return { organization, loading };
}
