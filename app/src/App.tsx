import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { HostSetupScreen } from './screens/HostSetupScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { RoomContainer } from './RoomContainer';
import { getBackend, type CreateRoomInput } from './lib/backend';
import { getClientId, getUserName, setUserName as persistUserName } from './lib/identity';

type Route = { kind: 'home' } | { kind: 'setup' } | { kind: 'archive' } | { kind: 'room'; roomId: string };

const ROOM_ID_KEY = 'cupping.roomId';

function App() {
  const clientId = useState(getClientId)[0];
  const [userName, setUserNameState] = useState(getUserName);
  const [route, setRoute] = useState<Route>(() => {
    const savedRoomId = sessionStorage.getItem(ROOM_ID_KEY);
    return savedRoomId ? { kind: 'room', roomId: savedRoomId } : { kind: 'home' };
  });

  function updateUserName(name: string) {
    setUserNameState(name);
    persistUserName(name);
  }

  function goHome() {
    sessionStorage.removeItem(ROOM_ID_KEY);
    setRoute({ kind: 'home' });
  }

  async function handleJoin(code: string): Promise<boolean> {
    const backend = getBackend();
    const roomId = await backend.findRoomByCode(code);
    if (!roomId) return false;
    await backend.ensureParticipant(roomId, clientId, userName.trim() || '你', 'participant');
    sessionStorage.setItem(ROOM_ID_KEY, roomId);
    setRoute({ kind: 'room', roomId });
    return true;
  }

  async function handleCreateRoom(input: Omit<CreateRoomInput, 'hostName' | 'hostClientId'>) {
    const backend = getBackend();
    const { roomId } = await backend.createRoom({ ...input, hostName: userName.trim() || '你', hostClientId: clientId });
    await backend.ensureParticipant(roomId, clientId, userName.trim() || '你', 'host');
    // Fire-and-forget: grow the shared bean catalog, but never block entering the room on it.
    input.beans.forEach((b) => {
      backend.upsertBeanToCatalog(b).catch(() => {});
    });
    sessionStorage.setItem(ROOM_ID_KEY, roomId);
    setRoute({ kind: 'room', roomId });
  }

  return (
    <div
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 0 60px rgba(0,0,0,.6)',
      }}
    >
      {route.kind === 'home' && (
        <HomeScreen
          userName={userName}
          onUserNameChange={updateUserName}
          onJoin={handleJoin}
          onGoSetup={() => setRoute({ kind: 'setup' })}
          onGoArchive={() => setRoute({ kind: 'archive' })}
        />
      )}
      {route.kind === 'setup' && <HostSetupScreen onBack={() => setRoute({ kind: 'home' })} onCreateRoom={handleCreateRoom} />}
      {route.kind === 'archive' && <ArchiveScreen userName={userName} onBack={() => setRoute({ kind: 'home' })} />}
      {route.kind === 'room' && <RoomContainer roomId={route.roomId} clientId={clientId} onLeaveRoom={goHome} />}
    </div>
  );
}

export default App;
