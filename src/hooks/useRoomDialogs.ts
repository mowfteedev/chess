import { useEffect, useState } from "react";
export type Confirmation = "leave" | "resign" | "update";
export function useRoomDialogs(round: number, isGameOver: boolean) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  useEffect(() => setResultDismissed(false), [round]);
  useEffect(() => {
    if (!isGameOver) setResultDismissed(false);
  }, [isGameOver]);
  return {
    helpOpen,
    setHelpOpen,
    appearanceOpen,
    setAppearanceOpen,
    shareOpen,
    setShareOpen,
    historyOpen,
    setHistoryOpen,
    confirmation,
    setConfirmation,
    resultDismissed,
    setResultDismissed,
  };
}
