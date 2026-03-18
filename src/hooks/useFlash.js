import { useEffect, useState } from "react";

export function useFlash() {
  const [flashMap, setFlashMap] = useState({});

  const trigger = (hour, type) => {
    setFlashMap((previous) => ({
      ...previous,
      [hour]: { type, frames: 6 },
    }));
  };

  useEffect(() => {
    const hasFrame = Object.values(flashMap).some((entry) => entry.frames > 0);
    if (!hasFrame) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setFlashMap((previous) => {
        const next = {};
        Object.entries(previous).forEach(([hour, entry]) => {
          if (entry.frames > 1) {
            next[hour] = { ...entry, frames: entry.frames - 1 };
          }
        });
        return next;
      });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [flashMap]);

  return { flashMap, trigger };
}
