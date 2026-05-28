(function () {
  "use strict";

  const VOWELS_LOWER = "аеёиоуыэюя";
  const STRESSED_VOWELS = new Set("АЕЁИОУЫЭЮЯ".split(""));
  const ROUND_SIZE = 5;

  function isVowel(ch) {
    return VOWELS_LOWER.includes(ch.toLowerCase());
  }

  // Index of the stressed letter. For Ё/ё it's always stressed.
  function stressIndex(word) {
    for (let i = 0; i < word.length; i++) {
      if (STRESSED_VOWELS.has(word[i])) return i;
      if (word[i] === "ё") return i;
    }
    return -1;
  }

  function otherVowelPositions(word) {
    const s = stressIndex(word);
    const out = [];
    for (let i = 0; i < word.length; i++) {
      if (i !== s && isVowel(word[i])) out.push(i);
    }
    return out;
  }

  // Move stress to a different vowel. Returns null if impossible.
  function makeWrongStress(word) {
    const others = otherVowelPositions(word);
    if (others.length === 0) return null;
    // Lowercase the original stressed letter (preserve Ё as ё when moving away — rare in our list).
    const lower = word
      .split("")
      .map((ch, i) => (i === stressIndex(word) ? ch.toLowerCase() : ch))
      .join("");
    const idx = others[Math.floor(Math.random() * others.length)];
    return lower.slice(0, idx) + lower[idx].toUpperCase() + lower.slice(idx + 1);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Render a word: stressed letter in uppercase wrapped in <span class="s">,
  // the rest in lowercase. Matches the FIPI textbook style.
  function renderWord(word) {
    const sIdx = stressIndex(word);
    return word
      .split("")
      .map((ch, i) => {
        if (i === sIdx) return `<span class="s">${ch.toUpperCase()}</span>`;
        return ch.toLowerCase();
      })
      .join("");
  }

  // ---- State ----
  const POOL = (window.WORDS || []).filter(w => otherVowelPositions(w).length > 0);
  let recentlyUsed = new Set();
  let score = { correct: 0, total: 0 };
  let round = null; // { items: [{display, original, isWrong}], wrongIdx }
  let answered = false;

  function pickRound() {
    if (recentlyUsed.size > POOL.length - ROUND_SIZE) recentlyUsed = new Set();
    const fresh = shuffle(POOL.filter(w => !recentlyUsed.has(w)));
    const picked = fresh.slice(0, ROUND_SIZE);
    picked.forEach(w => recentlyUsed.add(w));

    const wrongIdx = Math.floor(Math.random() * ROUND_SIZE);
    const items = picked.map((w, i) => {
      if (i === wrongIdx) {
        const wrong = makeWrongStress(w);
        return { original: w, display: wrong || w, isWrong: true };
      }
      return { original: w, display: w, isWrong: false };
    });
    return { items, wrongIdx };
  }

  // ---- DOM ----
  const boardEl = document.getElementById("board");
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");
  const scoreEl = document.getElementById("score");

  function renderBoard() {
    boardEl.innerHTML = "";
    round.items.forEach((it, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "word-btn";
      btn.dataset.index = String(i);
      btn.innerHTML = `
        <span class="num">${i + 1}</span>
        <span class="word">${renderWord(it.display)}</span>
      `;
      btn.addEventListener("click", () => onAnswer(i, btn));
      boardEl.appendChild(btn);
    });
  }

  function onAnswer(index, btn) {
    if (answered) return;
    answered = true;
    const item = round.items[index];
    score.total += 1;
    const isCorrect = item.isWrong;
    if (isCorrect) score.correct += 1;

    // Highlight chosen and reveal correct one.
    const buttons = boardEl.querySelectorAll(".word-btn");
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === round.wrongIdx) b.classList.add(i === index ? "correct" : "reveal");
      if (i === index && !isCorrect) b.classList.add("wrong");
    });

    const correctWord = round.items[round.wrongIdx];
    feedbackEl.hidden = false;
    feedbackEl.classList.toggle("ok", isCorrect);
    feedbackEl.classList.toggle("err", !isCorrect);
    feedbackEl.innerHTML = isCorrect
      ? `Верно! Ошибка была в слове <strong>${renderWord(correctWord.display)}</strong> — правильно: <strong>${renderWord(correctWord.original)}</strong>.`
      : `Не угадал. Ошибка в слове <strong>${renderWord(correctWord.display)}</strong> — правильно: <strong>${renderWord(correctWord.original)}</strong>.`;

    nextBtn.hidden = false;
    nextBtn.focus();
    updateScore();
  }

  function updateScore() {
    scoreEl.textContent = `${score.correct} / ${score.total}`;
  }

  function startRound() {
    answered = false;
    feedbackEl.hidden = true;
    feedbackEl.classList.remove("ok", "err");
    feedbackEl.innerHTML = "";
    nextBtn.hidden = true;
    round = pickRound();
    renderBoard();
  }

  nextBtn.addEventListener("click", startRound);
  resetBtn.addEventListener("click", () => {
    score = { correct: 0, total: 0 };
    recentlyUsed = new Set();
    updateScore();
    startRound();
  });

  // Bootstrap
  updateScore();
  startRound();
})();
