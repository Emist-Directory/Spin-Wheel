document.addEventListener("DOMContentLoaded", () => {
  // ---- Peluang hasil (bukan dari jumlah slice) ----
  const categories = [
    { name: "ZONK",      weight: 0.75,   color: "#e53935" }, // merah
    { name: "PERMEN",    weight: 0.155,  color: "#ff69b4" }, // pink (15.5%)
    { name: "SNACK",     weight: 0.08,   color: "#1e88e5" }, // biru
    { name: "KEYCHAIN",  weight: 0.0075, color: "#b39ddb" }, // ungu muda (0.75%)
    { name: "LANYARD",   weight: 0.0075, color: "#fb8c00" }, // oranye (0.75%)
  ];

  // Slice visual (18 sektor) — murni estetika
  const SLICE_LABELS = [
    "ZONK","PERMEN","LANYARD","ZONK","SNACK","ZONK",
    "KEYCHAIN","ZONK","PERMEN","ZONK","SNACK","ZONK",
    "PERMEN","ZONK","SNACK","ZONK","PERMEN","ZONK"
  ];

  const colorOf = Object.fromEntries(categories.map(c => [c.name, c.color]));
  const wheel = document.getElementById("wheel");
  const ctx = wheel.getContext("2d");
  const spinBtn = document.getElementById("spinBtn");

  const modal = document.getElementById("modal");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  const continueBtn = document.getElementById("continueBtn");

  continueBtn.addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

  // --- Canvas responsif (tajam di HiDPI) ---
  function fitCanvas() {
    const rect = wheel.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    wheel.width = Math.round(rect.width * dpr);
    wheel.height = Math.round(rect.height * dpr);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    drawWheel(currentRotation);
  }
  window.addEventListener("resize", fitCanvas, { passive:true });

  const N = SLICE_LABELS.length;
  const sliceAngle = (Math.PI * 2) / N;
  let currentRotation = 0; // radian
  let spinning = false;

  // Index slice per kategori agar visual cocok dgn hasil
  const indicesByCat = {};
  for (let i = 0; i < N; i++) {
    const lab = SLICE_LABELS[i];
    (indicesByCat[lab] ||= []).push(i);
  }

  // Kontras teks otomatis
  function textColorFor(bg) {
    const c = bg.startsWith("#") ? bg.substring(1) : bg;
    const r = parseInt(c.slice(0,2), 16) / 255;
    const g = parseInt(c.slice(2,4), 16) / 255;
    const b = parseInt(c.slice(4,6), 16) / 255;
    const L = 0.2126*r + 0.7152*g + 0.0722*b;
    return L > 0.62 ? "#0d0f13" : "#ffffff";
  }

  // Teks horizontal yang otomatis ngepas lebar chord slice
  function drawFittedText(ctx, text, maxW, baseSize, color) {
    let size = baseSize;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    let w = ctx.measureText(text).width;
    while (w > maxW && size > 10) {
      size -= 1;
      ctx.font = `800 ${size}px system-ui, sans-serif`;
      w = ctx.measureText(text).width;
    }

  // Teks mengikuti lengkung lingkaran (centered di dalam slice)
  function drawTextAlongArc(ctx, text, radius, startAngle, endAngle, baseSize, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let size = baseSize;
    // Try shrinking font until text fits in arc (90% of arc length)
    for (let tries = 0; tries < 12; tries++) {
      ctx.font = `800 ${size}px system-ui, sans-serif`;
      // total angle occupied by text
      let totalAngle = 0;
      for (const ch of text) {
        const w = ctx.measureText(ch).width;
        totalAngle += (w / radius);
      }
      const arc = Math.max(0, endAngle - startAngle) * 0.9;
      if (totalAngle <= arc || totalAngle == 0); // we'll replace 'or' with '||' after writing
        break
      size -= 1;
      if (size < 10) break;
    }

    // recompute with final size
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    let charAngles = [];
    let totalAngle = 0;
    for (const ch of text) {
      const w = ctx.measureText(ch).width;
      const a = w / radius;
      charAngles.push(a);
      totalAngle += a;
    }

    const arcAvail = endAngle - startAngle;
    let angle = startAngle + (arcAvail - totalAngle)/2; // center the text in slice

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const a = charAngles[i] || 0;
      const mid = angle + a/2;

      ctx.save();
      // Teks mengikuti lengkung slice
      const baseSize = Math.max(12, Math.floor(R * 0.12));
      const fg = textColorFor(color);
      drawTextAlongArc(ctx, label, rText, a0 + 0.04, a1 - 0.04, baseSize, fg);

      angle += a;
    }
    ctx.restore();
  }

    ctx.fillText(text, 0, 0);
  }

  function drawWheel(rot) {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const R = Math.min(cx, cy);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot); // rotasi roda (clockwise utk nilai positif)

    for (let i = 0; i < N; i++) {
      const a0 = i * sliceAngle;
      const a1 = a0 + sliceAngle;
      const label = SLICE_LABELS[i];
      const color = colorOf[label];

      // sektor
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R - 8, a0, a1);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // label HORIZONTAL (tidak miring mengikuti layar)
      const mid = a0 + sliceAngle / 2;
      const rText = R * 0.62; // radius posisi teks
      const chord = 2 * rText * Math.sin(sliceAngle / 2) * 0.88; // lebar efektif

      ctx.save();
      ctx.rotate(mid);          // sumbu x = radial
      ctx.translate(rText, 0);  // ke posisi teks di tengah slice
      ctx.rotate(-mid);         // balikan supaya teks horizontal terhadap layar

      const baseSize = Math.max(12, Math.floor(R * 0.12));
      const fg = textColorFor(color);
      drawFittedText(ctx, label, chord, baseSize, fg);

      ctx.restore();
    }

    // pusat
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.2)";
    ctx.stroke();

    ctx.restore();
  }

  // Pilih hasil berdasarkan bobot
  function weightedPick() {
    const r = Math.random();
    let acc = 0;
    for (const c of categories) {
      acc += c.weight;
      if (r < acc) return c.name;
    }
    return categories[categories.length - 1].name;
  }

  // Easing konsisten
  function easeOut(t){ return 1 - Math.pow(1 - t, 3); }

  // Helper modulo positif
  const TAU = Math.PI * 2;
  const modPos = (x, m) => ((x % m) + m) % m;

  // Konstanta agar arah & kecepatan SELALU sama
  const SPIN_TURNS = 7;        // putaran penuh tetap (cepat)
  const SPIN_DURATION = 2600;  // ms tetap

  async function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;

    const pickedCategory = weightedPick();
    const candidates = indicesByCat[pickedCategory] || [0];
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    const targetSliceCenter = idx * sliceAngle + sliceAngle / 2;

    // Kita ingin (targetCenter + rot_akhir) = -PI/2 (di bawah panah) (mod 2π)
    // delta minimal (positif) agar searah jarum jam:
    const need = -Math.PI/2 - targetSliceCenter - currentRotation;
    const baseDelta = modPos(need, TAU);
    const delta = baseDelta + SPIN_TURNS * TAU; // selalu positif & sama banyak putaran
    const targetRotation = currentRotation + delta; // pasti ke kanan (clockwise)

    const start = performance.now();
    const startRot = currentRotation;

    function frame(now){
      const t = Math.min(1, (now - start) / SPIN_DURATION);
      const eased = easeOut(t);
      currentRotation = startRot + (targetRotation - startRot) * eased;
      drawWheel(currentRotation);

      if (t < 1) requestAnimationFrame(frame);
      else {
        showResult(pickedCategory);
        spinBtn.disabled = false;
        spinning = false;

        // Normalisasi supaya nilai tidak membengkak
        currentRotation = modPos(currentRotation, TAU);
      }
    }
    requestAnimationFrame(frame);
  }

  function showResult(cat) {
    resultTitle.textContent = "Hasil";
    resultText.textContent = cat;
    resultText.style.color = colorOf[cat] || "#ffffff";
    modal.hidden = false;
  }
  function hideModal(){ modal.hidden = true; }

  spinBtn.addEventListener("click", spin);
  fitCanvas();
});
