// Tahap 2: game perlakuan. Dimuat setelah script utama di index.html, dan menggantikan fungsi perlakuan().
// Untuk uji cepat: tambahkan ?cepat=1 di alamat (tiap game jadi 10 detik).
const DUR = new URLSearchParams(location.search).has("cepat") ? 10 : 200; // detik per game (3 game = sekitar 10 menit)

const css = document.createElement("style");
css.textContent = `
#arena{position:relative;height:56vh;min-height:300px;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;user-select:none;-webkit-user-select:none}
#arena button{width:auto;margin:0;min-height:0;padding:0}
.item{position:absolute;background:transparent!important;font-size:2.8rem;line-height:1;padding:8px!important}
.sel{background:#f2f7f7!important;color:var(--ink)!important;font-size:clamp(1.1rem,7vw,2.1rem);border:1px solid var(--line)!important;border-radius:6px!important;width:100%!important}
.tg{position:absolute;width:68px!important;height:68px;border-radius:50%!important;background:#2a6fdb!important;transition:left 1.2s ease,top 1.2s ease,background .1s}
.tg.on{background:#f28c1b!important}
.dis{position:absolute;width:14px;height:14px;border-radius:50%;pointer-events:none}
.tile{width:100%!important;height:100%;border-radius:0!important;border:2px solid #fff!important}
.tile.pil{outline:4px solid #f0a500;outline-offset:-4px}
.gel{position:absolute;bottom:-70px;width:58px!important;height:58px;border-radius:50%!important;background:radial-gradient(circle at 30% 30%,#fff,#9fd3e6 60%,#6fb7d1)!important;animation:naik linear forwards}
@keyframes naik{to{transform:translateY(-80vh)}}
.hias{height:70%;display:flex;flex-direction:column;align-items:center;justify-content:center}
.topi,.wajah{font-size:4.2rem;line-height:1.1}
.kontrol{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px}
.kontrol button{background:var(--acc)!important;color:#fff;min-height:48px;border-radius:10px!important}`;
document.head.appendChild(css);

const acakI = n => Math.floor(Math.random() * n);

// ====== EKSPERIMEN ======
function ge1(el, h) { // Tangkap bintang: atensi bertahan
  h.benar = 0; h.salah = 0; h.lewat = 0;
  let ms = 1400, stop = false;
  (async () => {
    while (!stop) {
      const tg = Math.random() < .25, b = document.createElement("button");
      b.className = "item"; b.textContent = tg ? "⭐" : ["🔵", "🟥", "🔺", "🟢"][acakI(4)];
      b.style.left = (8 + Math.random() * 72) + "%"; b.style.top = (8 + Math.random() * 72) + "%";
      let kena = false;
      b.onclick = () => { if (kena) return; kena = true; if (tg) { h.benar++; ms = Math.max(700, ms - 40); } else h.salah++; b.remove(); };
      el.appendChild(b); await tunggu(ms);
      if (tg && !kena) h.lewat++;
      b.remove(); await tunggu(250);
    }
  })();
  return () => { stop = true; };
}
function ge2(el, h) { // Cari yang beda: atensi selektif, makin lama makin banyak
  h.benar = 0; h.salah = 0; h.levelMaks = 3;
  let n = 3, runtun = 0;
  (function bangun() {
    el.innerHTML = ""; el.style.display = "grid"; el.style.gridTemplateColumns = `repeat(${n},1fr)`; el.style.gridTemplateRows = `repeat(${n},1fr)`; el.style.gap = "4px"; el.style.padding = "6px";
    const odd = acakI(n * n), p = Math.random() < .5 ? ["O", "Q"] : ["Q", "O"];
    h.levelMaks = Math.max(h.levelMaks, n);
    for (let i = 0; i < n * n; i++) {
      const b = document.createElement("button"); b.className = "sel"; b.textContent = i === odd ? p[1] : p[0];
      b.onclick = () => { if (i === odd) { h.benar++; if (++runtun % 2 === 0 && n < 7) n++; } else { h.salah++; runtun = 0; if (n > 3) n--; } bangun(); };
      el.appendChild(b);
    }
  })();
  return () => {};
}
function ge3(el, h) { // Fokus di tengah gangguan: atensi selektif dengan distraktor
  h.benar = 0; h.salah = 0; h.lewat = 0;
  let stop = false, aktif = false, kena = false;
  const t = document.createElement("button"); t.className = "tg"; el.appendChild(t);
  const pos = () => { t.style.left = (8 + Math.random() * 70) + "%"; t.style.top = (8 + Math.random() * 70) + "%"; };
  pos(); const mv = setInterval(pos, 1600);
  t.onclick = () => { if (aktif && !kena) { kena = true; h.benar++; t.classList.remove("on"); } else if (!aktif) h.salah++; };
  const dis = setInterval(() => {
    const d = document.createElement("i"); d.className = "dis";
    d.style.left = Math.random() * 92 + "%"; d.style.top = Math.random() * 92 + "%";
    d.style.background = ["#e76f51", "#2a9d8f", "#e9c46a", "#9b5de5"][acakI(4)];
    el.appendChild(d); setTimeout(() => d.remove(), 500);
  }, 300);
  (async () => {
    while (!stop) {
      await tunggu(2500 + Math.random() * 2500); if (stop) break;
      aktif = true; kena = false; t.classList.add("on"); await tunggu(1300);
      if (!kena) h.lewat++;
      aktif = false; t.classList.remove("on");
    }
  })();
  return () => { stop = true; clearInterval(mv); clearInterval(dis); };
}

