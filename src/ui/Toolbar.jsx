import { DRUM_TYPES, DRUM_ORDER } from "../audio/drums";

const PALETTE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF8A5C", "#B8B8FF", "#F7AEF8", "#72DDF7"];
const NOTE_LABELS = ["Q", "W", "E", "R", "T", "Y", "U", "I"];
const DRUM_LABELS = { kick: "K", snare: "S", hihat: "H", clap: "C", tom: "T", rimshot: "R", shaker: "Sh", cowbell: "Cb" };

const btnBase = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "rgba(255,255,255,0.5)",
  fontSize: 11,
  padding: "6px 12px",
  cursor: "pointer",
  letterSpacing: "0.08em",
  transition: "all 0.2s",
  fontFamily: "inherit",
  background: "rgba(255,255,255,0.06)",
};

function ModeBtn({ label, active, onClick, activeColor }) {
  return (
    <button onClick={onClick} style={{
      ...btnBase, fontSize: 10, padding: "5px 10px",
      background: active ? (activeColor ? `rgba(${activeColor},0.2)` : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)",
      borderColor: active ? (activeColor ? `rgba(${activeColor},0.4)` : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.1)",
      color: active ? (activeColor ? `rgb(${activeColor})` : "#fff") : "rgba(255,255,255,0.4)",
    }}>
      {label}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />;
}

// Note pills — show scale notes with palette colors
function NotePills({ scaleNotes, selectedIdx, onSelect }) {
  const count = Math.min(scaleNotes.length, 8);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => {
        const active = i === selectedIdx;
        const color = PALETTE_COLORS[i % PALETTE_COLORS.length];
        return (
          <button key={i} onClick={() => onSelect(i)} style={{
            width: 22, height: 20, borderRadius: 4, border: "none", cursor: "pointer",
            fontSize: 8, fontFamily: "inherit", fontWeight: 700,
            background: active ? color : "rgba(255,255,255,0.06)",
            color: active ? "#000" : "rgba(255,255,255,0.3)",
            transition: "all 0.15s",
            boxShadow: active ? `0 0 8px ${color}40` : "none",
          }}>
            {NOTE_LABELS[i]}
          </button>
        );
      })}
    </div>
  );
}

// Drum pills — show drum types with their colors
function DrumPills({ selected, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {DRUM_ORDER.map((dt, i) => {
        const active = dt === selected;
        const drum = DRUM_TYPES[dt];
        const color = drum.color.core;
        return (
          <button key={dt} onClick={() => onSelect(dt)} style={{
            minWidth: 22, height: 20, borderRadius: 4, border: "none", cursor: "pointer",
            fontSize: 8, fontFamily: "inherit", fontWeight: 700, padding: "0 4px",
            background: active ? color : "rgba(255,255,255,0.06)",
            color: active ? "#000" : "rgba(255,255,255,0.3)",
            transition: "all 0.15s",
            boxShadow: active ? `0 0 8px ${color}40` : "none",
          }}>
            {DRUM_LABELS[dt] || dt[0].toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export default function Toolbar({
  wellMode, scaleName, instrumentName, bpm, quantize,
  selectedNoteIdx, selectedDrumType, scaleNotes,
  showHint, started,
  onSetMode, onSelectNote, onSelectDrum,
  onCycleScale, onCycleInstrument, onCycleBpm, onToggleQuantize,
  onClear, onSave, onToggleJournal, onSickBeat,
}) {
  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, right: 16,
      display: "flex", justifyContent: "space-between", alignItems: "flex-end", zIndex: 10,
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {/* Mode selector */}
        <ModeBtn label="tone" active={wellMode === "tone"} onClick={() => onSetMode("tone")} />
        <ModeBtn label="drum" active={wellMode === "drum"} onClick={() => onSetMode("drum")} />
        <ModeBtn label="void" active={wellMode === "blackhole"} onClick={() => onSetMode("blackhole")} />
        <ModeBtn label="loop" active={wellMode === "looper"} onClick={() => onSetMode("looper")} activeColor="100,200,255" />
        <ModeBtn label="warp" active={wellMode === "station"} onClick={() => onSetMode("station")} activeColor="255,204,51" />
        <ModeBtn label="pulse" active={wellMode === "pulsar"} onClick={() => onSetMode("pulsar")} activeColor="200,224,255" />
        <ModeBtn label="neutron" active={wellMode === "neutronstar"} onClick={() => onSetMode("neutronstar")} activeColor="255,68,34" />

        <Sep />

        {/* Context-sensitive sound selector */}
        {(wellMode === "tone" || wellMode === "looper") && (
          <NotePills scaleNotes={scaleNotes} selectedIdx={selectedNoteIdx} onSelect={onSelectNote} />
        )}
        {(wellMode === "drum") && (
          <DrumPills selected={selectedDrumType} onSelect={onSelectDrum} />
        )}

        <Sep />

        {/* Scale + instrument */}
        <button onClick={onCycleScale} style={btnBase}>{scaleName}</button>
        <button onClick={onCycleInstrument} style={btnBase}>{instrumentName}</button>

        <Sep />

        {/* Timing */}
        <button onClick={onCycleBpm} style={{ ...btnBase, fontVariantNumeric: "tabular-nums" }}>{bpm}</button>
        <ModeBtn label="grid" active={quantize} onClick={onToggleQuantize} activeColor="255,107,107" />

        <Sep />

        {/* Actions */}
        <button onClick={onClear} style={btnBase}
          onMouseEnter={(e) => { e.target.style.background = "rgba(255,107,107,0.15)"; e.target.style.color = "rgba(255,107,107,0.8)"; }}
          onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.color = "rgba(255,255,255,0.5)"; }}
        >clear</button>
        <button onClick={onSave} style={btnBase}>save</button>
        <button onClick={onToggleJournal} style={btnBase}>journal</button>

        <Sep />

        <button onClick={onSickBeat} style={{
          ...btnBase,
          background: "linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,170,68,0.2))",
          borderColor: "rgba(255,140,80,0.4)",
          color: "#FF8A5C",
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
          onMouseEnter={(e) => { e.target.style.background = "linear-gradient(135deg, rgba(255,107,107,0.35), rgba(255,170,68,0.35))"; e.target.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.target.style.background = "linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,170,68,0.2))"; e.target.style.color = "#FF8A5C"; }}
        >sick beat</button>
      </div>

      {/* Hints */}
      <div style={{
        fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "right",
        lineHeight: 1.8, letterSpacing: "0.05em", flexShrink: 0, pointerEvents: "none",
      }}>
        {showHint && !started ? (
          <>
            click to place a gravity well
            <br />hold longer = stronger pull
            <br /><span style={{ opacity: 0.6 }}>1-6 modes · Q-I sounds · S scale · A inst · G grid · Z undo</span>
          </>
        ) : showHint ? (
          <>hold + drag to spray particles</>
        ) : null}
      </div>
    </div>
  );
}
