import { useState, useEffect } from "react";

function ToastItem({ message, onDone }) {
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);

  useEffect(() => {
    requestAnimationFrame(() => { setOpacity(1); setTranslateY(0); });
    const timer = setTimeout(() => {
      setOpacity(0);
      setTranslateY(-20);
      setTimeout(onDone, 400);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 8,
      padding: "8px 14px",
      color: "rgba(255,255,255,0.7)",
      fontSize: 11,
      fontFamily: "inherit",
      letterSpacing: "0.05em",
      opacity,
      transform: `translateY(${translateY}px)`,
      transition: "all 0.4s ease",
      backdropFilter: "blur(8px)",
      maxWidth: 280,
      pointerEvents: "none",
    }}>
      {message}
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: "absolute",
      top: 60,
      right: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      zIndex: 20,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} onDone={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
