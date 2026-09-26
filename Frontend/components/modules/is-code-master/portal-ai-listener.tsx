"use client";

import { useEffect } from "react";
import { solveIsPortalCaptcha } from "@backend/actions/is-code-portal-ai";

/** Lives on every dashboard page so Grok can fill portal captcha even if the IS form is not focused. */
export function IsCodePortalAiListener() {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== "QE_CAPTCHA_AI") return;
      void solveIsPortalCaptcha(String(data.image || "")).then((result) => {
        window.postMessage(
          {
            type: "QE_CAPTCHA_AI_RESULT",
            requestId: data.requestId || "",
            text: result.ok ? result.text : "",
            error: result.ok ? "" : result.error,
          },
          "*",
        );
        window.postMessage(
          {
            type: "QE_IS_CODE_PROGRESS",
            message: result.ok && result.text
              ? "Grok / QE Assistant read the security image. Filling captcha…"
              : result.ok
                ? "AI saw the image but could not read the characters. Retrying…"
                : result.error || "AI captcha read failed.",
          },
          "*",
        );
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
