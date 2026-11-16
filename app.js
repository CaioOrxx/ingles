"use strict";
/* App de Inglês · Fase 1. Tudo fica salvo neste aparelho (localStorage).
   Avanço por progresso: 16 semanas × 7 dias = 112 dias de estudo, um dia novo por dia do calendário. */

const KEY = "ingles-app-v1";
const DAYS = ["Dia 1", "Dia 2", "Dia 3", "Dia 4", "Dia 5", "Dia 6", "Dia 7"];
const NWEEKS = WEEKS.length;
const NDAYS = NWEEKS * 7;

/* ---------- datas (sempre no fuso do aparelho) ---------- */
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const weekday = s => (parse(s).getDay() + 6) % 7; // 0 = segunda
const mondayOf = s => addDays(s, -weekday(s));
const br = s => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
function realToday() {
  // ?d=AAAA-MM-DD só para testar outros dias no Mac
  const q = new URLSearchParams(location.search).get("d");
  return /^\d{4}-\d\d-\d\d$/.test(q || "") ? q : ymd(new Date());
}
let T = realToday();

/* ---------- estado ---------- */
const blank = () => ({ v: 1, name: "", began: null, newPerDay: 12, xp: 0,
  cards: {}, newLog: {}, log: {}, done: {}, thermo: {}, tests: {}, ach: {}, seen: {} });
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(blank(), s); } catch (e) {}
  return blank();
}
let S = load();
/* Migração 1 → 2: tarefas "só nesta semana" ganharam identificação própria
   e a gravação no celular (dia 1 da semana 1 e dia 7 da semana 13) saiu. */
if (!S.ids) {
  [[1, 0, false], [1, 1, true], [1, 2, true], [1, 4, true], [1, 5, true], [1, 6, true], [13, 6, false], [16, 6, true]].forEach(([n, j, keep]) => {
    const old = k => `w${n}d${j}k${k}`, was = S.done[old(1)];
    delete S.done[old(1)];
    if (keep && was) S.done[`w${n}d${j}once`] = was;
    for (let k = 2; k < 6; k++) { if (S.done[old(k)]) S.done[old(k - 1)] = S.done[old(k)]; delete S.done[old(k)]; }
  });
  S.ids = 2;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast("Não consegui salvar. Faça um backup no Perfil."); }
}
save();
const dayLog = d => (S.log[d] = S.log[d] || { rev: false, xp: 0, n: 0 });
function addXP(n) { S.xp = Math.max(0, S.xp + n); dayLog(T).xp += n; }

