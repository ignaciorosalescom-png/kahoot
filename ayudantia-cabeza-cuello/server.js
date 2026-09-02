const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

/* ─────────────────────────────────────────────────────────
   BANCO DE PREGUNTAS
   Para agregar preguntas, copia un bloque completo y edítalo.
   El campo "match" es la respuesta correcta y nunca sale de
   este archivo: el navegador del alumno no la recibe.
   ───────────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    title: "Arcos faríngeos",
    prompt: "Une cada arco faríngeo con el derivado esquelético y el nervio que le corresponden.",
    origins: [
      { id: "a1", num: "I",     label: "Primer arco",         color: "#E2604A" },
      { id: "a2", num: "II",    label: "Segundo arco",        color: "#E0A93C" },
      { id: "a3", num: "III",   label: "Tercer arco",         color: "#43A69C" },
      { id: "a4", num: "IV–VI", label: "Cuarto a sexto arco", color: "#8E7CC8" }
    ],
    options: [
      { id: "d3", text: "Cuerno mayor del hioides · nervio glosofaríngeo (IX)", match: "a3" },
      { id: "d1", text: "Martillo y yunque · nervio trigémino (V3)",            match: "a1" },
      { id: "d4", text: "Cartílagos laríngeos · nervio vago (X)",               match: "a4" },
      { id: "d2", text: "Estribo y apófisis estiloides · nervio facial (VII)",  match: "a2" }
    ],
    note: "El hioides queda repartido: cuerpo y cuerno menor vienen del segundo arco, cuerno mayor del tercero. Es la trampa clásica."
  },
  {
    title: "Bolsas faríngeas",
    prompt: "Une cada bolsa faríngea endodérmica con su derivado adulto.",
    origins: [
      { id: "b1", num: "1ª", label: "Primera bolsa", color: "#E2604A" },
      { id: "b2", num: "2ª", label: "Segunda bolsa", color: "#E0A93C" },
      { id: "b3", num: "3ª", label: "Tercera bolsa", color: "#43A69C" },
      { id: "b4", num: "4ª", label: "Cuarta bolsa",  color: "#8E7CC8" }
    ],
    options: [
      { id: "e3", text: "Timo y paratiroides inferiores",                 match: "b3" },
      { id: "e4", text: "Paratiroides superiores y cuerpo ultimofaríngeo", match: "b4" },
      { id: "e1", text: "Cavidad timpánica y tuba auditiva",              match: "b1" },
      { id: "e2", text: "Amígdala palatina",                              match: "b2" }
    ],
    note: "El cruce que casi nadie acierta: la tercera bolsa da las paratiroides inferiores porque el timo las arrastra hacia caudal en su descenso, y la cuarta queda arriba."
  }
];

// Versión sin respuestas, que es la única que viaja al navegador.
function questionForClient(i) {
  const q = QUESTIONS[i];
  return {
    index: i,
    total: QUESTIONS.length,
    title: q.title,
    prompt: q.prompt,
    origins: q.origins,
    options: q.options.map(o => ({ id: o.id, text: o.text }))
  };
}

/* ─────────── Salas en memoria ─────────── */
const rooms = new Map();
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function newCode() {
  let c;
  do {
    c = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
  } while (rooms.has(c));
  return c;
}

function playerList(room) {
  return [...room.players.values()]
    .map(p => ({ name: p.name, score: p.score, answered: !!p.answers[room.q] }))
    .sort((a, b) => b.score - a.score);
}

function pushHost(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(room.hostId).emit("host:state", {
    phase: room.phase,
    q: room.q,
    startedAt: room.startedAt,
    players: playerList(room)
  });
}

function grade(room, player, qIndex) {
  const q = QUESTIONS[qIndex];
  const given = (player.answers[qIndex] && player.answers[qIndex].pairs) || {};
  let ok = 0;
  for (const o of q.origins) {
    const opt = q.options.find(x => x.id === given[o.id]);
    if (opt && opt.match === o.id) ok++;
  }
  return { ok, total: q.origins.length };
}

