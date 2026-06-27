"use client";

import { useEffect } from "react";
import { connectLiveFeed } from "@/lib/api/crisis.api";
import type { JarArtifact } from "@/lib/api/crisis.api";

interface Props {
  token: string;
  sessionId: string;
  onArtifactsReady: (newArtifacts: Pick<JarArtifact, "id" | "artifact_type" | "title" | "created_at">[]) => void;
  onNudge: (content: string) => void;
}

export function LiveFeedListener({ token, sessionId, onArtifactsReady, onNudge }: Props) {
  useEffect(() => {
    if (!sessionId || !token) return;

    let cancelled = false;

    async function listen() {
      try {
        for await (const event of connectLiveFeed(token, sessionId)) {
          if (cancelled) break;
          if (event.type === "artifacts_ready") {
            onArtifactsReady(event.artifacts);
          } else if (event.type === "nudge") {
            onNudge(event.nudge.content);
          }
        }
      } catch {
        // Connection ended — OK
      }
    }

    listen();
    return () => { cancelled = true; };
  }, [token, sessionId]);

  return null;
}
