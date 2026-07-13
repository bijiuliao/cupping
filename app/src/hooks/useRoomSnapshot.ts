import { useEffect, useState } from 'react';
import { getBackend } from '../lib/backend';
import type { RoomSnapshot } from '../lib/types';

/** undefined = still loading, null = room not found */
export function useRoomSnapshot(roomId: string | null): RoomSnapshot | null | undefined {
  const [snap, setSnap] = useState<RoomSnapshot | null | undefined>(undefined);

  useEffect(() => {
    if (!roomId) {
      setSnap(null);
      return;
    }
    setSnap(undefined);
    const backend = getBackend();
    const unsub = backend.subscribeRoom(roomId, setSnap);
    return unsub;
  }, [roomId]);

  return snap;
}

export function useElapsedSeconds(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}