/* ---------- utilidades ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const $ = s => document.querySelector(s);
const vocabList = w => w.v.split("|").map(s => { const i = s.indexOf("="); return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; });
const songOf = w => SONGS[(w.n - 1) % SONGS.length];
const shuffle = arr => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
function ask(html, okLabel = "Confirmar", cancelLabel = "Cancelar") {
  return new Promise(res => {
    const m = $("#modal");
    m.innerHTML = `<div class="box">${html}<div class="row" style="margin-top:16px">
      ${cancelLabel ? `<button class="btn ghost" data-r="0">${cancelLabel}</button>` : ""}<button class="btn" data-r="1">${okLabel}</button></div></div>`;
    m.hidden = false;
    m.onclick = e => { const b = e.target.closest("[data-r]"); if (!b && e.target !== m) return;
      m.hidden = true; m.onclick = null; res(b ? b.dataset.r === "1" : false); };
  });
}

/* ---------- voz ---------- */
let voice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === "en-US" && /Samantha|Ava|Allison|Susan|Alex/.test(v.name))
    || vs.find(v => v.lang === "en-US") || vs.find(v => /^en/.test(v.lang)) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text) {
  if (!("speechSynthesis" in window)) return toast("Este aparelho não tem voz disponível.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
  u.lang = "en-US"; if (voice) u.voice = voice; u.rate = 0.9;
  speechSynthesis.speak(u);
}

/* ---------- explicações do "?" ---------- */
const HELP = {
  review: ["🃏 Revisão dos cartões", "Veja a palavra em inglês, <b>diga em voz alta</b> (o 🔊 mostra a pronúncia) e tente lembrar o significado. Toque para ver a resposta e seja honesto: <b>Errei</b> (volta hoje), <b>Difícil</b>, <b>Bom</b> ou <b>Fácil</b>. Quanto melhor você sabe, mais tempo o cartão demora para voltar.", "revisar bem na hora em que você está quase esquecendo é o que faz a palavra fixar."],
  video: ["📺 Input: vídeo", "Abra a busca, escolha um vídeo e assista uma vez <b>com legenda em inglês</b> e outra <b>sem</b>. Se entender menos de 70%, troque por um mais fácil. No YouTube, toque em <b>Salvar</b> e escolha a playlist <i>Nível atual</i>: ele volta em outros dias da semana.", "você aprende ouvindo coisas que entende quase tudo."],
  grammar: ["📖 Gramática", "Leia o quadro da semana (no Mapa), ouça cada exemplo no 🔊 e repita <b>3 vezes em voz alta</b>. Depois invente 2 frases suas, sobre a sua vida.", "a regra só gruda quando você usa nas suas próprias frases."],
  chorus: ["🎤 Chorusing", "No vídeo do Dia 1, escolha 30 segundos e <b>fale junto, ao mesmo tempo</b> que a pessoa, umas 10 vezes, até a sua voz acompanhar a dela.", "treina pronúncia e ritmo sem a pressão de falar sozinho."],
  shadow: ["🔁 Shadowing", "No vídeo do Dia 1, escolha 30 a 60 segundos e fale <b>logo depois</b> da pessoa, como um eco, sem pausar o vídeo. Umas 5 vezes.", "é o exercício que mais destrava a fala."],
  ai: ["🤖 Conversa com a IA", "Toque em <b>Copiar prompt</b>, abra o app do Claude, ative o <b>modo de voz</b> e cole. Converse só em inglês; se travar, ele te dá uma dica. No fim, ele mostra seus 3 principais erros.", "é treino de fala real, sem vergonha de errar."],
  read: ["📚 Leitura", "Leia o livro simplificado no Kindle por 15 min. <b>Não pare a cada palavra</b>: se você entende a história, está ótimo.", "ler muito e com fluidez ensina mais que traduzir palavra por palavra."],
  write: ["✍️ Escrita com correção", "Escreva o que a tarefa pede (5 frases bastam). Copie o prompt, cole na IA com o seu texto e leia as correções <b>em voz alta</b>.", "errar, ver o certo e repetir é como o erro some."],
  music: ["🎵 Música da semana", "① Ouça sem a letra e anote o que pegou. ② Ouça lendo a letra no Genius e toque nos trechos destacados. ③ Adicione 5 frases aqui (inglês + tradução): viram cartões. ④ Cante junto um trecho, 5 vezes.", "música repete sozinha na sua cabeça, então o inglês dela fixa sem esforço."],
  thermo: ["🌡️ Termômetro", "Ouça <i>Ya Hit</i> (Future) <b>sem a letra</b> e dê uma nota de 0 a 10 para o quanto entendeu. Não tem certo nem errado: é para ver a sua evolução mês a mês.", ""],
  test: ["📝 Teste da semana", "O app mostra 15 palavras desta semana. Tente lembrar o significado, veja a resposta e diga se acertou. As que você errar <b>voltam mais cedo</b> na revisão. O teste não trava o avanço: serve para você ver o que já fixou.", "puxar da memória (e não só reler) é o que mais fortalece a lembrança."],
  barrel: ["🗂️ Próxima semana", "Abra os links e, no YouTube, deixe salvos na playlist <i>Nível atual</i> os vídeos da semana que vem. Assim, no Dia 1 você começa sem procurar nada.", "sem atrito para começar, fica mais fácil não pular dia."],
  practice: ["🔁 Treinar meus erros", "Repete as palavras que você errou ou achou difíceis nos últimos dias. Diga se acertou ou errou: as erradas voltam até sair. <b>Não muda</b> o agendamento dos cartões.", "errar e tentar de novo logo depois ajuda o erro a não se repetir."]
};
const helpBtn = key => key ? `<button class="help" data-act="help" data-h="${key}" aria-label="Como fazer">?</button>` : "";
function showHelp(key) {
  const h = HELP[key]; if (!h) return;
  return ask(`<h2 style="margin-top:0">${h[0]}</h2><p>${h[1]}</p>${h[2] ? `<p class="small muted"><b>Por quê:</b> ${h[2]}</p>` : ""}`, "Entendi", null);
}

/* ---------- os 7 dias de cada semana (mesma regra do roteiro) ---------- */
const promptBox = text => `<textarea class="prompt" readonly>${esc(text)}</textarea><button class="btn sm blue" data-act="copy">Copiar prompt</button>`;
const memo = {};
function buildDays(w) {
  const key = `${w.n}|${S.name}|${S.newPerDay}`;
  if (memo[w.n] && memo[w.n].key === key) return memo[w.n].days;
  const i = w.n - 1;
  const words = vocabList(w);
  const sample = words.slice(0, 15).map(x => x[0]).join(", ");
  const next = WEEKS[i + 1];
  const shadow = w.n >= 5;
  const song = songOf(w);
  const ygLinks = w.yg.map(x => a(yg(x), x)).join(" · ");
  const rev0 = { kind: "review", help: "review", m: 10, l: "Revisão dos cartões", h: "As palavras desta semana entraram nos seus cartões (até " + S.newPerDay + " novas por dia). Leia cada palavra em voz alta, ouça no 🔊 e só então veja a resposta." };
  const rev = { kind: "review", help: "review", m: 10, l: "Revisão dos cartões", h: "Faça as revisões do dia. Diga cada palavra em voz alta antes de virar o cartão." };
  const rp = `Você é meu parceiro de conversa em inglês. Sou iniciante (nível A1) e travo para falar por insegurança com a pronúncia, então seja paciente.\n\nVamos fazer um roleplay: ${w.rp}\n\nRegras:\n- Fale só em inglês, com frases curtas e simples, e faça uma pergunta por vez.\n- Use estas palavras quando der: ${sample}.\n- Se eu travar ou responder em português, me dê uma dica curta em português e me deixe tentar de novo.\n- No final, me mostre em português os 3 erros mais importantes que cometi e como dizer certo.\n\nPode começar.`;
  const fix = "Corrija este texto em inglês. Sou iniciante (nível A1).\nMostre:\n1. O texto corrigido.\n2. Cada erro, explicado em português em uma linha.\n3. Uma versão mais natural, mas ainda simples.\n\nTexto:\n[cole aqui]";
  const prep = next
    ? `Próxima semana: <b>${next.t}</b>. No YouTube, deixe salvos na playlist <i>Nível atual</i>: ${a(yt(next.mon), "vídeo do Dia 1")} · ${a(yt(next.wed), "vídeo do Dia 3")} · ${a(yt(next.audio), "áudios para o tempo morto")}.`
    : `Crie no YouTube a playlist <i>Desafio</i> com 5 vídeos de tecnologia ou games que você quer entender. Assista a 1 minuto de cada e veja quanto já entende comparado com o começo.`;
  const days = [
    { t: "Vídeo novo", b: [rev0, { help: "video", m: 20, l: "Input: vídeo novo", h: `Escolha um vídeo desta busca: ${a(yt(w.mon), "YouTube: " + esc(w.mon))}. Assista uma vez com legenda em inglês e outra sem. Se entender menos de uns 70%, troque de vídeo. No YouTube, toque em <b>Salvar</b> embaixo do vídeo e escolha a playlist <i>Nível atual</i>: ele volta no Dia 2 e no Dia 6.` }] },
    { t: shadow ? "Gramática + shadowing" : "Gramática + chorusing", b: [rev,
      { help: "grammar", m: 10, l: "Gramática: " + w.g.title, h: "Leia o quadro de gramática desta semana (no Mapa). Ouça cada exemplo no 🔊, repita em voz alta 3 vezes e depois invente 2 frases suas, sobre a sua vida." },
      shadow
        ? { help: "shadow", m: 10, l: "Shadowing", h: `No vídeo do Dia 1, escolha 30 a 60 segundos. Dê play e repita logo depois do falante, como um eco, sem pausar. Faça umas 5 vezes. Para as palavras difíceis, ouça nativos no YouGlish: ${ygLinks}.` }
        : { help: "chorus", m: 10, l: "Chorusing", h: `No vídeo do Dia 1, escolha 30 segundos e fale junto com o áudio, ao mesmo tempo, umas 10 vezes, até a sua voz acompanhar a do falante. Para as palavras difíceis, ouça nativos no YouGlish: ${ygLinks}.` }] },
    { t: "Segundo vídeo", b: [rev, { help: "video", m: 20, l: "Input: " + w.wl, h: `${a(yt(w.wed), "YouTube: " + esc(w.wed))}. Assista com legenda em inglês e, se der tempo, de novo sem legenda. No YouTube, toque em <b>Salvar</b> embaixo do vídeo e escolha a playlist <i>Nível atual</i>.` }] },
    { t: "Conversa com a IA", b: [rev, { help: "ai", m: 20, l: "Fala e roleplay", h: "Abra o app do Claude, ative o <b>modo de voz</b>, cole o prompt abaixo e converse. O objetivo é falar, não falar bonito: sotaque não é erro." + promptBox(rp) }] },
    { t: "Leitura + escrita", b: [rev,
      { help: "read", m: 15, l: "Leitura", h: `Leia um livro simplificado no Kindle (${a(amz(w.read), "buscar: " + esc(w.read))}). Não pare a cada palavra: se você entende a história, está ótimo.` },
      { help: "write", m: 5, l: "Escrita com correção", h: `Escreva: ${w.wr} Depois, cole na IA com o prompt abaixo e leia as correções em voz alta.` + promptBox(fix) }] },
    { t: "Música da semana", b: [rev, { kind: "music", help: "music", m: 20, l: "Música: " + esc(song[0]) + " (" + esc(song[1]) + ")", h: `<ol>
<li><b>Ouça 1 vez sem a letra</b> (${a(spt(song[0] + " " + song[1]), "abrir no Spotify")}). Anote as palavras soltas que você pegou, mesmo que sejam poucas.</li>
<li><b>Abra a letra no Genius</b> (${a(gen(song[0] + " " + song[1]), "buscar no Genius")}) e ouça de novo lendo junto. Toque nos trechos destacados: cada um explica a gíria ou a referência.</li>
<li><b>Escolha 5 frases</b> que você curtiu e adicione aqui embaixo (inglês + tradução). Elas viram cartões. Prefira frases que dá para usar numa conversa normal.</li>
<li><b>Cante ou rime junto</b> o refrão ou um trecho de 20 a 30 segundos, umas 5 vezes, até acompanhar o ritmo. Isso é shadowing: é o que destrava a pronúncia.</li>
</ol>` + phraseForm() }] },
    { t: "Teste + próxima semana", b: [rev,
      { kind: "test", help: "test", id: `w${w.n}test`, m: 5, l: "Teste da semana", h: "" },
      { help: "barrel", id: `w${w.n}d6k1`, m: 5, l: next ? "Preparar a próxima semana" : "Playlist Desafio", h: prep }] }
  ];
  if (w.n % 4 === 0) days[5].b.push({ kind: "thermo", help: "thermo", id: `w${w.n}thermo`, m: 0, l: "Termômetro do mês 🌡️", h: "" });
  days.forEach((d, j) => {
    d.b = d.b.map(t => Object.assign({}, t));
    // a identificação vem da posição ANTES de inserir a tarefa "só nesta semana",
    // assim mudar essas tarefas no roteiro não bagunça o que já foi marcado
    d.b.forEach((t, k) => { t.id = t.id || `w${w.n}d${j}k${k}`; t.kind = t.kind || "task"; });
    if (w.setup && w.setup[j]) d.b.splice(1, 0, { kind: "once", id: `w${w.n}d${j}once`, l: "📌 " + w.setup[j].replace(/<[^>]+>/g, "").split(/[.:]/)[0], h: w.setup[j] });
    d.x = `<p>Tempo morto: ouça ${a(yt(w.audio), "áudios desta semana")} na caminhada, no banho ou lavando louça. Depois do Dia 6, ponha <b>${esc(song[0])}</b> no repeat: com a letra já entendida, cada vez que ouve, fixa mais.</p><p><b>Micro-hábito:</b> ${w.mh.replace("[seu nome]", esc(S.name || "[seu nome]"))}</p>`;
  });
  memo[w.n] = { key, days };
  return days;
}
const taskXP = t => t.kind === "once" ? 10 : t.kind === "thermo" || t.kind === "test" ? 15 : (t.m || 10);
const required = d => d.b.filter(t => t.kind !== "review" && t.kind !== "once");

/* ---------- progresso: trilha de 112 dias ---------- */
const dayAt = i => ({ i, w: WEEKS[Math.floor(i / 7)], j: i % 7 });
// data em que o dia ficou completo (a da última tarefa obrigatória marcada), ou null
function dayDate(i) {
  const { w, j } = dayAt(i);
  let last = "";
  for (const t of required(buildDays(w)[j])) { const d = S.done[t.id]; if (!d) return null; if (d > last) last = d; }
  return last;
}
function firstIncomplete() { for (let i = 0; i < NDAYS; i++) if (!dayDate(i)) return i; return NDAYS; }
// um dia novo por dia do calendário: o próximo só libera se o anterior foi completado antes de hoje
function unlocked(i) {
  if (dayDate(i)) return true;
  const cur = firstIncomplete();
  if (i !== cur) return false;
  return i === 0 || dayDate(i - 1) < T;
}
// o dia que a tela Hoje mostra
function todayPos() {
  const cur = firstIncomplete();
  if (cur > 0 && dayDate(cur - 1) === T) return { ...dayAt(cur - 1), doneToday: true, next: cur < NDAYS ? dayAt(cur) : null };
  if (cur >= NDAYS) return { over: true };
  return { ...dayAt(cur), doneToday: false };
}
const posWeek = () => { const p = todayPos(); return p.over ? NWEEKS : p.w.n; };
const phaseOver = () => firstIncomplete() >= NDAYS;
const weekUnlocked = n => unlocked((n - 1) * 7);
function weekProgress(w) {
  const all = buildDays(w).flatMap(d => required(d));
  return Math.round(100 * all.filter(t => S.done[t.id]).length / all.length);
}

/* ---------- cartões e repetição espaçada ---------- */
function syncCards() {
  if (!S.began) return;
  let added = 0;
  for (let n = 1; n <= NWEEKS && weekUnlocked(n); n++) {
    vocabList(WEEKS[n - 1]).forEach(([en, pt], i) => {
      const id = "v:" + en.toLowerCase();
      if (!S.cards[id]) { S.cards[id] = { f: en, b: pt, w: n, o: i, s: "v", nw: true, due: null, ivl: 0, ease: 2.5, reps: 0, lapses: 0 }; added++; }
    });
  }
  if (added) save();
}
const usedNew = () => S.newLog[T] || 0;
function dueIds() {
  return Object.keys(S.cards).filter(id => !S.cards[id].nw && S.cards[id].due && S.cards[id].due <= T)
    .sort((x, y) => S.cards[x].due.localeCompare(S.cards[y].due));
}
function newIds() {
  // frases de música não contam no limite diário: foi você quem escolheu
  const left = Math.max(0, S.newPerDay - usedNew());
  const ids = Object.keys(S.cards).filter(id => S.cards[id].nw);
  const songs = ids.filter(id => S.cards[id].s === "m");
  const words = ids.filter(id => S.cards[id].s !== "m")
    .sort((x, y) => (S.cards[y].pri || 0) - (S.cards[x].pri || 0) || S.cards[x].w - S.cards[y].w || S.cards[x].o - S.cards[y].o).slice(0, left);
  return [...songs, ...words];
}
function nextIvl(c, g) {
  // g: 0 errei, 1 difícil, 2 bom, 3 fácil. 0 dias = volta ainda hoje.
  if (c.nw || c.ivl === 0) return [0, 1, 1, 3][g];
  if (g === 0) return 0;
  if (g === 1) return Math.min(365, Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)));
  if (g === 2) return Math.min(365, Math.max(c.ivl + 1, Math.round(c.ivl * c.ease)));
  return Math.min(365, Math.max(c.ivl + 2, Math.round(c.ivl * c.ease * 1.3)));
}
const fmtIvl = d => d === 0 ? "agora" : d === 1 ? "1 dia" : d < 30 ? d + " dias" : Math.round(d / 30) + " mês";
function grade(id, g) {
  const c = S.cards[id];
  const wasReview = !c.nw && c.ivl > 0;
  const ivl = nextIvl(c, g);
  if (c.nw) { if (c.s !== "m") S.newLog = { [T]: usedNew() + 1 }; c.nw = false; delete c.pri; }
  if (wasReview) {
    if (g === 0) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); }
    if (g === 1) c.ease = Math.max(1.3, c.ease - 0.15);
    if (g === 3) c.ease = Math.min(3.2, c.ease + 0.15);
  }
  if (g <= 1) c.le = T; // último erro/dificuldade: alimenta o "Treinar meus erros"
  c.ivl = ivl; c.due = addDays(T, ivl); c.reps++;
  dayLog(T).n++;
  addXP(g === 0 ? 1 : 2);
  return ivl === 0;
}
// errou no teste da semana: a palavra volta mais cedo
function reinforce(id) {
  const c = S.cards[id]; if (!c) return;
  c.le = T;
  if (c.nw) { c.pri = 1; return; }
  const tomorrow = addDays(T, 1);
  c.ivl = Math.min(c.ivl, 1);
  if (!c.due || c.due > tomorrow) c.due = tomorrow;
}
function practicePool() {
  const recent = Object.keys(S.cards).filter(id => S.cards[id].le && diffDays(S.cards[id].le, T) <= 7)
    .sort((x, y) => S.cards[y].le.localeCompare(S.cards[x].le)).slice(0, 20);
  if (recent.length) return { ids: recent, fallback: false };
  const wk = posWeek();
  return { ids: shuffle(Object.keys(S.cards).filter(id => S.cards[id].w === wk && S.cards[id].reps > 0)).slice(0, 10), fallback: true };
}
function testPool(n) {
  const ids = vocabList(WEEKS[n - 1]).map(([en]) => "v:" + en.toLowerCase()).filter(id => S.cards[id]);
  const seen = shuffle(ids.filter(id => S.cards[id].reps > 0)), rest = shuffle(ids.filter(id => !S.cards[id].reps));
  return [...seen, ...rest].slice(0, 15);
}

