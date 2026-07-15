import { useEffect, useState } from 'react';
import { ORIGINS, PROCESSES, VARIETIES } from '../lib/coe';
import { fetchLoffeeOrigins, fetchLoffeeProcesses, fetchLoffeeVarieties } from '../lib/loffeeLabs';

function merge(base: string[], extra: string[]): string[] {
  const set = new Set(base);
  extra.forEach((x) => set.add(x.trim()));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Origin/process/variety dropdown options, starting from the curated static
 * lists (always available, even offline or with no Loffee Labs key) and
 * merged with Loffee Labs' public lookup lists once they arrive.
 */
export function useLoffeeOptions() {
  const [origins, setOrigins] = useState<string[]>(ORIGINS);
  const [processes, setProcesses] = useState<string[]>(PROCESSES);
  const [varieties, setVarieties] = useState<string[]>(VARIETIES);

  useEffect(() => {
    let cancelled = false;
    fetchLoffeeOrigins().then((extra) => {
      if (!cancelled && extra.length) setOrigins((cur) => merge(cur, extra));
    });
    fetchLoffeeProcesses().then((extra) => {
      if (!cancelled && extra.length) setProcesses((cur) => merge(cur, extra));
    });
    fetchLoffeeVarieties().then((extra) => {
      if (!cancelled && extra.length) setVarieties((cur) => merge(cur, extra));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { origins, processes, varieties };
}
