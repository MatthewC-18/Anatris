// src/hooks/useStudySync.ts
//
// Wires the local study state to the user's account when a StudyCloud is
// available (real Supabase backend + signed-in user). It is LOCAL-FIRST and
// best-effort: progress always lives in localStorage and the app works fully
// offline / in demo mode; the cloud is a convenience that merges across devices.
//
// Lifecycle:
//   1. On sign-in, PULL the remote snapshot and merge it into local storage
//      (monotonic merge — nothing is lost), then re-push the reconciled state so
//      both sides converge. If there's no remote yet, seed it from local.
//   2. While studying, PUSH the local snapshot (debounced) whenever progress
//      changes, so the next device sees it.
// Every cloud call is guarded; a failure silently leaves the user local-only.

import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { exportStudyState, importStudyState } from '../lib/studyState';

const PUSH_DEBOUNCE_MS = 1500;

/**
 * @param activityKey a counter the caller bumps on any study activity (e.g. the
 *   StudyView refreshKey); changes trigger a debounced upload.
 * @param onMerged called after a remote pull merges new data in, so the UI can
 *   re-read the now-updated local storage.
 */
export function useStudySync(activityKey: number, onMerged?: () => void): void {
  const { snapshot, studyCloud } = useAuth();
  const userId = snapshot.user?.id ?? null;
  const cloud = studyCloud;

  // Guards so the debounced push never clobbers the remote before the initial
  // pull has reconciled, and so we pull only once per signed-in user.
  const readyRef = useRef(false);
  const pulledForRef = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Pull + merge on sign-in.
  useEffect(() => {
    readyRef.current = false;
    if (!userId || !cloud) return;
    if (pulledForRef.current === userId) {
      readyRef.current = true;
      return;
    }
    pulledForRef.current = userId;
    let alive = true;
    (async () => {
      try {
        const remote = await cloud.pull(userId);
        if (!alive) return;
        if (remote) {
          const merged = importStudyState(remote);
          onMerged?.();
          await cloud.push(userId, merged);
        } else {
          await cloud.push(userId, exportStudyState());
        }
      } catch {
        /* best-effort: stay local-first. */
      } finally {
        if (alive) readyRef.current = true;
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, cloud, onMerged]);

  // 2. Debounced push on local study activity (after the initial pull).
  useEffect(() => {
    if (!userId || !cloud || !readyRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      cloud.push(userId, exportStudyState()).catch(() => {
        /* ignore: will retry on the next activity. */
      });
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [activityKey, userId, cloud]);
}