/* ---------- ofensiva ---------- */
function streakInfo() {
  let cur = 0, best = 0; const usedWeek = {}; const frozen = [];
  if (!S.began) return { cur, best, frozen, freezeLeft: true, today: false };
  for (let d = S.began; d <= T; d = addDays(d, 1)) {
    if (S.log[d] && S.log[d].rev) { cur++; best = Math.max(best, cur); }
    else if (d === T) { /* hoje ainda dá tempo */ }
    else if (cur > 0 && !usedWeek[mondayOf(d)]) { usedWeek[mondayOf(d)] = true; frozen.push(d); }
    else cur = 0;
  }
  return { cur, best, frozen, freezeLeft: !usedWeek[mondayOf(T)], today: !!(S.log[T] && S.log[T].rev) };
}
function levelInfo(xp) {
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = 100 + (lvl - 1) * 50; }
  return { lvl, into: xp - acc, need };
}

/* ---------- conquistas ---------- */
const studiedWords = () => Object.values(S.cards).filter(c => c.s === "v" && c.reps > 0).length;
const weekDone = n => [0, 1, 2, 3, 4, 5, 6].every(j => dayDate((n - 1) * 7 + j));
const ACH = [
  { id: "first", i: "🌱", t: "Primeiro passo", d: "Fez a primeira revisão", ok: () => Object.values(S.log).some(l => l.rev) },
  { id: "s7", i: "🔥", t: "7 dias seguidos", d: "Uma semana sem quebrar a ofensiva", ok: s => s.best >= 7 },
  { id: "s30", i: "☄️", t: "30 dias seguidos", d: "Um mês inteiro de constância", ok: s => s.best >= 30 },
  { id: "w100", i: "📘", t: "100 palavras", d: "Estudou 100 palavras", ok: () => studiedWords() >= 100 },
  { id: "w500", i: "📚", t: "500 palavras", d: "Estudou 500 palavras", ok: () => studiedWords() >= 500 },
  { id: "song", i: "🎵", t: "Primeira música", d: "Fez a primeira música da semana", ok: () => WEEKS.some(w => buildDays(w)[5].b.some(t => t.kind === "music" && S.done[t.id])) },
  { id: "thermo", i: "🌡️", t: "Primeiro termômetro", d: "Mediu o quanto entende o Ya Hit", ok: () => Object.keys(S.thermo).length > 0 },
  { id: "week", i: "🏅", t: "Semana completa", d: "Fez os 7 dias de uma semana", ok: () => WEEKS.some(w => weekDone(w.n)) },
  { id: "phase", i: "🎓", t: "Fase 1 completa", d: "Completou as 16 semanas", ok: () => phaseOver() }
];
function checkAch() {
  const s = streakInfo();
  ACH.forEach(x => {
    if (!S.ach[x.id] && x.ok(s)) { S.ach[x.id] = T; addXP(25); setTimeout(() => toast(`${x.i} Conquista: ${x.t}! +25 XP`), 400); }
  });
  save();
}

