/* Spin Wheel – distribusi:
 * ZONK 85%, PERMEN 7%, SNACK 6%, KEYCHAIN+LANYARD 1.5%, DOORPRIZE 0.5%
 * Hanya tombol SPIN + roda; pop-up hasil + tombol Continue (fallback ke alert).
 */
document.addEventListener("DOMContentLoaded", () => {
  // ---------- 18 slice; 5 ZONK; tanpa "+1 PERMEN"; semua SPECIAL SPIN -> DOORPRIZE ----------
  const entries = [
    "ZONK", "PERMEN", "Lanyard", "DOORPRIZE",
    "PERMEN", "SNACK", "ZONK", "Keychain",
    "DOORPRIZE", "SNACK", "PERMEN", "DOORPRIZE",
    "ZONK", "PERMEN", "DOORPRIZE", "ZONK",
    "SNACK", "ZONK"
  ];

  const palette = {
    ZONK: "#ef4444",        // merah
    DOORPRIZE: "#eab308",   // emas
    PERMEN: "#ec4899",      // pink
    SNACK: "#3b82f6",       // biru
    Lanyard: "#f97316",     // oranye
    Keychain: "#c4b5fd"     // ungu muda
  };

  // ---------- DOM ----------
  const canvas = document.getElementById("wheel");
  const spinBtn = document.getElementById("spinBtn");
  const modal = document.getElementById("resultModal");
  const resultText = document.getElementById("resultText");
  const continueBtn = document.getElementById("continueBtn");

  if (!canvas || !spinBtn) { console.error("Missing #wheel or #spinBtn"); return; }
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
    const L = label.toUpperCase();
    if (L.includes("ZONK")) return palette.ZONK;
    if (L.includes("DOORPRIZE")) return palette.DOORPRIZE;
    if (L.includes("PERMEN")) return palette.PERMEN;
    if (L.includes("SNACK")) return palette.SNACK;
    if (L.includes("LANYARD")) return palette.Lanyard;
    if (L.includes("KEYCHAIN")) return palette.Keychain;
    // fallback: gradasi
    const hue = Math.floor((i / n) * 360);
    return `hsl(${hue} 80% 55%)`;
  }

  function wrapText(ctx, text, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "", lines = [];
    for (const w of words) {
      const test = (line ? line + " " : "") + w;
      const m = ctx.measureText(test);
      if (m.width > maxWidth && line) { lines.push(line); line = w; } else { line = test; }
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

  // ---------- Probabilitas spesifik ----------
  // Kumulatif:
  // ZONK 0.85, PERMEN 0.92, SNACK 0.98, KEY+LANY 0.995, DOORPRIZE 1.0
  function pickIndexBiased() {
    const groups = { ZONK: [], PERMEN: [], SNACK: [], KEYCHAIN: [], LANYARD: [], DOORPRIZE: [] };

    for (let i = 0; i < n; i++) {
      const L = entries[i].toUpperCase();
      if (L.includes("ZONK")) groups.ZONK.push(i);
      else if (L.includes("PERMEN")) groups.PERMEN.push(i);
      else if (L.includes("SNACK")) groups.SNACK.push(i);
      else if (L.includes("KEYCHAIN")) groups.KEYCHAIN.push(i);
      else if (L.includes("LANYARD")) groups.LANYARD.push(i);
      else if (L.includes("DOORPRIZE")) groups.DOORPRIZE.push(i);
    }

    const thresholds = [
      ["ZONK", 0.85],       // 85%
      ["PERMEN", 0.92],     // +7%  = 92%
      ["SNACK", 0.98],      // +6%  = 98%
      ["KEY_LANY", 0.995],  // +1.5%= 99.5%
      ["DOORPRIZE", 1.0]    // +0.5%= 100%
    ];

    const r = Math.random();
    let chosen = "DOORPRIZE"; // default akhir
    for (const [name, t] of thresholds) { if (r < t) { chosen = name; break; } }

    let bag;
    if (chosen === "KEY_LANY") {
      const keyOrLany = [...groups.KEYCHAIN, ...groups.LANYARD];
      bag = keyOrLany;
      if (!bag.length) bag = groups.ZONK.length ? groups.ZONK : groups.PERMEN.length ? groups.PERMEN :
                             groups.SNACK.length ? groups.SNACK : groups.DOORPRIZE.length ? groups.DOORPRIZE :
                             [];
    } else {
      bag = groups[chosen] || [];
      if (!bag.length) {
        // fallback urutan wajar jika kategori kosong di roda
        bag = groups.ZONK.length ? groups.ZONK :
              groups.PERMEN.length ? groups.PERMEN :
              groups.SNACK.length ? groups.SNACK :
              [...groups.KEYCHAIN, ...groups.LANYARD].length ? [...groups.KEYCHAIN, ...groups.LANYARD] :
              groups.DOORPRIZE;
      }
    }
    return bag[Math.floor(Math.random() * bag.length)];
  }

  // ---------- Modal helpers (dengan fallback alert) ----------
  function showResult(text){
  const color = colorFor(text, 0);
  if (modal && resultText && continueBtn) {
    resultText.textContent = text;
    resultText.style.color = color;        // warnai sesuai hadiah
    modal.classList.remove("hidden");      // <-- tampilkan modal
    modal.setAttribute("aria-hidden", "false");
    continueBtn.focus();
  } else {
    alert(text);
  }
}

function hideModal(){
  if (!modal) return;
  modal.classList.add("hidden");           // <-- sembunyikan modal
  modal.setAttribute("aria-hidden", "true");
  spinBtn.focus();
}

if (continueBtn) continueBtn.addEventListener("click", hideModal);
if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
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
        showResult(entries[selected]);
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------- Hook UI & init ----------
  spinBtn.addEventListener("click", spin);
  drawWheel();

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
    const counts = { ZONK:0, PERMEN:0, SNACK:0, KEYCHAIN:0, LANYARD:0, DOORPRIZE:0 };
    const trials = 12000;
    for (let i=0;i<trials;i++){
      const idx = pickIndexBiased();
      const L = entries[idx].toUpperCase();
      if (L.includes("ZONK")) counts.ZONK++;
      else if (L.includes("PERMEN")) counts.PERMEN++;
      else if (L.includes("SNACK")) counts.SNACK++;
      else if (L.includes("KEYCHAIN")) counts.KEYCHAIN++;
      else if (L.includes("LANYARD")) counts.LANYARD++;
      else if (L.includes("DOORPRIZE")) counts.DOORPRIZE++;
    }
    const pct = Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,(v/trials*100)]));
    const keyLany = pct.KEYCHAIN + pct.LANYARD;
    console.info("[tests] approx %", Object.fromEntries(Object.entries(pct).map(([k,v])=>[k, v.toFixed(2)])), "KEY+LANY:", keyLany.toFixed(2));
    // (opsional) assert toleransi:
    // Zonk ±2%, Permen ±2%, Snack ±1.5%, Key+Lany ±1%, Doorprize ±0.8%
  })();
});
