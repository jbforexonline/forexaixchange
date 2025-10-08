'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Home() {
  const [heartbeatTs, setHeartbeatTs] = useState<number | null>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch(`${apiUrl}/health`).then(r => r.json()).then(setHealth);

    const socket = io(apiUrl, { transports: ['websocket'] });
    socket.on('heartbeat', (msg: { ts: number }) => setHeartbeatTs(msg.ts));

    return () => { socket.off('heartbeat'); socket.close(); };
  }, []);

  return (
    <main className="p-8 space-y-2">
      <h1 className="text-2xl font-bold">forexaixchange</h1>
      <p>Backend health: {health ? 'ok' : 'loading...'}</p>
      <p>Realtime heartbeat: {heartbeatTs ?? 'waiting...'}</p>
    </main>
  );
}