/* ---------- navegação ---------- */
let tab = "today", mapWeek = null, openTasks = new Set(), openDay = null, hidePt = false;
// session.mode: "srs" (revisão normal), "practice" (treinar erros), "test" (teste da semana)
let session = null;
function go(t) {
  tab = t; if (t !== "map") mapWeek = null;
  if (t === "review") { startSession(); if (!S.seen.review) { S.seen.review = T; save(); setTimeout(() => showHelp("review"), 200); } }
  render(); window.scrollTo(0, 0);
}
function render() {
  T = realToday();
  document.body.classList.toggle("onb", !S.began);
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  if (!S.began) { $("#view").innerHTML = viewOnboarding(); return; }
  syncCards();
  const pending = dueIds().length + newIds().length;
  $("#badge").textContent = pending ? (pending > 99 ? "99+" : pending) : "";
  $("#view").innerHTML = tab === "today" ? viewToday() : tab === "review" ? viewReview()
    : tab === "map" ? (mapWeek ? viewWeek(WEEKS[mapWeek - 1]) : viewMap()) : viewProfile();
}

/* ---------- telas ---------- */
function viewOnboarding() {
  return `<div class="big-emoji">🇺🇸</div>
  <h1 class="center">Bora aprender inglês</h1>
  <p class="center muted">30 minutos por dia, 16 semanas. Tudo fica salvo só neste aparelho.</p>
  <div class="card">
    <label class="lbl" for="nm">Como quer ser chamado? (opcional)</label>
    <input class="field" id="nm" autocomplete="off" placeholder="Seu nome">
    <p class="small muted">Você avança no seu ritmo: cada dia do roteiro libera quando você completa o anterior, <b>um dia novo por dia</b>. Perdeu um dia? Nada fica para trás, você continua de onde parou.</p>
  </div>
  <button class="btn block" data-act="begin">Começar</button>`;
}

function topBar(title) {
  const s = streakInfo(), L = levelInfo(S.xp);
  const h = new Date().getHours();
  const hi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `<div class="top"><div class="hello"><small>${hi}${S.name ? ", " + esc(S.name) : ""}</small><h1>${title}</h1></div>
    <span class="chip fire${s.today ? "" : " off"}" title="Dias seguidos">🔥 ${s.cur}</span>
    <span class="chip xp" title="Nível">⭐ Nv ${L.lvl}</span></div>`;
}

