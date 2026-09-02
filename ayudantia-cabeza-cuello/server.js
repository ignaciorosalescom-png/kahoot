const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

const COLORS = ["#E2604A", "#E0A93C", "#43A69C", "#8E7CC8"];

/* ═══════════════════════════════════════════════════════════
   BANCO DE PREGUNTAS
   Hay un ejemplo de cada tipo. Copia el bloque del tipo que
   necesites, pégalo debajo y edita los textos.
   Las respuestas correctas nunca salen de este archivo.
   ═══════════════════════════════════════════════════════════ */
const QUESTIONS = [

  { type: "match",
    title: "Arcos faríngeos",
    prompt: "Une cada arco faríngeo con el derivado esquelético y el nervio que le corresponden.",
    origins: [
      { id: "a1", num: "I",     label: "Primer arco" },
      { id: "a2", num: "II",    label: "Segundo arco" },
      { id: "a3", num: "III",   label: "Tercer arco" },
      { id: "a4", num: "IV–VI", label: "Cuarto a sexto arco" }
    ],
    options: [
      { id: "d3", text: "Cuerno mayor del hioides · glosofaríngeo (IX)", match: "a3" },
      { id: "d1", text: "Martillo y yunque · trigémino (V3)",            match: "a1" },
      { id: "d4", text: "Cartílagos laríngeos · vago (X)",               match: "a4" },
      { id: "d2", text: "Estribo y estiloides · facial (VII)",           match: "a2" }
    ],
    note: "El hioides queda repartido: cuerpo y cuerno menor del segundo arco, cuerno mayor del tercero." },

  { type: "single",
    title: "Estilofaríngeo",
    prompt: "¿Qué nervio inerva el músculo estilofaríngeo?",
    options: [
      { id: "o1", text: "Nervio facial (VII)" },
      { id: "o2", text: "Nervio glosofaríngeo (IX)", correct: true },
      { id: "o3", text: "Nervio vago (X)" },
      { id: "o4", text: "Nervio hipogloso (XII)" }
    ],
    note: "Es el único músculo inervado por el glosofaríngeo, y deriva del tercer arco. Los demás músculos faríngeos son del vago." },

  { type: "tf",
    title: "Velo del paladar",
    prompt: "El músculo tensor del velo del paladar deriva del segundo arco faríngeo.",
    answer: false,
    note: "Deriva del primer arco y lo inerva el trigémino (V3). Es la excepción entre los músculos del velo, que en su mayoría dependen del vago." },

  { type: "multi",
    title: "Agujero yugular",
    prompt: "Marca todas las estructuras que atraviesan el agujero yugular.",
    options: [
      { id: "m1", text: "Nervio glosofaríngeo (IX)", correct: true },
      { id: "m2", text: "Nervio vago (X)",           correct: true },
      { id: "m3", text: "Nervio accesorio (XI)",     correct: true },
      { id: "m4", text: "Nervio hipogloso (XII)" },
      { id: "m5", text: "Nervio facial (VII)" }
    ],
    note: "Los pares IX, X y XI salen juntos por el agujero yugular. El hipogloso tiene su propio conducto y el facial sale por el estilomastoideo." },

  { type: "blank",
    title: "Conducto tirogloso",
    prompt: "Completa la frase con una palabra o expresión.",
    text: "El primordio tiroideo se origina en el ___ de la lengua.",
    accept: ["foramen cecum", "agujero ciego", "foramen ciego", "agujero cecum"],
    note: "El foramen cecum queda en el vértice de la V lingual y marca el punto de partida del descenso tiroideo." },

  { type: "order",
    title: "Descenso tiroideo",
    prompt: "Ordena las etapas del descenso de la glándula tiroides, de la primera a la última.",
    items: [
      { id: "s3", text: "Pasa por delante del hueso hioides" },
      { id: "s1", text: "El primordio aparece en el foramen cecum" },
      { id: "s4", text: "Alcanza su posición infrahioidea definitiva" },
      { id: "s2", text: "Desciende siguiendo el conducto tirogloso" }
    ],
    correctOrder: ["s1", "s2", "s3", "s4"],
    note: "El trayecto explica dónde aparecen los quistes del conducto tirogloso: en la línea media, y ascienden al tragar." },

  { type: "cloud",
    title: "Cresta neural",
    prompt: "Escribe todos los derivados de las células de la cresta neural en cabeza y cuello que recuerdes.",
    note: "Sin puntaje: la idea es ver qué recuerda el curso en conjunto." }
];

