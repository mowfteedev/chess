import { useEffect, useRef, useState } from "react";
import { sounds } from "../utils/sound";

export interface RoomNotice {
  id: number;
  kind: "join" | "leave" | "rejoin";
  name: string;
  message: string;
}

interface RoomEventsOptions {
  code: string;
  role: "host" | "guest" | null;
  opponentName: string;
  opponentPresent: boolean;
  soundEnabled: boolean;
  active: boolean;
}

interface Presence {
  code: string;
  role: "host" | "guest";
  present: boolean;
  announcedPresent: boolean;
  everPresent: boolean;
}

export function useRoomEvents({
  code,
  role,
  opponentName,
  opponentPresent,
  soundEnabled,
  active,
}: RoomEventsOptions) {
  const [notice, setNotice] = useState<RoomNotice | null>(null);
  const presence = useRef<Presence | null>(null);
  const nextId = useRef(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const name = useRef(opponentName);
  name.current = opponentName;

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
    if (!soundEnabled) return;
    const unlock = () => sounds.unlock();
    // Register in the lobby too: the server's asynchronous reply is too late
    // to grant audio permission on browsers enforcing gesture-based autoplay.
    document.addEventListener("pointerdown", unlock, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", unlock, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, [soundEnabled]);

  useEffect(() => {
    clearTimeout(leaveTimer.current);
    if (!active || !code || !role) {
      presence.current = null;
      setNotice(null);
      return;
    }
    const publish = (kind: RoomNotice["kind"]) => {
      const currentName = name.current;
      setNotice({
        id: ++nextId.current,
        kind,
        name: currentName,
        message: `${currentName} ${kind === "leave" ? "đã rời bàn" : kind === "rejoin" ? "đã trở lại bàn" : "đã vào bàn"}.`,
      });
      if (kind === "leave") sounds.playLeave();
      else sounds.playJoin();
    };
    let previous = presence.current;
    if (!previous || previous.code !== code || previous.role !== role) {
      previous = {
        code,
        role,
        present: false,
        announcedPresent: false,
        everPresent: false,
      };
      presence.current = previous;
      setNotice(null);
    }
    previous.present = opponentPresent;
    if (opponentPresent) {
      if (!previous.announcedPresent) {
        publish(previous.everPresent ? "rejoin" : "join");
        previous.announcedPresent = true;
        previous.everPresent = true;
      }
    } else if (previous.announcedPresent) {
      // A quick reload can emit offline then online. Avoid a false departure
      // alert when the same player returns before the brief grace period.
      const current = previous;
      leaveTimer.current = setTimeout(() => {
        if (presence.current === current && !current.present) {
          current.announcedPresent = false;
          publish("leave");
        }
      }, 900);
    }
    return () => clearTimeout(leaveTimer.current);
  }, [active, code, role, opponentPresent]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  return { notice, dismissNotice: () => setNotice(null) };
}