function taskHTML(t, ctx) {
  const today = ctx === "today";
  if (t.kind === "review") {
    const done = !!(S.log[T] && S.log[T].rev);
    const n = dueIds().length + newIds().length;
    if (!today) return `<div class="task"><div class="thead"><div class="check" style="border-style:dashed"></div><div class="tinfo"><div class="tlabel">${t.l}</div><div class="tmeta">${t.m} min · todo dia, na aba Revisão</div></div>${helpBtn(t.help)}</div></div>`;
    return `<div class="task${done ? " done" : ""}"><div class="thead"><div class="check">✓</div>
      <div class="tinfo"><div class="tlabel">${t.l}</div><div class="tmeta">${t.m} min · ${done ? "feita hoje" : n + " cartões esperando"} · <b>+10 XP</b></div></div>${helpBtn(t.help)}</div>
      <div style="padding:0 14px 14px">${done && !n ? "" : `<button class="btn block${done ? " ghost" : ""}" data-act="go" data-to="review">${done ? "Revisar mais" : "Revisar agora"}</button>`}
      <p class="small muted" style="margin-bottom:0">${t.h}</p></div></div>`;
  }
  if (t.kind === "thermo") {
    const wn = +t.id.match(/w(\d+)/)[1];
    const v = S.thermo[wn];
    return `<div class="task${v != null ? " done" : ""} open" data-id="${t.id}"><div class="thead"><div class="check">✓</div>
      <div class="tinfo"><div class="tlabel">${t.l}</div><div class="tmeta">${v != null ? "Nota " + v + "/10" : "a cada 4 semanas"} · <b>+15 XP</b></div></div>${helpBtn(t.help)}</div>
      <div class="tbody"><p>Ouça <b>Ya Hit</b> (Future) sem a letra e dê uma nota de 0 a 10 para o quanto entendeu. ${a(spt("Ya Hit Future"), "Abrir no Spotify")}.</p>
      <input type="range" min="0" max="10" step="1" value="${v != null ? v : 0}" id="th-${wn}" oninput="this.nextElementSibling.textContent=this.value+'/10'">
      <div class="center" style="font-size:28px;font-weight:900;color:var(--orange)">${v != null ? v : 0}/10</div>
      ${thermoHistory(wn)}
      <button class="btn block" data-act="thermo" data-w="${wn}">Salvar nota</button></div></div>`;
  }
  if (t.kind === "test") {
    const wn = +t.id.match(/w(\d+)/)[1];
    const r = S.tests[wn];
    return `<div class="task${S.done[t.id] ? " done" : ""} open" data-id="${t.id}"><div class="thead"><div class="check">✓</div>
      <div class="tinfo"><div class="tlabel">📝 ${t.l}</div><div class="tmeta">${r ? `Acertou ${r.s} de ${r.t}` : "15 palavras da semana"} · <b>+15 XP</b></div></div>${helpBtn(t.help)}</div>
      <div class="tbody"><p class="small muted">Tente lembrar o significado de cada palavra. As que você errar voltam mais cedo na revisão.</p>
      <button class="btn block${r ? " ghost" : ""}" data-act="starttest" data-w="${wn}">${r ? "Refazer o teste" : "Começar o teste"}</button></div></div>`;
  }
  const done = !!S.done[t.id];
  const open = openTasks.has(t.id);
  const meta = t.kind === "once" ? `única vez · não trava o avanço · <b>+${taskXP(t)} XP</b>` : `${t.m} min · <b>+${taskXP(t)} XP</b>`;
  return `<div class="task${done ? " done" : ""}${open ? " open" : ""}${t.kind === "once" ? " once" : ""}" data-id="${t.id}">
    <div class="thead"><button class="check" data-act="toggle" aria-label="Marcar como feito">✓</button>
      <div class="tinfo" data-act="expand"><div class="tlabel">${t.l}</div><div class="tmeta">${meta}</div></div>
      ${helpBtn(t.help)}<button class="chev" data-act="expand" aria-label="Ver detalhes">›</button></div>
    <div class="tbody">${t.h}</div></div>`;
}
function thermoHistory(upto) {
  const prev = Object.keys(S.thermo).map(Number).filter(n => n < upto).sort((x, y) => x - y);
  return prev.length ? `<p class="small muted">Antes: ${prev.map(n => `semana ${n}: <b>${S.thermo[n]}/10</b>`).join(" · ")}</p>` : "";
}
function phraseForm() {
  return `<div class="card" style="background:var(--bg);margin-bottom:0"><b>Adicionar frase da música</b>
    <input class="field" id="ph-en" placeholder="Frase em inglês" autocomplete="off" autocapitalize="off">
    <input class="field" id="ph-pt" placeholder="Tradução" autocomplete="off">
    <button class="btn block blue" data-act="addphrase">Adicionar aos cartões</button></div>`;
}

function viewToday() {
  const p = todayPos();
  if (p.over) {
    return topBar("Hoje") + `<div class="card celebrate"><div class="big-emoji">🎓</div><h2>Fase 1 concluída!</h2>
      <p>Continue revisando os cartões todo dia para manter a ofensiva. Peça para a IA refazer o seu teste de nível e planeje a Fase 2.</p></div>`
      + taskHTML({ kind: "review", help: "review", m: 10, l: "Revisão dos cartões", h: "Mantenha as palavras vivas." }, "today") + extraHTML(WEEKS[NWEEKS - 1]);
  }
  const { w, j } = p;
  const day = buildDays(w)[j];
  const tasks = day.b;
  const isDoneT = t => t.kind === "review" ? S.log[T] && S.log[T].rev : S.done[t.id];
  const doneN = tasks.filter(isDoneT).length;
  const pct = Math.round(100 * doneN / tasks.length);
  const s = streakInfo();
  const nx = p.next ? buildDays(p.next.w)[p.next.j] : null;
  return topBar("Hoje") + `
  <div class="card hero">
    <div class="kicker">Semana ${w.n} · ${DAYS[j]} de 7</div>
    <div class="ttl">${day.t}</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="barrow"><span>${doneN} de ${tasks.length} tarefas</span><span>${pct === 100 ? "Dia completo! 🎉" : w.t}</span></div>
  </div>
  ${!s.today && s.cur > 0 ? `<p class="small muted center">Faça a revisão hoje para manter os 🔥 ${s.cur} dias.${s.freezeLeft ? " Se falhar, o ❄️ congelamento da semana segura." : ""}</p>` : ""}
  ${pct === 100 ? `<div class="card celebrate"><div class="big-emoji">🏆</div><b>Dia completo!</b>
    <p class="muted small">${nx ? `Amanhã: <b>Semana ${p.next.w.n} · ${DAYS[p.next.j]}</b>, ${nx.t}. Um dia por vez é o que faz a memória fixar.` : "Esse foi o último dia do roteiro!"}</p></div>`
    : p.doneToday ? `<p class="small center" style="color:var(--green)">✅ Atividade do dia feita. Falta só a <b>revisão dos cartões</b> para fechar o dia.</p>` : ""}
  ${tasks.map(t => taskHTML(t, "today")).join("")}
  ${pct === 100 ? extraHTML(w) : ""}
  <details class="extra"><summary>Fora dos 30 min (tempo morto)</summary>${day.x}</details>`;
}
function extraHTML(w) {
  const pool = practicePool();
  return `<h3>Treino extra (opcional)</h3>
  <div class="task open"><div class="thead"><div class="tinfo"><div class="tlabel">🔁 Treinar meus erros</div>
    <div class="tmeta">${pool.ids.length ? (pool.fallback ? "sem erros recentes: treina palavras da semana" : pool.ids.length + " palavras que você errou ou achou difíceis") : "nenhuma palavra para treinar ainda"}</div></div>${helpBtn("practice")}</div>
    ${pool.ids.length ? `<div class="tbody"><button class="btn block blue" data-act="practice">Treinar agora</button></div>` : ""}</div>
  <div class="task open"><div class="thead"><div class="tinfo"><div class="tlabel">🎧 Mais input</div><div class="tmeta">ouvir mais nunca é demais</div></div></div>
    <div class="tbody"><p>Um vídeo ou áudio a mais do tema da semana (<b>${w.t}</b>): ${a(yt(w.audio), "áudios")} · ${a(yt(w.mon), "vídeos")}. Escolha algo que você entende quase tudo.</p></div></div>`;
}

