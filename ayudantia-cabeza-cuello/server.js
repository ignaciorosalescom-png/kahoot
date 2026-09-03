const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

const COLORS = ["#E2604A","#E0A93C","#43A69C","#8E7CC8","#5B8DD9","#7FB069"];

/* ═══════════════════════════════════════════════════════════
   BANCO DE PREGUNTAS
   Hay un ejemplo de cada tipo. Copia el bloque del tipo que
   necesites, pégalo debajo y edita los textos.
   Las respuestas correctas nunca salen de este archivo.
   ═══════════════════════════════════════════════════════════ */
const QUESTIONS = [
  /* ── 1. Cráneo y huesos de la cabeza ── */

  { type:"single", title:"Calota",
    prompt:"Origen embriológico de la calota o calvaria.",
    options:[
      {id:"a",text:"Desmocráneo / neurocráneo membranoso",correct:true},
      {id:"b",text:"Condrocráneo / neurocráneo cartilaginoso"},
      {id:"c",text:"Viscerocráneo"},
      {id:"d",text:"Prominencia frontonasal"}],
    note:"La calota se forma por osificación intramembranosa a partir del desmocráneo. El condrocráneo, en cambio, da la base del cráneo por osificación endocondral." },

  { type:"match", title:"Huesos craneales",
    prompt:"Empareja el hueso craneal con la estructura que se relaciona.",
    origins:[
      {id:"o1",num:"1",label:"Esfenoides"},
      {id:"o2",num:"2",label:"Temporal"},
      {id:"o3",num:"3",label:"Etmoides"},
      {id:"o4",num:"4",label:"Frontal"}],
    options:[
      {id:"d3",text:"Cavidad nasal",match:"o3"},
      {id:"d1",text:"Glándula hipófisis",match:"o1"},
      {id:"d4",text:"Seno frontal",match:"o4"},
      {id:"d2",text:"Oído interno",match:"o2"}],
    note:"Cada hueso aloja o delimita la estructura que lo acompaña: la silla turca del esfenoides guarda la hipófisis, y el peñasco del temporal contiene el oído interno." },

  { type:"match", title:"Craneosinostosis",
    prompt:"Empareja el tipo de craneosinostosis con la sutura que se fusiona prematuramente.",
    origins:[
      {id:"o1",num:"1",label:"Escafocefalia"},
      {id:"o2",num:"2",label:"Trigonocefalia"},
      {id:"o3",num:"3",label:"Plagiocefalia"},
      {id:"o4",num:"4",label:"Oxicefalia"}],
    options:[
      {id:"d2",text:"Sutura frontal",match:"o2"},
      {id:"d4",text:"Suturas coronales bilaterales",match:"o4"},
      {id:"d1",text:"Sutura sagital",match:"o1"},
      {id:"d3",text:"Sutura coronal unilateral",match:"o3"}],
    note:"La regla es que el cráneo deja de crecer perpendicular a la sutura fusionada y compensa creciendo en paralelo. Por eso la sagital produce un cráneo alargado." },

  { type:"match", title:"Base del cráneo",
    prompt:"Empareja el foramen o conducto de la base del cráneo con el par craneal que pasa por él.",
    origins:[
      {id:"o1",num:"1",label:"Foramen yugular"},
      {id:"o2",num:"2",label:"Conducto hipogloso"},
      {id:"o3",num:"3",label:"Meato acústico interno"},
      {id:"o4",num:"4",label:"Foramen redondo"},
      {id:"o5",num:"5",label:"Foramen oval"}],
    options:[
      {id:"d4",text:"V2 (maxilar)",match:"o4"},
      {id:"d1",text:"IX, X y XI",match:"o1"},
      {id:"d5",text:"V3 (mandibular)",match:"o5"},
      {id:"d3",text:"VII y VIII",match:"o3"},
      {id:"d2",text:"XII",match:"o2"}],
    note:"Los pares IX, X y XI comparten el agujero yugular; el XII tiene conducto propio. Del trigémino, V2 sale por el redondo y V3 por el oval." },

  { type:"blank", title:"Venas emisarias",
    prompt:"Completa la frase.",
    text:"Las venas ___ son uniones venosas entre senos venosos, venas diploicas y venas craneales superficiales.",
    accept:[["emisarias","emisaria"]],
    note:"Al comunicar el exterior con los senos durales, son una vía posible de propagación de infecciones hacia el interior del cráneo." },

  /* ── 2. Embriología facial y arcos faríngeos ── */

  { type:"cloud", title:"Cresta neural",
    prompt:"Indica un derivado de las células de la cresta neural en cabeza y cuello.",
    note:"La cresta neural craneal aporta casi todo el esqueleto facial, además de ganglios, melanocitos, odontoblastos y meninges, algo que no ocurre en el resto del cuerpo." },

  { type:"cloud", title:"Primer arco",
    prompt:"Indica un derivado del primer arco faríngeo.",
    note:"El primer arco depende del trigémino: músculos masticadores, martillo y yunque, y el esqueleto del maxilar y la mandíbula." },

  { type:"cloud", title:"Segundo arco",
    prompt:"Indica un derivado del segundo arco faríngeo.",
    note:"El segundo arco depende del facial: músculos de la expresión facial, estribo, apófisis estiloides y el cuerpo y cuerno menor del hioides." },

  { type:"single", title:"Fisura palatina",
    prompt:"¿Qué procesos NO se fusionaron en un paciente con fisura palatina?",
    options:[
      {id:"a",text:"Proceso maxilar con nasal medial"},
      {id:"b",text:"Crestas palatinas de los procesos maxilares",correct:true},
      {id:"c",text:"Procesos nasales mediales"},
      {id:"d",text:"Proceso maxilar con nasal lateral"}],
    note:"La fisura palatina es un defecto del paladar secundario, por falta de fusión de las crestas palatinas. La fisura labial, en cambio, compromete el paladar primario." },

  { type:"order", title:"Formación del paladar",
    prompt:"Ordena la secuencia de fusión de los procesos faciales que forman el paladar.",
    items:[
      {id:"s3",text:"Fusión de las crestas palatinas"},
      {id:"s1",text:"Fusión de los procesos nasales mediales entre sí"},
      {id:"s4",text:"Fusión del paladar secundario con el tabique nasal"},
      {id:"s2",text:"Fusión del paladar primario con los procesos maxilares"}],
    correctOrder:["s1","s2","s3","s4"],
    note:"El paladar primario se forma antes que el secundario, y el tabique nasal se fusiona al final, separando las cavidades nasales de la oral." },

  /* ── 3. Órbita y ojo ── */

  { type:"blank", title:"Capas de la retina",
    prompt:"Completa las cuatro casillas.",
    text:"Fotorreceptoras: conos y ___\nNeuronas de conducción: bipolares y ___\nNeuronas de asociación: horizontales y ___\nDe sostén: Müller y ___",
    accept:[
      ["bastones","bastón"],
      ["ganglionares","células ganglionares"],
      ["amacrinas","centrífugas","interplexiformes"],
      ["neuroglia","glía","células gliales"]],
    note:"La retina neural tiene tres neuronas en cadena (fotorreceptora, bipolar y ganglionar) más las de asociación que modulan, y las células de Müller como sostén." },

  { type:"blank", title:"Ora serrata",
    prompt:"Completa las dos casillas.",
    text:"La ___ es la zona límite entre la retina y la coroides. Delimita la parte visual y no visual, y marca el inicio del ___.",
    accept:[["oroserrata","ora serrata"],["cuerpo ciliar"]],
    note:"La ora serrata marca dónde termina la retina visual y comienza la porción ciega, justo donde empieza el cuerpo ciliar." },

  { type:"multi", title:"Anillo tendinoso",
    prompt:"¿Qué estructuras que salen de la fisura orbitaria superior pasan por el anillo tendinoso?",
    options:[
      {id:"a",text:"Nervio troclear"},
      {id:"b",text:"Ramo lagrimal y frontal del trigémino"},
      {id:"c",text:"Ramo superior del oculomotor",correct:true},
      {id:"d",text:"Ramo nasociliar",correct:true},
      {id:"e",text:"Nervio abducens",correct:true},
      {id:"f",text:"Ramo inferior del oculomotor",correct:true}],
    note:"Por el anillo pasan los nervios destinados a los músculos que nacen de él: ambos ramos del oculomotor, el nasociliar y el abducens. El troclear, el frontal y el lagrimal pasan por fuera." },

  { type:"single", title:"Movimientos oculares",
    prompt:"Al examinar los movimientos oculares, pides al paciente que dirija el ojo hacia medial (aducción) y luego hacia abajo. ¿Qué músculo estás evaluando principalmente?",
    options:[
      {id:"a",text:"Recto inferior"},
      {id:"b",text:"Oblicuo inferior"},
      {id:"c",text:"Recto medial"},
      {id:"d",text:"Oblicuo superior",correct:true}],
    note:"Con el ojo en aducción, el oblicuo superior queda alineado para deprimir. Por eso se explora la depresión en aducción y no en posición neutra." },

  { type:"match", title:"Humor acuoso",
    prompt:"Empareja la estructura ocular con su función.",
    origins:[
      {id:"o1",num:"1",label:"Procesos ciliares"},
      {id:"o2",num:"2",label:"Malla trabecular o de Fontana"},
      {id:"o3",num:"3",label:"Iris"}],
    options:[
      {id:"d2",text:"Drena el humor acuoso",match:"o2"},
      {id:"d3",text:"Regula la entrada de luz",match:"o3"},
      {id:"d1",text:"Produce el humor acuoso",match:"o1"}],
    note:"El humor acuoso se produce en los procesos ciliares y drena por la malla trabecular. Si el drenaje falla, sube la presión intraocular." },

  { type:"single", title:"Conducto nasolagrimal",
    prompt:"Las lágrimas producidas en la órbita drenan hacia la cavidad nasal a través del conducto nasolagrimal. ¿En qué estructura específica desemboca este conducto?",
    options:[
      {id:"a",text:"Meato nasal medio"},
      {id:"b",text:"Receso esfenoetmoidal"},
      {id:"c",text:"Meato nasal inferior",correct:true},
      {id:"d",text:"Meato nasal superior"}],
    note:"Desemboca bajo el cornete inferior. Por eso al llorar aumenta la secreción nasal." },

  /* ── 4. Oído ── */

  { type:"blank", title:"Tuba faringotimpánica",
    prompt:"Completa las dos casillas.",
    text:"La tuba faringotimpánica se origina embriológicamente de la ___ y egresa por la cara ___ de la cavidad timpánica.",
    accept:[
      ["primera bolsa faríngea","1ra bolsa faríngea","bolsa faríngea","endodermo"],
      ["anterior"]],
    note:"Deriva del receso tubotimpánico de la primera bolsa faríngea, de origen endodérmico, y comunica la caja timpánica con la nasofaringe." },

  { type:"match", title:"Oído interno",
    prompt:"Empareja la estructura del oído interno con su función.",
    origins:[
      {id:"o1",num:"1",label:"Estría vascular"},
      {id:"o2",num:"2",label:"Mácula del utrículo"},
      {id:"o3",num:"3",label:"Mácula del sáculo"},
      {id:"o4",num:"4",label:"Cresta ampular"}],
    options:[
      {id:"d3",text:"Aceleración lineal vertical",match:"o3"},
      {id:"d1",text:"Produce la endolinfa",match:"o1"},
      {id:"d4",text:"Movimientos rotacionales",match:"o4"},
      {id:"d2",text:"Aceleración lineal horizontal",match:"o2"}],
    note:"Las máculas detectan aceleración lineal según su orientación: el utrículo en el plano horizontal y el sáculo en el vertical. Las crestas ampulares detectan rotación." },

  /* ── 5. Cavidad oral, lengua y glándulas salivales ── */

  { type:"single", title:"Lengua: sensorial",
    prompt:"¿Qué par craneal da la inervación SENSORIAL a los dos tercios anteriores de la lengua?",
    options:[
      {id:"a",text:"Trigémino (V)"},
      {id:"b",text:"Facial (VII)",correct:true},
      {id:"c",text:"Glosofaríngeo (IX)"},
      {id:"d",text:"Hipogloso (XII)"}],
    note:"Ojo con la distinción: la sensibilidad general de los dos tercios anteriores es del trigémino (lingual), y el gusto es del facial por la cuerda del tímpano." },

  { type:"multi", title:"Glándulas salivales",
    prompt:"¿Cuáles glándulas salivales tienen origen endodérmico?",
    options:[
      {id:"a",text:"Parótida"},
      {id:"b",text:"Submandibular",correct:true},
      {id:"c",text:"Sublingual",correct:true}],
    note:"La parótida deriva del ectodermo del estomodeo; la submandibular y la sublingual, del endodermo del piso de la boca." },

  { type:"blank", title:"Palatogloso",
    prompt:"Completa las dos casillas.",
    text:"El músculo ___ marca el límite entre la cavidad oral y la orofaringe, y es el único músculo extrínseco de la lengua inervado por el ___.",
    accept:[["palatogloso"],["plexo faríngeo","plexo faringeo"]],
    note:"Es la excepción entre los extrínsecos de la lengua: se comporta como músculo del velo del paladar y por eso lo inerva el plexo faríngeo, no el hipogloso." },

  { type:"blank", title:"Conducto parotídeo",
    prompt:"Completa las dos casillas.",
    text:"El músculo ___ es atravesado por el conducto parotídeo y es inervado por el nervio ___.",
    accept:[["buccinador"],["facial"]],
    note:"El conducto parotídeo perfora el buccinador y desemboca frente al segundo molar superior. El buccinador es músculo de la expresión facial, de ahí la inervación facial." },

  { type:"match", title:"Tipo de secreción",
    prompt:"Empareja la glándula salival con su tipo de secreción.",
    origins:[
      {id:"o1",num:"1",label:"Parótida"},
      {id:"o2",num:"2",label:"Submandibular"},
      {id:"o3",num:"3",label:"Sublingual"}],
    options:[
      {id:"d3",text:"Mixta, con predominio mucoso",match:"o3"},
      {id:"d1",text:"Serosa pura",match:"o1"},
      {id:"d2",text:"Mixta, con predominio seroso",match:"o2"}],
    note:"El predominio explica la consistencia de la saliva de cada glándula y también qué cálculos son más frecuentes en el conducto submandibular." },

  { type:"single", title:"Parasimpático parotídeo",
    prompt:"¿Qué nervio craneal aporta la inervación parasimpática para la secreción de la glándula parótida, a través del nervio petroso menor?",
    options:[
      {id:"a",text:"Nervio facial (VII)"},
      {id:"b",text:"Nervio trigémino (V)"},
      {id:"c",text:"Nervio vago (X)"},
      {id:"d",text:"Nervio glosofaríngeo (IX)",correct:true}],
    note:"La vía va del glosofaríngeo al petroso menor, hace sinapsis en el ganglio ótico y llega a la parótida por el auriculotemporal, que es del trigémino." },

  { type:"match", title:"Papilas linguales",
    prompt:"Empareja la papila lingual con su característica.",
    origins:[
      {id:"o1",num:"1",label:"Filiformes"},
      {id:"o2",num:"2",label:"Fungiformes"},
      {id:"o3",num:"3",label:"Circunvaladas"},
      {id:"o4",num:"4",label:"Foliadas"}],
    options:[
      {id:"d4",text:"Bordes laterales",match:"o4"},
      {id:"d2",text:"Anteriores, con botones gustativos",match:"o2"},
      {id:"d1",text:"Las más abundantes, sin botones gustativos",match:"o1"},
      {id:"d3",text:"Forman la V lingual",match:"o3"}],
    note:"Solo las filiformes carecen de botones gustativos, y son justamente las más numerosas." },

  /* ── 6. Faringe y cuello ── */

  { type:"single", title:"Danger space",
    prompt:"En el cuello existe un espacio virtual por donde una infección profunda puede propagarse rápidamente hacia el mediastino. ¿Entre qué fascias se encuentra?",
    options:[
      {id:"a",text:"Entre la lámina de revestimiento y la pretraqueal"},
      {id:"b",text:"En el interior de la vaina carotídea"},
      {id:"c",text:"Entre la lámina prevertebral y la fascia bucofaríngea",correct:true},
      {id:"d",text:"Superficial al músculo platisma"}],
    note:"Ese espacio se extiende sin interrupción hasta el diafragma, por lo que una infección cervical profunda puede alcanzar el mediastino posterior." },

  { type:"tf", title:"Asa cervical",
    prompt:"El asa cervical, formada por las raíces C1 a C3, tiene como función principal inervar los músculos infrahioideos, excepto el tirohioideo.",
    answer:true,
    note:"El tirohioideo es la excepción: lo inerva C1 viajando con el hipogloso, no el asa propiamente tal." },

  /* ── 7. Laringe ── */

  { type:"single", title:"Nervios laríngeos",
    prompt:"¿Qué estructura nerviosa da una vuelta a nivel de la arteria subclavia?",
    options:[
      {id:"a",text:"Nervio laríngeo superior derecho"},
      {id:"b",text:"Nervio laríngeo superior izquierdo"},
      {id:"c",text:"Nervio laríngeo recurrente derecho",correct:true},
      {id:"d",text:"Nervio laríngeo recurrente izquierdo"}],
    note:"El recurrente derecho rodea la subclavia y el izquierdo el arco aórtico, diferencia que explica por qué el izquierdo es más largo y más vulnerable." },

  { type:"single", title:"Tensor de las cuerdas",
    prompt:"¿Qué músculo laríngeo tensa las cuerdas vocales verdaderas?",
    options:[
      {id:"a",text:"Aritenoides"},
      {id:"b",text:"Vocal"},
      {id:"c",text:"Cricotiroideo",correct:true},
      {id:"d",text:"Tiroaritenoideo"}],
    note:"El cricotiroideo es además el único intrínseco inervado por el laríngeo superior; todos los demás dependen del recurrente." },

  { type:"match", title:"Músculos laríngeos",
    prompt:"Empareja el músculo intrínseco de la laringe con su función.",
    origins:[
      {id:"o1",num:"1",label:"Cricotiroideo"},
      {id:"o2",num:"2",label:"Cricoaritenoideo posterior"},
      {id:"o3",num:"3",label:"Cricoaritenoideo lateral"},
      {id:"o4",num:"4",label:"Tiroaritenoideo"}],
    options:[
      {id:"d3",text:"Aductor de la glotis",match:"o3"},
      {id:"d1",text:"Tensor de las cuerdas vocales",match:"o1"},
      {id:"d4",text:"Relaja y acorta las cuerdas vocales",match:"o4"},
      {id:"d2",text:"Dilatador (abductor) de la glotis",match:"o2"}],
    note:"El cricoaritenoideo posterior es el único abductor, así que su parálisis bilateral compromete la vía aérea." }

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
      origins: q.origins.map((o, k) => ({ ...o, color: COLORS[k % COLORS.length] })),
      options: q.options.map(o => ({ id: o.id, text: o.text })) };
  if (q.type === "single" || q.type === "multi")
    return { ...base, options: q.options.map(o => ({ id: o.id, text: o.text })) };
  if (q.type === "tf")    return base;
  if (q.type === "blank") return { ...base, text: q.text, blanks: q.accept.length };
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
    const arr = Array.isArray(given) ? given : [given];
    let ok = 0;
    q.accept.forEach((alts, i) => {
      const g = norm(arr[i] || "");
      if (g && alts.some(a => similar(norm(a), g))) ok++;
    });
    return { ok, total: q.accept.length };
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
      color: COLORS[k % COLORS.length], text: q.options.find(x => x.match === o.id).text }));
  if (q.type === "single") return { id: q.options.find(o => o.correct).id };
  if (q.type === "tf")     return { answer: q.answer };
  if (q.type === "multi")  return { ids: q.options.filter(o => o.correct).map(o => o.id) };
  if (q.type === "blank")  return { texts: q.accept.map(a => a[0]), all: q.accept };
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
const EMOJI_POOL = ["🧠","🦷","👁️","👂","👃","🦴","💀","👅"];
const EMOJI_BLOCK = ["🖕","🍆","🍑","🔞"];