// ====== KONTROL (tampilan dan durasi dibuat sepadan, tuntutan atensinya rendah) ======
function gk1(el, h) { // Puzzle warna, tanpa target dan tanpa penalti
  h.selesai = 0; h.ketuk = 0;
  let pil = -1, ur, hue;
  const warna = v => `hsl(${hue + (v % 3) * 30} 55% ${33 + Math.floor(v / 3) * 17}%)`;
  function baru() { hue = acakI(360); do { ur = acak([0, 1, 2, 3, 4, 5, 6, 7, 8]); } while (ur.every((v, i) => v === i)); pil = -1; gambar(); }
  function gambar() {
    el.innerHTML = ""; el.style.display = "grid"; el.style.gridTemplateColumns = "repeat(3,1fr)"; el.style.gridTemplateRows = "repeat(3,1fr)";
    ur.forEach((v, i) => {
      const b = document.createElement("button"); b.className = "tile" + (i === pil ? " pil" : ""); b.style.background = warna(v);
      b.onclick = () => {
        h.ketuk++;
        if (pil < 0) pil = i;
        else { [ur[pil], ur[i]] = [ur[i], ur[pil]]; pil = -1; if (ur.every((x, j) => x === j)) { h.selesai++; gambar(); setTimeout(baru, 600); return; } }
        gambar();
      };
      el.appendChild(b);
    });
  }
  baru(); return () => {};
}
function gk2(el, h) { // Pecahkan gelembung: semua gelembung sama, boleh diketuk bebas
  h.pecah = 0; let stop = false;
  (async () => {
    while (!stop) {
      const b = document.createElement("button"); b.className = "gel";
      b.style.left = (4 + Math.random() * 80) + "%"; b.style.animationDuration = (5000 + Math.random() * 2000) + "ms";
      b.onclick = () => { h.pecah++; b.remove(); }; b.onanimationend = () => b.remove();
      el.appendChild(b); await tunggu(550 + Math.random() * 500);
    }
  })();
  return () => { stop = true; };
}
function gk3(el, h) { // Hias karakter: bebas, tanpa skor
  h.ketuk = 0;
  const topi = ["", "🎩", "👑", "🎓", "🧢"], wajah = ["🐱", "🐶", "🐼", "🐰"], latar = ["#cfe8ef", "#f7e1c8", "#dff0d4", "#f3d4e3"];
  let a = 0, b = 0, c = 0;
  (function gam() {
    el.innerHTML = `<div class="hias" style="background:${latar[c]}"><div class="topi">${topi[a] || "&nbsp;"}</div><div class="wajah">${wajah[b]}</div></div>
    <div class="kontrol"><button>Topi</button><button>Hewan</button><button>Latar</button></div>`;
    const [t, w, l] = el.querySelectorAll(".kontrol button");
    t.onclick = () => { a = (a + 1) % topi.length; h.ketuk++; gam(); };
    w.onclick = () => { b = (b + 1) % wajah.length; h.ketuk++; gam(); };
    l.onclick = () => { c = (c + 1) % latar.length; h.ketuk++; gam(); };
  })();
  return () => {};
}

const DEF = {
  eksperimen: [
    {n: "Tangkap bintang", k: "Bentuk-bentuk akan muncul satu per satu. Ketuk hanya bintang ⭐. Jangan ketuk bentuk yang lain.", f: ge1},
    {n: "Cari yang beda", k: "Di antara huruf-huruf yang mirip, ada satu yang berbeda. Ketuk huruf yang berbeda itu.", f: ge2},
    {n: "Fokus di tengah gangguan", k: "Lingkaran biru bergerak pelan. Saat berubah jadi oranye, ketuk lingkaran itu secepatnya. Abaikan titik warna-warni yang berkedip.", f: ge3}],
  kontrol: [
    {n: "Puzzle warna", k: "Ketuk dua kotak untuk menukar tempatnya, sampai warnanya tersusun mulus dari gelap di atas ke terang di bawah.", f: gk1},
    {n: "Pecahkan gelembung", k: "Gelembung akan naik dari bawah. Ketuk gelembung mana saja sesukamu.", f: gk2},
    {n: "Hias karakter", k: "Ketuk tombol untuk mengganti topi, hewan, dan latar, lalu buat karakter sesukamu.", f: gk3}]
};

const intro = (g, i, n) => new Promise(r => {
  tampil(`<p class="mut">Game ${i + 1} dari ${n}</p><h1>${g.n}</h1><p>${g.k}</p><button id="gm">Mulai</button>`);
  $("gm").onclick = r;
});
const jalan = g => new Promise(r => {
  tampil(`<div class="bar"><i id="pw" style="width:0"></i></div><div id="arena"></div>`);
  const h = {game: g.n}, stop = g.f($("arena"), h), t0 = performance.now();
  const iv = setInterval(() => {
    const p = (performance.now() - t0) / (DUR * 1000);
    $("pw").style.width = Math.min(100, p * 100) + "%";
    if (p >= 1) { clearInterval(iv); stop(); h.detik = DUR; r(h); }
  }, 250);
});

// Menggantikan perlakuan() di index.html
async function perlakuan(kelompok) {
  const daftar = DEF[kelompok] || DEF.kontrol, log = [];
  for (let i = 0; i < daftar.length; i++) { await intro(daftar[i], i, daftar.length); log.push(await jalan(daftar[i])); }
  tampil(`<h1>Menyimpan...</h1><p class="mut">Jangan tutup halaman ini.</p>`);
  try { await api({action: "perlakuan", kode: S.kode, kelompok: kelompok, games: JSON.stringify(log)}); } catch (e) {}
  tampil(`<h1>Selesai untuk hari ini</h1><p>Terima kasih! Besok kamu akan mengerjakan tugas panah lagi dengan kode yang sama. Ingat kodemu: <b>${S.kode}</b></p>`);
}