function viewReview() {
  const s = session;
  const mode = s ? s.mode : "srs";
  const title = mode === "test" ? `Teste · semana ${s.week}` : mode === "practice" ? "Treinar erros" : "Revisão";
  const head = `<div class="top"><div class="hello"><h1>${title}</h1></div>${helpBtn(mode === "test" ? "test" : mode === "practice" ? "practice" : "review")}</div>`;
  if (mode !== "srs") return head + viewDrill(s);
  const phrases = Object.entries(S.cards).filter(([, c]) => c.s === "m");
  const phraseList = `<h3>Frases das músicas (${phrases.length})</h3>${phraseForm()}
    ${phrases.length ? `<div class="list" style="margin-top:12px">${phrases.map(([id, c]) => `<div class="li"><button class="say" data-say="${esc(c.f)}">🔊</button><div><div class="en">${esc(c.f)}</div><div class="small muted">${esc(c.b)}</div></div><button class="say" style="margin-left:auto" data-act="delphrase" data-id="${esc(id)}" aria-label="Apagar">🗑️</button></div>`).join("")}</div>` : ""}`;
  if (!s || !s.queue.length) {
    const done = S.log[T] && S.log[T].rev;
    return head + `<div class="card celebrate"><div class="big-emoji">${done ? "✅" : "🃏"}</div>
      <h2>${done ? "Revisão do dia feita!" : "Nada para revisar agora"}</h2>
      <p class="muted">${done ? "A ofensiva de hoje está garantida. Os próximos cartões voltam nos dias certos." : "Volte amanhã."}</p>
      ${s && s.total ? `<p><b>${s.total}</b> cartões revisados nesta rodada.</p>` : ""}
      <button class="btn block" data-act="go" data-to="today">Voltar para Hoje</button></div>` + phraseList;
  }
  const id = s.queue[0], c = S.cards[id];
  const nNew = s.queue.filter(x => S.cards[x].nw).length;
  const tag = c.s === "m" ? "🎵 frase de música" : c.nw ? "palavra nova · semana " + c.w : "revisão · semana " + c.w;
  const grades = ["Errei", "Difícil", "Bom", "Fácil"];
  return head + `
  <div class="counts"><span class="n">${nNew} novas</span><span class="d">${s.queue.length - nNew} para revisar</span></div>
  ${flashHTML(c, tag, s.shown)}
  ${s.shown
    ? `<div class="grades">${grades.map((g, k) => `<button class="btn g${k}" data-act="grade" data-g="${k}">${g}<small>${fmtIvl(nextIvl(c, k))}</small></button>`).join("")}</div>`
    : `<button class="btn block blue" data-act="show">Mostrar resposta</button>`}
  <div style="height:8px"></div>` + phraseList;
}
function flashHTML(c, tag, shown) {
  return `<div class="flash" data-act="${shown ? "" : "show"}">
    <div class="tag">${tag}</div>
    <div class="front">${esc(c.f)}</div>
    <button class="say" data-say="${esc(c.f)}" aria-label="Ouvir">🔊</button>
    ${shown ? `<hr><div class="back">${esc(c.b)}</div>` : `<div class="small muted">Diga em voz alta antes de virar</div>`}
  </div>`;
}
// treino de erros e teste da semana: só "Errei" / "Acertei", sem mexer no agendamento
function viewDrill(s) {
  if (!s.queue.length) {
    if (s.mode === "test") {
      const wrong = s.wrong.map(id => S.cards[id]).filter(Boolean);
      return `<div class="card celebrate"><div class="big-emoji">${s.right >= s.total * 0.8 ? "🎯" : "💪"}</div>
        <h2>Você acertou ${s.right} de ${s.total}</h2>
        <p class="muted">${s.right >= s.total * 0.8 ? "Ótimo! Acertar 80% ou mais quer dizer que a semana fixou." : "Normal errar. As que você errou voltam mais cedo na revisão."}</p>
        <button class="btn block" data-act="go" data-to="today">Voltar para Hoje</button></div>
        ${wrong.length ? `<h3>Para reforçar</h3><div class="list">${wrong.map(c => `<div class="li"><button class="say" data-say="${esc(c.f)}">🔊</button><span class="en">${esc(c.f)}</span><span class="pt">${esc(c.b)}</span></div>`).join("")}</div>` : ""}`;
    }
    return `<div class="card celebrate"><div class="big-emoji">💪</div><h2>Treino feito!</h2>
      <p class="muted">${s.total} respostas. Errar e tentar de novo é exatamente como a palavra fixa.</p>
      <button class="btn block" data-act="go" data-to="today">Voltar para Hoje</button></div>`;
  }
  const c = S.cards[s.queue[0]];
  const left = s.mode === "test" ? `${s.total - s.queue.length + 1} de ${s.total}` : `${s.queue.length} para treinar`;
  return `<div class="counts"><span class="n">${left}</span></div>
  ${flashHTML(c, s.mode === "test" ? "teste da semana" : "treino de erros", s.shown)}
  ${s.shown
    ? `<div class="row"><button class="btn red" data-act="drill" data-ok="0">Errei</button><button class="btn" data-act="drill" data-ok="1">Acertei</button></div>`
    : `<button class="btn block blue" data-act="show">Mostrar resposta</button>`}
  <div style="height:14px"></div><button class="btn block ghost sm" data-act="go" data-to="today">Sair</button>`;
}
function startSession() {
  if (!S.began) return;
  syncCards();
  const q = [...dueIds(), ...newIds()];
  session = { mode: "srs", queue: q, shown: false, total: 0 };
  if (!q.length && !(S.log[T] && S.log[T].rev) && Object.keys(S.cards).length) finishReview();
}
function finishReview() {
  const l = dayLog(T);
  if (!l.rev) { l.rev = true; addXP(10); toast(todayPos().doneToday ? "Dia completo! 🎉 +10 XP" : "Revisão do dia feita! 🔥 +10 XP"); }
  checkAch();
}
function openDrill(sess) { session = sess; tab = "review"; mapWeek = null; render(); window.scrollTo(0, 0); }

function viewMap() {
  const cw = posWeek();
  return `<div class="top"><div class="hello"><h1>Mapa</h1><small>16 semanas · do A1 ao A2</small></div></div>` +
  WEEKS.map(w => {
    const lock = !weekUnlocked(w.n), p = lock ? 0 : weekProgress(w);
    const rt = lock ? "🔒" : p === 100 ? "✅" : w.n === cw ? "agora" : p + "%";
    return `<button class="wk${w.n === cw && !lock ? " cur" : ""}${lock ? " lock" : ""}" data-act="openweek" data-w="${w.n}">
      <div class="num" style="--p:${p}"><span>${w.n}</span></div>
      <div><div class="wt">${w.t}</div><div class="ws">${w.en} · ${esc(w.g.title)}</div></div><div class="wr">${rt}</div></button>`;
  }).join("");
}
function viewWeek(w) {
  const words = vocabList(w), days = buildDays(w), song = songOf(w);
  const p = todayPos();
  const tj = !p.over && p.w.n === w.n ? p.j : -1;
  if (openDay === null || openDay.w !== w.n) openDay = { w: w.n, j: tj };
  const base = (w.n - 1) * 7;
  return `<button class="back" data-act="mapback">‹ Mapa</button>
  <div class="card hero"><div class="kicker">Semana ${w.n} · ${w.en}</div><div class="ttl">${w.t}</div>
    <div class="bar"><i style="width:${weekProgress(w)}%"></i></div><div class="barrow"><span>${weekProgress(w)}% feito</span><span>${words.length} palavras</span></div></div>
  <p>${w.why}</p>
  <h3>Dias da semana</h3>
  ${days.map((d, j) => {
    const lock = !unlocked(base + j);
    return `<div class="day${j === tj ? " today" : ""}${!lock && openDay.j === j ? " open" : ""}${lock ? " lockd" : ""}">
    <button class="dhead" data-act="${lock ? "lockedday" : "day"}" data-j="${j}"><span class="dn">${DAYS[j]}</span><span class="dt">${d.t}</span>${dayDate(base + j) ? `<span class="ok">✓</span>` : lock ? "🔒" : ""}<span class="chev">›</span></button>
    ${lock ? "" : `<div class="dbody">${d.b.map(t => taskHTML(t, "map")).join("")}<details class="extra"><summary>Fora dos 30 min</summary>${d.x}</details></div>`}</div>`;
  }).join("")}
  <h3>Gramática: ${w.g.title}</h3>
  <div class="grammar">${w.g.text}<ul class="ex">${w.g.ex.map(e => `<li><button class="say" data-say="${esc(e[0])}">🔊</button><div><div class="en">${esc(e[0])}</div><div class="pt">${esc(e[1])}</div></div></li>`).join("")}</ul></div>
  <h3>Vocabulário · ${words.length}</h3>
  <button class="btn sm ghost" data-act="hidept">${hidePt ? "Mostrar tradução" : "Esconder tradução"}</button>
  <div class="list${hidePt ? " hidept" : ""}" style="margin-top:10px">${words.map(([en, pt]) => `<div class="li"><button class="say" data-say="${esc(en)}">🔊</button><span class="en">${esc(en)}</span><span class="pt">${esc(pt)}</span></div>`).join("")}</div>
  <h3>Recursos</h3>
  <ul class="res">
    <li><b>Vídeo do Dia 1:</b> ${a(yt(w.mon), esc(w.mon))}</li>
    <li><b>Vídeo do Dia 3 (${w.wl}):</b> ${a(yt(w.wed), esc(w.wed))}</li>
    <li><b>Tempo morto (áudio):</b> ${a(yt(w.audio), esc(w.audio))}</li>
    <li><b>Música (Dia 6):</b> ${esc(song[0])} · ${esc(song[1])} · ${a(gen(song[0] + " " + song[1]), "Genius")} · ${a(spt(song[0] + " " + song[1]), "Spotify")}</li>
    <li><b>Leitura no Kindle:</b> ${a(amz(w.read), esc(w.read))}</li>
    <li><b>Pronúncia com nativos (YouGlish):</b> ${w.yg.map(x => a(yg(x), x)).join(" · ")}</li>
    <li><b>Conversa:</b> modo de voz do app do Claude (prompt pronto no Dia 4)</li>
  </ul>`;
}

