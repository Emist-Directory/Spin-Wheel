/* Spin Wheel – distribusi terkontrol:
 * ZONK 85%, PERMEN 7%, SNACK 5%, OTHER 2.5%, DOORPRIZE 0.5%
 * Catatan: "PERMEN" mencakup label yang mengandung kata PERMEN (termasuk "+1 PERMEN")
 */
document.addEventListener("DOMContentLoaded", () => {
  // ---------- 18 slice; 5 ZONK; DOORPRIZE ganti salah satu SPECIAL SPIN; Keychain tetap ----------
  const entries = [
    "ZONK", "Lanyard", "DOORPRIZE",   // <- ganti SPECIAL SPIN jadi DOORPRIZE
    "PERMEN", "SNACK", "ZONK", "Keychain",         // <- Keychain tetap
    "DOORPRIZE", "SNACK", "PERMEN", "DOORPRIZE",
    "ZONK", "DOORPRIZE", "ZONK",
    "SNACK", "ZONK"
  ];

  const palette = {
    ZONK: "#ef4444",
    PERMEN: "#f59e0b",
    SNACK: "#3b82f6",
    DOORPRIZE: "#eab308",
    Keychain: "#facc15",
    Lanyard: "#f59e0b",
  };

  // ---------- DOM ----------
  const canvas = document.getElementById("wheel");
  const spinBtn = document.getElementById("spinBtn");
  const modal = document.getElementById("resultModal");
  const resultText = document.getElementById("resultText");
  const continueBtn = document.getElementById("continueBtn");
  if (!canvas || !spinBtn || !modal || !resultText || !continueBtn) {
    console.error("Missing required DOM nodes"); return;
  }
  const ctx = canvas.getContext("2d");

  // ---------- State ----------
  const n = entries.length;
  const TAU = Math.PI * 2;
  const sector = TAU / n;
  let rotation = 0;
  let spinning = false;

  // ---------- Utils ----------
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
    let line = "", lines = [];
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

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colorFor(entries[i], i);
      ctx.fill();

      ctx.strokeStyle = "#0b0c10";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, end, end);
      ctx.stroke();

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

  // ---------- Probabilitas kategori spesifik ----------
  // Kumulatif: ZONK 0.85, PERMEN 0.92, SNACK 0.97, DOORPRIZE 0.975, OTHER 1.0
  function pickIndexBiased() {
    const groups = { ZONK: [], PERMEN: [], SNACK: [], DOORPRIZE: [], OTHER: [] };

    for (let i = 0; i < n; i++) {
      const label = entries[i].toUpperCase();
      if (label.includes("ZONK")) groups.ZONK.push(i);
      else if (label.includes("PERMEN")) groups.PERMEN.push(i); // termasuk "+1 PERMEN"
      else if (label.includes("SNACK")) groups.SNACK.push(i);
      else if (label.includes("DOORPRIZE")) groups.DOORPRIZE.push(i);
      else groups.OTHER.push(i); // SPECIAL SPIN, Lanyard, Keychain, dll
    }

    const thresholds = [
      ["ZONK", 0.85],
      ["PERMEN", 0.92],      // +7%
      ["SNACK", 0.97],       // +5%
      ["DOORPRIZE", 0.975],  // +0.5%
      ["OTHER", 1.0]         // sisa 2.5%
    ];

    const r = Math.random();
    let chosen = "OTHER";
    for (const [name, t] of thresholds) {
      if (r < t) { chosen = name; break; }
    }

    let bag = groups[chosen];
    if (!bag.length) {
      bag = groups.ZONK.length ? groups.ZONK :
            groups.PERMEN.length ? groups.PERMEN :
            groups.SNACK.length ? groups.SNACK :
            groups.DOORPRIZE.length ? groups.DOORPRIZE :
            groups.OTHER;
    }
    return bag[Math.floor(Math.random() * bag.length)];
  }

  // ---------- Modal helpers ----------
  function showModal(text){
    resultText.textContent = text;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    continueBtn.focus();
  }
  function hideModal(){
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    spinBtn.focus();
  }
  continueBtn.addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

  // ---------- Animasi spin ----------
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;

    const selected = pickIndexBiased();
    const targetAngle = normalize(-(selected + 0.5) * sector);
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const start = rotation;
    const endTarget = start + (extraTurns * TAU) + normalize(targetAngle - normalize(start));

    const duration = 4200 + Math.random() * 800;
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
        showModal(entries[selected]); // tampilkan pop-up hasil
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Hook UI & init ----------
  spinBtn.addEventListener("click", spin);
  drawWheel();

  // responsive sizing
  function resize() {
    const card = document.querySelector(".card");
    const size = Math.min(card.clientWidth - 36, 600);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  // (opsional) tes distribusi di console
  (function runTests(){
    const counts = { ZONK:0, PERMEN:0, SNACK:0, DOORPRIZE:0, OTHER:0 };
    const trials = 10000;
    for (let i=0;i<trials;i++){
      const idx = pickIndexBiased();
      const L = entries[idx].toUpperCase();
      if (L.includes("ZONK")) counts.ZONK++;
      else if (L.includes("PERMEN")) counts.PERMEN++;
      else if (L.includes("SNACK")) counts.SNACK++;
      else if (L.includes("DOORPRIZE")) counts.DOORPRIZE++;
      else counts.OTHER++;
    }
    const pct = Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,(v/trials*100)]));
    console.info("[tests] approx %", Object.fromEntries(Object.entries(pct).map(([k,v])=>[k, v.toFixed(2)])));
  })();
});
