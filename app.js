/* Spin Wheel – 85% ZONK
 * - 18 slice, tepat 5 ZONK (ditampilkan di roda)
 * - P(ZONK) = 0.85 pada pemilihan hasil
 * - Hanya tombol SPIN + roda (tanpa log hasil di UI)
 */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Konfigurasi label (18 total; 5 ZONK) ----------
  const entries = [
    "ZONK", "+1 PERMEN", "Lanyard", "DOORPRIZE",
    "PERMEN", "SNACK", "ZONK", "Keychain",
    "DOORPRIZE", "SNACK", "PERMEN", "DOORPRIZE",
    "ZONK", "+1 PERMEN", "DOORPRIZE", "ZONK",
    "SNACK", "ZONK"
  ];

  const palette = {
    ZONK: "#ef4444",
    "DOORPRIZE": "#22c55e",
    PERMEN: "#f59e0b",
    SNACK: "#3b82f6",
    Keychain: "#facc15",
    Lanyard: "#f59e0b",
    "+1 PERMEN": "#ef4444"
  };

  // ---------- DOM ----------
  const canvas = document.getElementById("wheel");
  const spinBtn = document.getElementById("spinBtn");
  if (!canvas || !spinBtn) {
    console.error("Element hilang: #wheel atau #spinBtn");
    return;
  }
  const ctx = canvas.getContext("2d");

  // ---------- State & konstanta ----------
  const n = entries.length;
  const TAU = Math.PI * 2;
  const sector = TAU / n;
  let rotation = 0;       // radian
  let spinning = false;
  const ZONK_PROB = 0.95; // ubah ini jika ingin probabilitas lain

  // ---------- Util ----------
  const normalize = (a) => (a % TAU + TAU) % TAU;

  function colorFor(label, i) {
    for (const key of Object.keys(palette)) {
      if (label.toUpperCase().includes(key.replace("+1 ", "").toUpperCase()))
        return palette[key];
    }
    const hue = Math.floor((i / n) * 360);
    return `hsl(${hue} 80% 55%)`;
  }

  function wrapText(ctx, text, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (const w of words) {
      const test = (line ? line + " " : "") + w;
      const m = ctx.measureText(test);
      if (m.width > maxWidth && line) { lines.push(line); line = w; }
      else { line = test; }
    }
    if (line) lines.push(line);
    const total = lines.length * lineHeight;
    ctx.translate(0, -total / 2 + 6);
    for (const L of lines) { ctx.fillText(L, maxWidth, 0); ctx.translate(0, lineHeight); }
  }

  // ---------- Gambar roda ----------
  function drawWheel(angle = rotation) {
    const w = canvas.width, h = canvas.height;
    const r = Math.min(w, h) * 0.48;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);

    for (let i = 0; i < n; i++) {
      const start = i * sector - Math.PI / 2;
      const end = start + sector;

      // slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colorFor(entries[i], i);
      ctx.fill();

      // border
      ctx.strokeStyle = "#0b0c10";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, end, end);
      ctx.stroke();

      // label (termasuk ZONK)
      ctx.save();
      const mid = start + sector / 2;
      ctx.rotate(mid);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui, Segoe UI, Roboto, Arial";
      wrapText(ctx, entries[i], r - 14, 22);
      ctx.restore();
    }

    // hub
    ctx.beginPath();
    ctx.fillStyle = "#111827";
    ctx.arc(0, 0, r * 0.18, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1f2937";
    ctx.stroke();

    ctx.restore();
  }

  // ---------- Pemilihan hasil dengan P(ZONK)=85% ----------
  function pickIndexBiased() {
    const zonk = [], other = [];
    for (let i = 0; i < n; i++) (entries[i].includes("ZONK") ? zonk : other).push(i);
    const useZonk = (Math.random() < ZONK_PROB && zonk.length) || other.length === 0;
    const src = useZonk ? zonk : other;
    return src[Math.floor(Math.random() * src.length)];
  }

  // ---------- Animasi spin ----------
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;

    const selected = pickIndexBiased();
    const targetAngle = normalize(-(selected + 0.5) * sector); // pusat slice di atas
    const extraTurns = 4 + Math.floor(Math.random() * 3);      // 4..6 putaran
    const start = rotation;
    const endTarget = start + (extraTurns * TAU) + normalize(targetAngle - normalize(start));

    const duration = 4200 + Math.random() * 800; // ms
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      rotation = start + (endTarget - start) * easeOutCubic(t);
      drawWheel(rotation);
      if (t < 1) requestAnimationFrame(frame);
      else {
        spinning = false;
        spinBtn.disabled = false;
        // Tidak menampilkan teks hasil (sesuai permintaan)
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Event & inisialisasi ----------
  spinBtn.addEventListener("click", spin);
  drawWheel();

  // Responsive sizing
  function resize() {
    const card = document.querySelector(".card");
    const size = Math.min(card.clientWidth - 36, 600);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Runtime tests (console) ----------
  (function runTests(){
    console.assert(!!document.getElementById('wheel'), 'Test: canvas exists');
    console.assert(!!document.getElementById('spinBtn'), 'Test: spin button exists');
    const zonkCount = entries.filter(e => e.includes('ZONK')).length;
    console.assert(zonkCount === 5, `Test: exactly 5 ZONK slices (got ${zonkCount})`);
    // uji probabilitas ~0.85 (toleransi 3%)
    let trials = 6000, hits = 0;
    for (let i=0;i<trials;i++) {
      const idx = pickIndexBiased();
      if (entries[idx].includes('ZONK')) hits++;
    }
    const p = hits / trials;
    console.assert(Math.abs(p - 0.85) < 0.03, `Test: P(ZONK) ~= 0.85 (got ${p.toFixed(3)})`);
    console.info(`[tests] slices(ZONK)=${zonkCount}, P(ZONK)≈${p.toFixed(3)} (n=${trials})`);
  })();
});