/* ─────────── Normalización de texto ─────────── */
const FILLER = /\b(de|del|la|las|los|el|un|una|y|o|en|celula|celulas|celular|celulares|tipo|tipos)\b/g;
function norm(s) {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ").trim()
    .split(" ").map(w => w.replace(/s$/, "")).join(" ");
}
function distance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
// Conservador a propósito: solo tolera erratas en textos largos,
// para no fundir "hueso frontal" con "hueso temporal".
function similar(a, b) {
  if (a === b) return true;
  if (a.length < 7 || b.length < 7) return false;
  return distance(a, b) <= (Math.min(a.length, b.length) >= 12 ? 2 : 1);
}

function questionForClient(i) {
  const q = QUESTIONS[i];
  const base = { index: i, total: QUESTIONS.length, type: q.type, title: q.title, prompt: q.prompt };
  if (q.type === "match")
    return { ...base,
      origins: q.origins.map((o, k) => ({ ...o, color: COLORS[k % 4] })),
      options: q.options.map(o => ({ id: o.id, text: o.text })) };
  if (q.type === "single" || q.type === "multi")
    return { ...base, options: q.options.map(o => ({ id: o.id, text: o.text })) };
  if (q.type === "tf")    return base;
  if (q.type === "blank") return { ...base, text: q.text };
  if (q.type === "order") return { ...base, items: q.items };
  return base;
}

/* ─────────── Corrección ─────────── */
function grade(q, given) {
  if (q.type === "match") {
    let ok = 0;
    q.origins.forEach(o => {
      const opt = q.options.find(x => x.id === (given || {})[o.id]);
      if (opt && opt.match === o.id) ok++;
    });
    return { ok, total: q.origins.length };
  }
  if (q.type === "single") {
    const right = q.options.find(o => o.correct);
    return { ok: given === right.id ? 1 : 0, total: 1 };
  }
  if (q.type === "tf") return { ok: given === q.answer ? 1 : 0, total: 1 };
  if (q.type === "multi") {
    const picked = Array.isArray(given) ? given : [];
    const rights = q.options.filter(o => o.correct).map(o => o.id);
    const hits = picked.filter(id => rights.includes(id)).length;
    const misses = picked.filter(id => !rights.includes(id)).length;
    return { ok: Math.max(0, hits - misses), total: rights.length };
  }
  if (q.type === "blank") {
    const g = norm(given || "");
    return { ok: q.accept.some(a => similar(norm(a), g)) ? 1 : 0, total: 1 };
  }
  if (q.type === "order") {
    const seq = Array.isArray(given) ? given : [];
    let ok = 0;
    q.correctOrder.forEach((id, i) => { if (seq[i] === id) ok++; });
    return { ok, total: q.correctOrder.length };
  }
  return { ok: 0, total: 0 };
}

function solutionFor(q) {
  if (q.type === "match")
    return q.origins.map((o, k) => ({ originId: o.id, num: o.num, label: o.label,
      color: COLORS[k % 4], text: q.options.find(x => x.match === o.id).text }));
  if (q.type === "single") return { id: q.options.find(o => o.correct).id };
  if (q.type === "tf")     return { answer: q.answer };
  if (q.type === "multi")  return { ids: q.options.filter(o => o.correct).map(o => o.id) };
  if (q.type === "blank")  return { text: q.accept[0], all: q.accept };
  if (q.type === "order")  return { order: q.correctOrder.map(id => q.items.find(i => i.id === id)) };
  return null;
}

/* ─────────── Salas ─────────── */
const rooms = new Map();
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(""); }
  while (rooms.has(c));
  return c;
}
const AVATAR_COLORS = ["#E2604A","#E0A93C","#43A69C","#8E7CC8","#5B8DD9","#D97DA6","#7FB069","#C9B08A"];

function playerList(room) {
  return [...room.players.values()]
    .map(p => ({ name: p.name, score: p.score, c: p.c, g: p.g, answered: p.answers[room.q] !== undefined }))
    .sort((a, b) => b.score - a.score);
}
function cloudList(room) {
  return (room.cloud || []).slice().sort((a, b) => b.count - a.count).slice(0, 40);
}
function pushHost(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(room.hostId).emit("host:state", {
    phase: room.phase, q: room.q, startedAt: room.startedAt,
    players: playerList(room), cloud: cloudList(room)
  });
}
function startQuestion(code, room) {
  room.phase = "question";
  room.startedAt = Date.now();
  room.cloud = [];
  io.to(code).emit("question", { ...questionForClient(room.q), startedAt: room.startedAt });
  pushHost(code);
}