// Toma el primer emoji real de lo que escriba el alumno.
// Intl.Segmenter mantiene juntas las secuencias compuestas,
// como las de tono de piel o las unidas con ZWJ.
function firstEmoji(s) {
  const raw = String(s || "").trim();
  if (!raw) return "";
  let g;
  try { g = [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(raw)][0].segment; }
  catch (e) { g = Array.from(raw)[0]; }
  if (!g || g.length > 16) return "";
  if (EMOJI_BLOCK.includes(g)) return "";
  return /\p{Extended_Pictographic}/u.test(g) ? g : "";
}

function playerList(room) {
  return [...room.players.values()]
    .map(p => ({ name: p.name, score: p.score, c: p.c, g: p.g,
                 online: p.online, answered: p.answers[room.q] !== undefined }))
    .sort((a, b) => b.score - a.score);
}
function newUid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
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

// Segundos de espera antes de revelar sola la respuesta cuando ya
// contestaron todos. Pon null si prefieres revelar siempre a mano.
let AUTO_REVEAL_MS = 1500;

function doReveal(code, room) {
  if (!room || room.phase !== "question") return;
  room.phase = "reveal";
  const q = QUESTIONS[room.q];
  const solution = solutionFor(q);
  if (q.type !== "cloud") {
    for (const p of room.players.values()) {
      if (!p.online) continue;
      const given = p.answers[room.q];
      const { ok, total } = grade(q, given);
      io.to(p.sid).emit("reveal", { type: q.type, solution, note: q.note, given, ok, total, score: p.score });
    }
  } else {
    io.to(code).emit("reveal", { type: "cloud", note: q.note, cloud: cloudList(room) });
  }
  io.to(room.hostId).emit("host:reveal", { type: q.type, solution, note: q.note,
    players: playerList(room), cloud: cloudList(room) });
  pushHost(code);
}

