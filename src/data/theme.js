// Single visual theme — dark cosmic instrument aesthetic

export const THEME = {
  background: "#06060c",
  gridColor: "rgba(255,255,255,0.025)",
  starDensity: 0.4,
  starColors: ["#ffffff", "#aaccff", "#ffccaa", "#ccaaff"],
  nebulaClouds: [
    { color: "rgba(80, 40, 140, 0.04)", x: 0.25, y: 0.35, radius: 0.35 },
    { color: "rgba(40, 80, 130, 0.03)", x: 0.7, y: 0.6, radius: 0.28 },
    { color: "rgba(100, 50, 80, 0.02)", x: 0.5, y: 0.8, radius: 0.2 },
  ],
  physics: {
    gravityMultiplier: 1.3,
    particleSpeed: 1.2,
    damping: 0.997,
    maxParticles: 150,
  },
  particleTrailColor: "rgba(255,255,255,0.14)",
  pulsarColor: "#cce8ff", // cool blue-white — never purple, never cyan, never warm
  neutronStarColor: "#ff4422", // hot red-orange — dense, bright, banded
  quasarCoreColor: "#e8f4ff",  // blue-white compact core — jets only, no ambient glow
  cruiser: {
    hull: "#181d23",           // dark gunmetal
    hullEdge: "rgba(200,110,55,0.65)", // red-orange accent lighting
    beam: "rgba(190,255,110,", // tractor beam (append alpha + ")")
    beamGlow: "rgba(160,255,80,",
    engine: "rgba(255,150,50,",
    label: "rgba(180,255,100,",
  },
};