function viewProfile() {
  const s = streakInfo(), L = levelInfo(S.xp), p = todayPos();
  const phrases = Object.values(S.cards).filter(c => c.s === "m").length;
  const th = Object.keys(S.thermo).map(Number).sort((x, y) => x - y);
  const tests = Object.keys(S.tests).map(Number).sort((x, y) => x - y);
  return `<div class="top"><div class="hello"><small>${S.name ? esc(S.name) : "Perfil"}</small><h1>Nível ${L.lvl}</h1></div><span class="chip xp">⭐ ${S.xp} XP</span></div>
  <div class="bar gold"><i style="width:${Math.round(100 * L.into / L.need)}%"></i></div>
  <div class="barrow"><span>${L.into} / ${L.need} XP</span><span>próximo: nível ${L.lvl + 1}</span></div>
  <div class="stats" style="margin-top:16px">
    <div class="stat"><div class="v" style="color:var(--orange)">🔥 ${s.cur}</div><div class="k">dias seguidos</div></div>
    <div class="stat"><div class="v">🏆 ${s.best}</div><div class="k">recorde</div></div>
    <div class="stat"><div class="v">${s.freezeLeft ? "❄️ 1" : "❄️ 0"}</div><div class="k">${s.freezeLeft ? "congelamento disponível" : "congelamento usado nesta semana"}</div></div>
    <div class="stat"><div class="v">📘 ${studiedWords()}</div><div class="k">palavras estudadas</div></div>
    <div class="stat"><div class="v">🎵 ${phrases}</div><div class="k">frases de músicas</div></div>
    <div class="stat"><div class="v">🗺️ ${p.over ? "✓" : `${p.w.n}·${p.j + 1}`}</div><div class="k">${p.over ? "fase 1 concluída" : `semana ${p.w.n}, dia ${p.j + 1}`}</div></div>
  </div>
  <h3>Conquistas</h3>
  <div class="achs">${ACH.map(x => `<div class="ach ${S.ach[x.id] ? "on" : "off"}"><div class="i">${x.i}</div><div class="t">${x.t}</div><div class="small muted" style="font-size:11px;margin-top:2px">${S.ach[x.id] ? br(S.ach[x.id]) : x.d}</div></div>`).join("")}</div>
  <h3>Testes da semana</h3>
  <div class="card">${tests.length ? tests.map(n => `<div class="barrow" style="color:var(--ink)"><span>Semana ${n}</span><b>${S.tests[n].s}/${S.tests[n].t}</b></div><div class="bar" style="height:8px;margin:4px 0 10px"><i style="width:${Math.round(100 * S.tests[n].s / S.tests[n].t)}%"></i></div>`).join("") : `<p class="muted small">O primeiro teste é no Dia 7 da semana 1.</p>`}</div>
  <h3>Termômetro (Ya Hit)</h3>
  <div class="card">${th.length ? th.map(n => `<div class="barrow" style="color:var(--ink)"><span>Semana ${n}</span><b>${S.thermo[n]}/10</b></div><div class="bar" style="height:8px;margin:4px 0 10px"><i style="width:${S.thermo[n] * 10}%;background:var(--orange)"></i></div>`).join("") : `<p class="muted small">A primeira medição é no Dia 6 da semana 4.</p>`}</div>
  <h3>Ajustes</h3>
  <div class="card">
    <label class="lbl" for="pf-name">Nome</label>
    <input class="field" id="pf-name" value="${esc(S.name)}" placeholder="Seu nome">
    <div class="barrow" style="color:var(--ink);align-items:center;margin:8px 0 4px"><span>Cartões novos por dia</span>
      <span class="stepper"><button class="btn sm ghost" data-act="npd" data-d="-2">−</button><b>${S.newPerDay}</b><button class="btn sm ghost" data-act="npd" data-d="2">+</button></span></div>
    <p class="small muted">12 é o recomendado: dá conta das palavras da semana sem acumular revisão.</p>
  </div>
  <h3>Backup</h3>
  <div class="card">
    <p class="small muted" style="margin-top:0">O progresso fica só neste aparelho. Exporte de vez em quando e guarde o arquivo (ex.: no iCloud Drive).</p>
    <div class="row"><button class="btn blue" data-act="export">Exportar arquivo</button><button class="btn ghost" data-act="copyjson">Copiar texto</button></div>
    <div style="height:14px"></div>
    <div class="row"><label class="btn ghost" for="imp-file">Importar arquivo</label><button class="btn ghost" data-act="pastejson">Colar texto</button></div>
    <input type="file" id="imp-file" accept=".json,application/json,text/plain" hidden>
  </div>
  <p class="small muted center">App de Inglês · Fase 1 · funciona sem internet</p>`;
}

/* ---------- backup ---------- */
const backupText = () => JSON.stringify({ app: "ingles", at: new Date().toISOString(), state: S });
async function importText(txt) {
  let data;
  try { data = JSON.parse(txt.trim()); } catch (e) { return toast("Esse texto não é um backup válido."); }
  const st = data && data.app === "ingles" ? data.state : null;
  if (!st || st.v !== 1 || typeof st.cards !== "object") return toast("Esse arquivo não é um backup deste app.");
  const ok = await ask(`<h2 style="margin-top:0">Substituir o progresso?</h2><p class="muted">O progresso atual deste aparelho será trocado pelo do backup (${esc((data.at || "").slice(0, 10))}, ${Object.keys(st.cards).length} cartões, ${st.xp} XP).</p>`, "Substituir");
  if (!ok) return;
  S = Object.assign(blank(), st); save(); session = null; toast("Backup importado ✅"); go("today");
}