// Cuando ya respondieron todos, revela sola tras una pausa corta,
// para que el último alcance a ver que su respuesta se registró.
// Pone al día a un alumno que acaba de (re)entrar: le manda la
// pantalla que corresponde al momento en que va la sala.
function resync(socket, room, player) {
  const q = QUESTIONS[room.q];
  if (room.phase === "lobby") return socket.emit("lobby");
  if (room.phase === "end") return socket.emit("end", { players: playerList(room) });
  socket.emit("question", { ...questionForClient(room.q), startedAt: room.startedAt,
    alreadyAnswered: player.answers[room.q] !== undefined });
  if (room.phase === "reveal") {
    if (q.type === "cloud") socket.emit("reveal", { type: "cloud", note: q.note, cloud: cloudList(room) });
    else {
      const given = player.answers[room.q];
      const { ok, total } = grade(q, given);
      socket.emit("reveal", { type: q.type, solution: solutionFor(q), note: q.note,
        given, ok, total, score: player.score });
    }
  }
}

function maybeAutoReveal(code, room) {
  if (AUTO_REVEAL_MS === null || room.auto === false) return;
  if (room.phase !== "question" || QUESTIONS[room.q].type === "cloud") return;
  const online = [...room.players.values()].filter(p => p.online);
  if (online.length === 0) return;
  for (const p of online) if (p.answers[room.q] === undefined) return;
  const q = room.q;
  setTimeout(() => {
    const r = rooms.get(code);
    if (r && r.phase === "question" && r.q === q) doReveal(code, r);
  }, AUTO_REVEAL_MS);
}