io.on("connection", socket => {

  socket.on("host:create", cb => {
    const code = newCode();
    rooms.set(code, { hostId: socket.id, players: new Map(), phase: "lobby", q: 0, startedAt: 0 });
    socket.join(code);
    socket.data = { role: "host", room: code };
    cb({ code });
    pushHost(code);
  });

  socket.on("player:join", ({ code, name }, cb) => {
    const c = String(code || "").trim().toUpperCase();
    const room = rooms.get(c);
    if (!room) return cb({ error: "Esa sala no existe. Revisa las letras en la pantalla." });
    const clean = String(name || "").trim().slice(0, 22);
    if (!clean) return cb({ error: "Escribe tu nombre." });
    room.players.set(socket.id, { name: clean, score: 0, answers: {} });
    socket.join(c);
    socket.data = { role: "player", room: c };
    cb({ ok: true });
    if (room.phase === "question") {
      socket.emit("question", { ...questionForClient(room.q), startedAt: room.startedAt });
    }
    pushHost(c);
  });

  socket.on("host:start", () => {
    const code = socket.data && socket.data.room;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = "question";
    room.startedAt = Date.now();
    io.to(code).emit("question", { ...questionForClient(room.q), startedAt: room.startedAt });
    pushHost(code);
  });

  socket.on("player:answer", pairs => {
    const code = socket.data && socket.data.room;
    const room = rooms.get(code);
    if (!room || room.phase !== "question") return;
    const player = room.players.get(socket.id);
    if (!player || player.answers[room.q]) return; // una sola respuesta por pregunta
    const ms = Date.now() - room.startedAt;
    player.answers[room.q] = { pairs: pairs || {}, ms };
    const { ok, total } = grade(room, player, room.q);
    const base = Math.round((ok / total) * 700);
    const bonus = ok === total ? Math.max(0, 300 - Math.floor(ms / 1000) * 5) : 0;
    player.score += base + bonus;
    socket.emit("answer:received");
    pushHost(code);
  });

  socket.on("host:reveal", () => {
    const code = socket.data && socket.data.room;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = "reveal";
    const q = QUESTIONS[room.q];
    const solution = q.origins.map(o => ({
      originId: o.id,
      num: o.num,
      label: o.label,
      color: o.color,
      text: q.options.find(x => x.match === o.id).text
    }));

    for (const [id, p] of room.players) {
      const { ok, total } = grade(room, p, room.q);
      const given = (p.answers[room.q] && p.answers[room.q].pairs) || {};
      io.to(id).emit("reveal", {
        solution, note: q.note, ok, total, score: p.score,
        mine: q.origins.map(o => {
          const opt = q.options.find(x => x.id === given[o.id]);
          return { originId: o.id, text: opt ? opt.text : null, correct: !!(opt && opt.match === o.id) };
        })
      });
    }
    io.to(room.hostId).emit("host:reveal", { solution, note: q.note, players: playerList(room) });
    pushHost(code);
  });

  socket.on("host:next", () => {
    const code = socket.data && socket.data.room;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.q + 1 < QUESTIONS.length) {
      room.q++;
      room.phase = "question";
      room.startedAt = Date.now();
      io.to(code).emit("question", { ...questionForClient(room.q), startedAt: room.startedAt });
    } else {
      room.phase = "end";
      io.to(code).emit("end", { players: playerList(room) });
    }
    pushHost(code);
  });

  socket.on("host:restart", () => {
    const code = socket.data && socket.data.room;
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    for (const p of room.players.values()) { p.score = 0; p.answers = {}; }
    room.q = 0; room.phase = "lobby"; room.startedAt = 0;
    io.to(code).emit("lobby");
    pushHost(code);
  });

  socket.on("disconnect", () => {
    const d = socket.data || {};
    const room = rooms.get(d.room);
    if (!room) return;
    if (d.role === "host") {
      io.to(d.room).emit("closed");
      rooms.delete(d.room);
    } else {
      room.players.delete(socket.id);
      pushHost(d.room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor escuchando en el puerto " + PORT));
