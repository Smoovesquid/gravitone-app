// Composition Journal — browse, load, delete, export saved compositions
import { useState } from "react";
import { getRecentCompositions, deleteComposition, rateComposition, exportComposition, importComposition } from "../game/journal";

export default function Journal({ onLoad, onClose }) {
  const [compositions, setCompositions] = useState(getRecentCompositions(50));
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [importError, setImportError] = useState(null);

  const handleDelete = (id) => {
    const updated = deleteComposition(id);
    setCompositions(updated.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleRate = (id, stars) => {
    const updated = rateComposition(id, stars);
    setCompositions(updated.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleExport = (id) => {
    const encoded = exportComposition(id);
    if (encoded) {
      navigator.clipboard.writeText(encoded).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    setImportError(null);
    const result = importComposition(importText.trim());
    if (result && result.rejected) {
      setImportError(result.reason);
    } else if (result) {
      setCompositions(getRecentCompositions(50));
      setImportText("");
      setShowImport(false);
    } else {
      setImportError("Invalid composition code — check that you copied the full string.");
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      position: "absolute",
      top: 60,
      left: "50%",
      transform: "translateX(-50%)",
      width: 400,
      maxWidth: "calc(100vw - 32px)",
      maxHeight: "calc(100vh - 140px)",
      overflowY: "auto",
      background: "rgba(10,10,15,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      padding: 20,
      zIndex: 40,
      backdropFilter: "blur(12px)",
      fontFamily: "inherit",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}>
          Journal
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowImport(!showImport)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.4)",
              fontSize: 10,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            import
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              fontSize: 14,
              padding: "2px 6px",
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Import section */}
      {showImport && (
        <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: importError ? 6 : 0 }}>
          <input
            type="text"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste shared composition code..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#fff",
              fontSize: 10,
              padding: "6px 10px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleImport}
            style={{
              background: "rgba(78,205,196,0.15)",
              border: "1px solid rgba(78,205,196,0.3)",
              borderRadius: 6,
              color: "#4ECDC4",
              fontSize: 10,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            load
          </button>
        </div>
        {importError && (
          <div style={{
            fontSize: 10,
            color: "rgba(220,80,60,0.9)",
            padding: "6px 8px",
            background: "rgba(220,80,60,0.08)",
            border: "1px solid rgba(220,80,60,0.2)",
            borderRadius: 6,
          }}>
            {importError}
          </div>
        )}
        </div>
      )}

      {compositions.length === 0 ? (
        <div style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.2)",
          fontSize: 11,
          padding: "30px 0",
        }}>
          No compositions saved yet.
          <br />
          <span style={{ fontSize: 10, opacity: 0.6 }}>
            Create something beautiful and hit save.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {compositions.map((comp) => (
            <div
              key={comp.id}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 2,
                }}>
                  {comp.name}
                </div>
                <div style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.25)",
                  display: "flex",
                  gap: 8,
                }}>
                  <span>{comp.wellCount} wells</span>
                  <span>{comp.settings.scale}</span>
                  <span>{formatDate(comp.createdAt)}</span>
                </div>
                {/* Star rating */}
                <div style={{ marginTop: 4, display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => handleRate(comp.id, star)}
                      style={{
                        cursor: "pointer",
                        fontSize: 10,
                        color: star <= comp.stars ? "#FFE66D" : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {star <= comp.stars ? "\u2605" : "\u2606"}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => onLoad(comp)}
                  style={{
                    background: "rgba(78,205,196,0.12)",
                    border: "1px solid rgba(78,205,196,0.25)",
                    borderRadius: 4,
                    color: "#4ECDC4",
                    fontSize: 9,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  load
                </button>
                <button
                  onClick={() => handleExport(comp.id)}
                  style={{
                    background: "rgba(184,184,255,0.1)",
                    border: "1px solid rgba(184,184,255,0.2)",
                    borderRadius: 4,
                    color: copiedId === comp.id ? "#88ff88" : "#B8B8FF",
                    fontSize: 9,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  {copiedId === comp.id ? "copied!" : "share"}
                </button>
                <button
                  onClick={() => handleDelete(comp.id)}
                  style={{
                    background: "rgba(255,107,107,0.08)",
                    border: "1px solid rgba(255,107,107,0.15)",
                    borderRadius: 4,
                    color: "rgba(255,107,107,0.5)",
                    fontSize: 9,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
