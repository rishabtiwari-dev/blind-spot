"use client";

import { useEffect, useState } from "react";

interface Props {
  decision: string;
}

export function LoadingState({ decision }: Props) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <h2 className="loading-title">Examining your reasoning...</h2>
      <p className="loading-description">
        Stress-testing your logic for unstated assumptions, overlooked factors, internal tensions,
        and missing evidence.
      </p>

      {isSlow && (
        <p className="loading-extended-note">
          Deep reflection across all 6 dimensions is taking a few moments longer than usual. Please stay on this page...
        </p>
      )}

      {decision && (
        <div className="loading-context" aria-label="Decision under examination">
          <span className="loading-context-label">Analyzing:</span>
          <p className="loading-context-text">“{decision}”</p>
        </div>
      )}
    </div>
  );
}