/* ---------- ações ---------- */
function afterProgress(wasDone) {
  // avisa quando o dia acabou de ficar completo
  const p = todayPos();
  if (!wasDone && p.doneToday) setTimeout(() => toast(S.log[T] && S.log[T].rev ? "Dia completo! 🎉 O próximo libera amanhã." : "Atividade feita! ✅ Falta a revisão dos cartões."), 300);
  checkAch(); render();
}
document.addEventListener("click", async e => {
  const sayBtn = e.target.closest("[data-say]");
  if (sayBtn) { e.stopPropagation(); say(sayBtn.dataset.say); return; }
  const tb = e.target.closest("#tabs button");
  if (tb) { go(tb.dataset.tab); return; }
  const el = e.target.closest("[data-act]");
  if (!el || !el.dataset.act) return;
  const act = el.dataset.act;
  const taskEl = el.closest(".task");
  const tid = taskEl && taskEl.dataset.id;

  if (act === "begin") {
    S.name = $("#nm").value.trim().slice(0, 30);
    S.began = T; save(); go("today"); return;
  }
  if (act === "help") { e.stopPropagation(); showHelp(el.dataset.h); return; }
  if (act === "go") { e.preventDefault(); go(el.dataset.to); return; }
  if (act === "expand") { openTasks.has(tid) ? openTasks.delete(tid) : openTasks.add(tid); taskEl.classList.toggle("open"); return; }
  if (act === "toggle") {
    const w = WEEKS[+tid.match(/^w(\d+)/)[1] - 1];
    const t = buildDays(w).flatMap(d => d.b).find(x => x.id === tid);
    const wasDone = todayPos().doneToday;
    if (S.done[tid]) { delete S.done[tid]; addXP(-taskXP(t)); }
    else { S.done[tid] = T; addXP(taskXP(t)); toast(`+${taskXP(t)} XP`); }
    afterProgress(wasDone); return;
  }
  if (act === "thermo") {
    const wn = +el.dataset.w, v = +$("#th-" + wn).value;
    const wasDone = todayPos().doneToday, first = S.thermo[wn] == null;
    S.thermo[wn] = v; if (!S.done[`w${wn}thermo`]) S.done[`w${wn}thermo`] = T; if (first) addXP(15);
    toast(`Termômetro: ${v}/10 salvo`); afterProgress(wasDone); return;
  }
  if (act === "starttest") {
    const n = +el.dataset.w, q = testPool(n);
    if (!q.length) return toast("As palavras desta semana ainda não entraram nos cartões.");
    openDrill({ mode: "test", week: n, queue: q, shown: false, total: q.length, right: 0, wrong: [] }); return;
  }
  if (act === "practice") {
    const pool = practicePool();
    openDrill({ mode: "practice", queue: pool.ids, shown: false, total: 0 }); return;
  }
  if (act === "drill") {
    const s = session, id = s.queue.shift(), ok = el.dataset.ok === "1";
    s.shown = false;
    if (s.mode === "test") {
      if (ok) s.right++; else { s.wrong.push(id); reinforce(id); }
      if (!s.queue.length) {
        const n = s.week, wasDone = todayPos().doneToday;
        S.tests[n] = { s: s.right, t: s.total, d: T };
        if (!S.done[`w${n}test`]) { S.done[`w${n}test`] = T; addXP(15); }
        save(); afterProgress(wasDone); return;
      }
    } else {
      s.total++; addXP(1);
      if (!ok) { S.cards[id].le = T; s.queue.splice(Math.min(3, s.queue.length), 0, id); }
    }
    save(); render(); return;
  }
  if (act === "addphrase") {
    const en = $("#ph-en").value.trim(), pt = $("#ph-pt").value.trim();
    if (!en || !pt) return toast("Preencha a frase e a tradução.");
    S.cards["m:" + Date.now()] = { f: en, b: pt, w: posWeek(), o: 0, s: "m", nw: true, due: null, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
    addXP(5); save(); toast("Frase adicionada aos cartões 🎵 +5 XP");
    if (tab === "review" && session && session.mode === "srs") startSession();
    render(); return;
  }
  if (act === "delphrase") {
    if (await ask("<h2 style='margin-top:0'>Apagar esta frase?</h2><p class='muted'>O cartão sai da revisão.</p>", "Apagar")) {
      delete S.cards[el.dataset.id]; save(); startSession(); render();
    }
    return;
  }
  if (act === "show") { if (session && session.queue.length) { session.shown = true; render(); say(S.cards[session.queue[0]].f); } return; }
  if (act === "grade") {
    const id = session.queue.shift();
    const again = grade(id, +el.dataset.g);
    if (again) session.queue.splice(Math.min(3, session.queue.length), 0, id);
    session.shown = false; session.total++;
    save();
    if (!session.queue.length) finishReview();
    render(); return;
  }
  if (act === "openweek") {
    e.preventDefault();
    const n = +el.dataset.w;
    if (!weekUnlocked(n)) return toast(`🔒 Complete a semana ${n - 1} para liberar`);
    tab = "map"; mapWeek = n; openDay = null; render(); window.scrollTo(0, 0); return;
  }
  if (act === "mapback") { mapWeek = null; render(); window.scrollTo(0, 0); return; }
  if (act === "day") { const j = +el.dataset.j; openDay.j = openDay.j === j ? -1 : j; render(); return; }
  if (act === "lockedday") {
    const i = (mapWeek - 1) * 7 + +el.dataset.j, cur = firstIncomplete();
    return toast(i === cur ? "🔒 Libera amanhã: um dia novo por dia" : `🔒 Complete o ${DAYS[(i - 1) % 7]} primeiro`);
  }
  if (act === "hidept") { hidePt = !hidePt; render(); return; }
  if (act === "copy") {
    const ta = el.previousElementSibling;
    try { await navigator.clipboard.writeText(ta.value); }
    catch (err) { ta.select(); ta.setSelectionRange(0, 1e6); document.execCommand("copy"); }
    toast("Prompt copiado ✅"); return;
  }
  if (act === "npd") { S.newPerDay = Math.max(2, Math.min(40, S.newPerDay + +el.dataset.d)); save(); render(); return; }
  if (act === "export") {
    const blob = new Blob([backupText()], { type: "application/json" });
    const f = new File([blob], `ingles-backup-${T}.json`, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: "Backup do app de inglês" }); return; } catch (err) { if (err.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = f.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Backup exportado ✅"); return;
  }
  if (act === "copyjson") {
    try { await navigator.clipboard.writeText(backupText()); toast("Backup copiado. Cole numa nota para guardar."); }
    catch (err) { toast("Não consegui copiar. Use Exportar arquivo."); }
    return;
  }
  if (act === "pastejson") {
    const ok = await ask(`<h2 style="margin-top:0">Colar backup</h2><textarea class="field" id="imp-txt" rows="6" placeholder="Cole aqui o texto do backup"></textarea>`, "Importar");
    if (ok) importText($("#imp-txt") ? $("#imp-txt").value : "");
    return;
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "imp-file" && e.target.files[0]) {
    const r = new FileReader(); r.onload = () => importText(String(r.result)); r.readAsText(e.target.files[0]); e.target.value = "";
  }
  if (e.target.id === "pf-name") { S.name = e.target.value.trim().slice(0, 30); save(); toast("Nome salvo"); }
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && realToday() !== T) { session = null; if (tab === "review") startSession(); render(); } });

/* ---------- iniciar ---------- */
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
