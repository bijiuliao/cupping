import { useEffect, useState } from 'react';
import { RoomHeader } from './components/RoomHeader';
import { HostControlBar } from './components/HostControlBar';
import { SetAnswersSheet } from './components/SetAnswersSheet';
import { LobbyScreen } from './screens/LobbyScreen';
import { ScoringScreen } from './screens/ScoringScreen';
import { WaitSubmittedScreen, WaitRevealScreen } from './screens/WaitScreens';
import { GuessScreen } from './screens/GuessScreen';
import { RevealOpenScreen } from './screens/RevealOpenScreen';
import { RevealBlindScreen } from './screens/RevealBlindScreen';
import { useRoomSnapshot } from './hooks/useRoomSnapshot';
import { getBackend } from './lib/backend';
import { findParticipant, submittedCount } from './lib/selectors';
import { fmtTime } from './lib/coe';
import { useElapsedSeconds } from './hooks/useRoomSnapshot';

export function RoomContainer({ roomId, clientId, onLeaveRoom }: { roomId: string; clientId: string; onLeaveRoom: () => void }) {
  const backend = getBackend();
  const snap = useRoomSnapshot(roomId);
  const [answerSheetOpen, setAnswerSheetOpen] = useState(false);

  useEffect(() => {
    if (snap === null) onLeaveRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);

  const elapsed = useElapsedSeconds(snap?.room.scoringStartedAt ?? null);

  if (!snap) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
        載入房間中…
      </div>
    );
  }

  const me = findParticipant(snap, clientId);
  if (!me) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
        找不到你在這個房間的身份，請回首頁重新加入。
      </div>
    );
  }

  const isHost = me.role === 'host';
  const { room } = snap;
  const isBlind = room.mode === 'blind';

  let view: 'lobby' | 'scoring' | 'waitSub' | 'guess' | 'waitReveal' | 'revealOpen' | 'revealBlind';
  if (room.stage === 'waiting') view = 'lobby';
  else if (room.stage === 'scoring') view = me.submittedAt ? 'waitSub' : 'scoring';
  else if (room.stage === 'locked') view = isBlind ? (me.guessSubmittedAt ? 'waitReveal' : 'guess') : 'waitReveal';
  else view = isBlind ? 'revealBlind' : 'revealOpen';

  const subCnt = submittedCount(snap);
  const total = snap.participants.length;
  let hostActionLabel = '';
  let hostHint = '';
  let showAction = true;
  if (room.stage === 'waiting') {
    hostActionLabel = '開始評分 ▶';
    hostHint = total + ' 位已加入，準備就緒';
  } else if (room.stage === 'scoring') {
    hostActionLabel = '鎖定交卷 🔒';
    hostHint = '已交卷 ' + subCnt + '/' + total + ' · 已計時 ' + fmtTime(elapsed);
  } else if (room.stage === 'locked') {
    if (isBlind && !room.answerConfirmed) {
      hostActionLabel = '設定正確答案 🔑';
      hostHint = '公佈前請先設定各樣本對應的豆子';
    } else {
      hostActionLabel = '公佈結果 📣';
      hostHint = isBlind ? '答案已設定，等待大家猜豆' : '交卷已鎖定，可公佈結果';
    }
  } else {
    showAction = false;
    hostHint = '結果已公佈給所有人';
  }

  async function hostAction() {
    if (room.stage === 'waiting') {
      await backend.setStage(roomId, 'scoring', { scoringStartedAt: new Date().toISOString() });
    } else if (room.stage === 'scoring') {
      await backend.setStage(roomId, 'locked');
    } else if (room.stage === 'locked') {
      if (isBlind && !room.answerConfirmed) {
        setAnswerSheetOpen(true);
      } else {
        await backend.setStage(roomId, 'reveal');
        await backend.finalizeReveal(roomId);
      }
    }
  }

  return (
    <>
      <RoomHeader code={room.code} mode={room.mode} />
      {view === 'lobby' && <LobbyScreen snap={snap} myClientId={clientId} />}
      {view === 'scoring' && <ScoringScreen snap={snap} myParticipantId={me.id} />}
      {view === 'waitSub' && <WaitSubmittedScreen snap={snap} />}
      {view === 'guess' && <GuessScreen snap={snap} myParticipantId={me.id} />}
      {view === 'waitReveal' && <WaitRevealScreen mode={room.mode} />}
      {view === 'revealOpen' && <RevealOpenScreen snap={snap} myParticipantId={me.id} isHost={isHost} onResetAll={onLeaveRoom} />}
      {view === 'revealBlind' && <RevealBlindScreen snap={snap} myParticipantId={me.id} isHost={isHost} onResetAll={onLeaveRoom} />}

      {isHost && (
        <HostControlBar stage={room.stage} hint={hostHint} actionLabel={hostActionLabel} onAction={hostAction} showAction={showAction} />
      )}
      {isHost && (
        <SetAnswersSheet snap={snap} open={answerSheetOpen} onClose={() => setAnswerSheetOpen(false)} onConfirmed={() => setAnswerSheetOpen(false)} />
      )}
    </>
  );
}