io.on("connection", socket => {

  socket.on("host:create", cb => {
    const code = newCode();
    rooms.set(code, { hostId: socket.id, players: new Map(), phase: "lobby", q: 0, startedAt: 0, cloud: [] });
    socket.join(code);
    socket.data = { role: "host", room: code };
    cb({ code });
    pushHost(code);
  });

  socket.on("player:join", ({ code, name, color, glyph }, cb) => {
    const c = String(code || "").trim().toUpperCase();
    const room = rooms.get(c);
    if (!room) return cb({ error: "Esa sala no existe. Revisa las letras en la pantalla." });
    const clean = String(name || "").trim().slice(0, 22);
    if (!clean) return cb({ error: "Escribe tu nombre." });
    const col = AVATAR_COLORS.includes(color) ? color : AVATAR_COLORS[Math.floor(Math.random() * 8)];
    const gl = Number.isInteger(glyph) && glyph >= 0 && glyph < 8 ? glyph : Math.floor(Math.random() * 8);
    room.players.set(socket.id, { name: clean, score: 0, answers: {}, c: col, g: gl });
    socket.join(c);
    socket.data = { role: "player", room: c };
    cb({ ok: true });
    if (room.phase === "question")
      socket.emit("question", { ...questionForClient(room.q), startedAt: room.startedAt });
    pushHost(c);
  });

  socket.on("host:start", () => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (room && room.hostId === socket.id) startQuestion(code, room);
  });

  socket.on("player:answer", given => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.phase !== "question") return;
    const player = room.players.get(socket.id);
    const q = QUESTIONS[room.q];
    if (!player || q.type === "cloud" || player.answers[room.q] !== undefined) return;
    const ms = Date.now() - room.startedAt;
    player.answers[room.q] = given;
    const { ok, total } = grade(q, given);
    const base = Math.round((ok / total) * 700);
    const bonus = ok === total ? Math.max(0, 300 - Math.floor(ms / 1000) * 5) : 0;
    player.score += base + bonus;
    socket.emit("answer:received");
    pushHost(code);
  });

  // Nube de palabras: varias entradas por alumno, sin puntaje.
  socket.on("player:word", word => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.phase !== "question") return;
    if (QUESTIONS[room.q].type !== "cloud") return;
    const raw = String(word || "").trim().slice(0, 40);
    if (!raw) return;
    const key = norm(raw);
    if (!key) return;
    const hit = room.cloud.find(e => similar(e.key, key));
    if (hit) hit.count++;
    else room.cloud.push({ key, text: raw, count: 1 });
    socket.emit("word:received", raw);
    pushHost(code);
  });

  socket.on("host:reveal", () => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = "reveal";
    const q = QUESTIONS[room.q];
    const solution = solutionFor(q);
    if (q.type !== "cloud") {
      for (const [id, p] of room.players) {
        const given = p.answers[room.q];
        const { ok, total } = grade(q, given);
        io.to(id).emit("reveal", { type: q.type, solution, note: q.note, given, ok, total, score: p.score });
      }
    } else {
      io.to(code).emit("reveal", { type: "cloud", note: q.note, cloud: cloudList(room) });
    }
    io.to(room.hostId).emit("host:reveal", { type: q.type, solution, note: q.note,
      players: playerList(room), cloud: cloudList(room) });
    pushHost(code);
  });

  socket.on("host:next", () => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.q + 1 < QUESTIONS.length) { room.q++; startQuestion(code, room); }
    else { room.phase = "end"; io.to(code).emit("end", { players: playerList(room) }); pushHost(code); }
  });

  socket.on("host:restart", () => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    for (const p of room.players.values()) { p.score = 0; p.answers = {}; }
    room.q = 0; room.phase = "lobby"; room.startedAt = 0; room.cloud = [];
    io.to(code).emit("lobby");
    pushHost(code);
  });

  socket.on("disconnect", () => {
    const d = socket.data || {}, room = rooms.get(d.room);
    if (!room) return;
    if (d.role === "host") { io.to(d.room).emit("closed"); rooms.delete(d.room); }
    else { room.players.delete(socket.id); pushHost(d.room); }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor escuchando en el puerto " + PORT));