io.on("connection", socket => {

  socket.on("host:create", cb => {
    if (typeof cb !== "function") cb = () => {};
    const code = newCode();
    // La dirección pública se deduce de la cabecera de la petición,
    // así el QR funciona en local y en Render sin configurar nada.
    const h = socket.handshake.headers || {};
    const proto = (h["x-forwarded-proto"] || "https").split(",")[0].trim();
    const url = h.origin || (h.host ? proto + "://" + h.host : "");
    if (url) {
      QRCode.toString(url, { type: "svg", margin: 1, width: 260, color: { dark: "#0E1A21", light: "#EFE7DB" } },
        (err, svg) => { if (!err) io.to(socket.id).emit("host:qr", { svg, url }); });
    }
    rooms.set(code, { hostId: socket.id, players: new Map(), phase: "lobby", q: 0, startedAt: 0, cloud: [], auto: true });
    socket.join(code);
    socket.data = { role: "host", room: code };
    cb({ code });
    pushHost(code);
  });

  socket.on("player:join", (data, cb) => {
    // Un cliente sin función de respuesta no debe poder tumbar la sala.
    if (typeof cb !== "function") cb = () => {};
    const { code, name, color, glyph, uid } = data || {};
    const c = String(code || "").trim().toUpperCase();
    const room = rooms.get(c);
    if (!room) return cb({ error: "Esa sala no existe. Revisa las letras en la pantalla." });
    const clean = String(name || "").trim().slice(0, 22);
    if (!clean) return cb({ error: "Escribe tu nombre." });
    const col = AVATAR_COLORS.includes(color) ? color : AVATAR_COLORS[Math.floor(Math.random() * 8)];
    const gl = firstEmoji(glyph) || EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];

    // Si vuelve alguien que ya estaba, recupera su puntaje y sus
    // respuestas en vez de entrar como persona nueva.
    const id = (typeof uid === "string" && uid.length >= 6 && uid.length <= 40) ? uid : newUid();
    const prev = room.players.get(id);
    const player = prev
      ? Object.assign(prev, { name: clean, c: col, g: gl, sid: socket.id, online: true })
      : { name: clean, score: 0, answers: {}, c: col, g: gl, sid: socket.id, online: true };
    room.players.set(id, player);

    socket.join(c);
    socket.data = { role: "player", room: c, uid: id };
    cb({ ok: true, uid: id, rejoined: !!prev });
    resync(socket, room, player);
    pushHost(c);
  });

  socket.on("host:start", () => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (room && room.hostId === socket.id) startQuestion(code, room);
  });

  socket.on("player:answer", given => {
    const code = socket.data && socket.data.room, room = rooms.get(code);
    if (!room || room.phase !== "question") return;
    const player = room.players.get(socket.data.uid);
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
    maybeAutoReveal(code, room);
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
    if (room && room.hostId === socket.id) doReveal(code, room);
  });

  socket.on("host:auto", on => {
    const room = rooms.get(socket.data && socket.data.room);
    if (room && room.hostId === socket.id) room.auto = !!on;
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
    else {
      const p = room.players.get(d.uid);
      if (p && p.sid === socket.id) { p.online = false; pushHost(d.room); }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor escuchando en el puerto " + PORT));
