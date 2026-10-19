/* Ведаўс: landing page behaviour. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMQ.matches;
  const desktopMQ = window.matchMedia('(min-width: 961px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hasIO = 'IntersectionObserver' in window;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Header shadow ---------- */
  const header = $('#siteHeader');
  let headerTick = false;
  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    headerTick = false;
  };
  window.addEventListener('scroll', () => {
    if (!headerTick) { headerTick = true; requestAnimationFrame(updateHeader); }
  }, { passive: true });
  updateHeader();

  /* ---------- Mobile drawer ---------- */
  const burger = $('#burger');
  const drawer = $('#drawer');
  const setDrawer = (open) => {
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => {
    const open = drawer.hidden;
    setDrawer(open);
    if (open) drawer.querySelector('a').focus();
  });
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); }
  });
  desktopMQ.addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

  /* ---------- Download + install helper ---------- */
  // Hook for analytics later. Intentionally empty: the site has no trackers.
  function trackDownload(source) { return source; }

  const dlg = $('#installDialog');
  $$('[data-apk-link]').forEach((link) => {
    link.addEventListener('click', () => {
      trackDownload(link.dataset.source || 'link');
      if (link.hasAttribute('data-install-help') && dlg && typeof dlg.showModal === 'function') {
        window.setTimeout(() => { if (!dlg.open) dlg.showModal(); }, 450);
      }
    });
  });
  if (dlg) {
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { dlg.close(); return; }
      if (e.target === dlg) {
        const r = dlg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) dlg.close();
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.reveal');
  if (!hasIO || reduced()) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    revealEls.forEach((el) => revealIO.observe(el));
  }

  /* ---------- Counters (160 / 1600) ---------- */
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    el.textContent = String(target);
    if (!hasIO || reduced()) return;
    el.textContent = '0';
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1500;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
  });

  /* ---------- Hero: tilt and parallax on pointer ---------- */
  const stage = $('#stage');
  if (stage && finePointer.matches && !reduced()) {
    const hero = stage.closest('.hero');
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      stage.style.setProperty('--mx', cx.toFixed(4));
      stage.style.setProperty('--my', cy.toFixed(4));
      raf = (Math.abs(tx - cx) > 0.0008 || Math.abs(ty - cy) > 0.0008) ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    hero.addEventListener('pointermove', (e) => {
      if (!desktopMQ.matches) return;
      const r = stage.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -0.6, 0.6);
      ty = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -0.6, 0.6);
      kick();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

  /* ---------- Hero: tap the lynx and it bounces ---------- */
  const mascot = $('.mascot');
  if (mascot) {
    mascot.addEventListener('click', () => {
      if (reduced()) return;
      mascot.classList.remove('is-boing');
      void mascot.offsetWidth;
      mascot.classList.add('is-boing');
    });
    mascot.addEventListener('animationend', (e) => {
      if (e.animationName === 'm-boing') mascot.classList.remove('is-boing');
    });
  }

  /* ---------- Tour: sticky phone on desktop, carousel on mobile ---------- */
  const steps = $$('#tourSteps .step');
  const tourStage = $('#tourStage');
  const screens = tourStage ? $$('.scr', tourStage) : [];
  const rail = $('#tourRail');
  const badge = $('#tourBadge');
  const dotsWrap = $('#tourDots');
  const stepsWrap = $('#tourSteps');
  let activeStep = 0;
  const dots = steps.map((step, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Шаг ${i + 1}: ${step.querySelector('h3').textContent}`);
    if (i === 0) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => {
      const left = steps[i].offsetLeft - parseFloat(getComputedStyle(stepsWrap).paddingLeft || '0');
      stepsWrap.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
    });
    dotsWrap.appendChild(b);
    return b;
  });

  function setStep(i) {
    if (i === activeStep || i < 0 || i >= steps.length) return;
    activeStep = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    screens.forEach((s, k) => s.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    if (tourStage) tourStage.dataset.step = String(i);
    if (badge) badge.textContent = `${i + 1} из ${steps.length}`;
    if (rail) rail.style.setProperty('--p', String((i + 1) / steps.length));
  }
  if (rail) rail.style.setProperty('--p', String(1 / steps.length));

  if (hasIO && steps.length) {
    const stepIO = new IntersectionObserver((entries) => {
      if (!desktopMQ.matches) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) setStep(steps.indexOf(entry.target));
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    steps.forEach((s) => stepIO.observe(s));
  }

  let carouselTick = false;
  stepsWrap.addEventListener('scroll', () => {
    if (desktopMQ.matches || carouselTick) return;
    carouselTick = true;
    requestAnimationFrame(() => {
      carouselTick = false;
      const pitch = steps.length > 1 ? steps[1].offsetLeft - steps[0].offsetLeft : 1;
      const atEnd = stepsWrap.scrollLeft + stepsWrap.clientWidth >= stepsWrap.scrollWidth - 4;
      setStep(atEnd ? steps.length - 1 : Math.round(stepsWrap.scrollLeft / pitch));
    });
  }, { passive: true });

  /* ---------- Mini task ---------- */
  const TASK = {
    ru: {
      title: 'Задание 1',
      q: 'Где на картинке светит солнышко относительно деревьев?',
      opts: ['Вверху', 'Внизу', 'Под землёй', 'В кармане'],
      ok: 'Правильно! Молодец!',
      bad: 'Не совсем так.',
      right: (a) => `Правильный ответ: «${a}».`,
      why: 'Солнце светит с неба, а небо над деревьями. Значит, солнышко вверху.',
      notes: ['', 'Внизу под деревьями трава и корни. А солнце светит с неба, над деревьями, то есть вверху.', 'Под землёй живут кроты. А солнце светит с неба, над деревьями, то есть вверху.', 'Солнце в карман не поместится, оно больше Земли. Светит оно с неба, над деревьями, то есть вверху.'],
      again: 'Ещё раз',
      pic: 'Картинка: вверху солнце, внизу два дерева и домик между ними',
      speak: 'Прослушать задание',
      srRight: 'правильный ответ',
      srWrong: 'ваш ответ, неверно',
      rhymeLabel: 'Правило из урока перед этим заданием',
      rhyme: 'Солнце ясное — вверху,<br>Травка мягкая — внизу!',
      noVoice: 'В этом браузере нет русского голоса. В приложении задания читает Рысёнок.',
      voice: 'ru'
    },
    be: {
      title: 'Заданне 1',
      q: 'Дзе на малюнку свеціць сонейка адносна дрэў?',
      opts: ['Уверсе', 'Унізе', 'Пад зямлёй', 'У кішэні'],
      ok: 'Правільна! Малайчына!',
      bad: 'Не зусім так.',
      right: (a) => `Правільны адказ: «${a}».`,
      why: 'Сонца свеціць з неба, а неба над дрэвамі. Значыць, сонейка ўверсе.',
      notes: ['', 'Унізе пад дрэвамі трава і карані. А сонца свеціць з неба, над дрэвамі, гэта значыць уверсе.', 'Пад зямлёй жывуць краты. А сонца свеціць з неба, над дрэвамі, гэта значыць уверсе.', 'Сонца ў кішэню не змесціцца, яно большае за Зямлю. Свеціць яно з неба, над дрэвамі, гэта значыць уверсе.'],
      again: 'Яшчэ раз',
      pic: 'Малюнак: уверсе сонца, унізе два дрэвы і хатка паміж імі',
      speak: 'Праслухаць заданне',
      srRight: 'правільны адказ',
      srWrong: 'ваш адказ, няправільна',
      rhymeLabel: 'Правіла з урока перад гэтым заданнем',
      rhyme: 'Сонца ззяе ўверсе нам,<br>Траўка ўнізе — тут і там!',
      noVoice: 'У гэтым браўзеры няма беларускага голасу. У дадатку заданні чытае Рысяня.',
      voice: 'be'
    }
  };
  const CORRECT = 0;
  const ICON_OK = '<svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-check"/></svg>';
  const ICON_BAD = '<svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-x"/></svg>';

  const task = $('#task');
  if (task) {
    const wrap = $('#taskWrap');
    const optsBox = $('#opts');
    const fb = $('#taskFb');
    const again = $('#taskAgain');
    const qEl = $('#taskQ');
    const pic = $('#taskPic');
    const xpVal = $('#taskXpVal');
    const xpChip = $('#taskXp');
    const bar = $('#taskBar');
    const speakBtn = $('#speakBtn');
    const speakNote = $('#speakNote');
    const rhymeLabel = $('#rhymeLabel');
    const rhymeText = $('#rhymeText');
    const titleEl = $('.task__title', task);
    const langBtns = $$('[data-lang]', task);
    let lang = 'ru';
    let order = [0, 1, 2, 3];
    let answered = false;
    let xp = 0;

    const shuffled = (prev) => {
      let next;
      do {
        next = [0, 1, 2, 3];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
      } while (prev && next.join() === prev.join());
      return next;
    };

    const render = () => {
      const L = TASK[lang];
      optsBox.innerHTML = order.map((idx, k) => (
        `<button type="button" class="opt" data-i="${idx}" aria-keyshortcuts="${k + 1}">` +
        `<span class="opt__n" aria-hidden="true">${k + 1}</span>` +
        `<span class="opt__t">${esc(L.opts[idx])}</span>` +
        '<span class="opt__m" aria-hidden="true"></span>' +
        '<span class="visually-hidden opt__sr"></span></button>'
      )).join('');
    };

    const applyLang = () => {
      const L = TASK[lang];
      task.lang = lang;
      titleEl.textContent = L.title;
      qEl.textContent = L.q;
      pic.setAttribute('aria-label', L.pic);
      speakBtn.setAttribute('aria-label', L.speak);
      again.textContent = L.again;
      rhymeLabel.textContent = L.rhymeLabel;
      rhymeText.lang = lang;
      rhymeText.innerHTML = `<p>${L.rhyme}</p>`;
      speakNote.hidden = true;
      langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    };

    const reset = (focusFirst) => {
      answered = false;
      order = shuffled(order);
      render();
      fb.className = 'task__fb';
      fb.innerHTML = '';
      again.hidden = true;
      bar.style.width = '';
      wrap.classList.remove('is-happy');
      if (focusFirst) $('.opt', optsBox).focus();
    };

    const popXp = (tile) => {
      if (reduced()) return;
      const pop = document.createElement('span');
      pop.className = 'xp-pop';
      pop.textContent = '+10 XP';
      const tr = tile.getBoundingClientRect();
      const cr = task.getBoundingClientRect();
      pop.style.left = `${tr.right - cr.left - 110}px`;
      pop.style.top = `${tr.top - cr.top - 6}px`;
      task.appendChild(pop);
      pop.addEventListener('animationend', () => pop.remove());
    };

    const answer = (btn) => {
      if (answered || !btn) return;
      answered = true;
      const L = TASK[lang];
      const chosen = Number(btn.dataset.i);
      const isRight = chosen === CORRECT;
      $$('.opt', optsBox).forEach((o) => {
        const i = Number(o.dataset.i);
        o.setAttribute('aria-disabled', 'true');
        const mark = $('.opt__m', o);
        const sr = $('.opt__sr', o);
        if (i === CORRECT) {
          o.classList.add('is-correct');
          mark.innerHTML = ICON_OK;
          sr.textContent = `, ${L.srRight}`;
        } else if (i === chosen) {
          o.classList.add('is-wrong');
          mark.innerHTML = ICON_BAD;
          sr.textContent = `, ${L.srWrong}`;
        } else {
          o.classList.add('is-dim');
        }
      });
      bar.style.width = '100%';
      if (isRight) {
        fb.className = 'task__fb is-ok';
        fb.innerHTML = `<strong>${ICON_OK.replace('width="16" height="16"', 'width="20" height="20"')}${esc(L.ok)}</strong><p>${esc(L.why)}</p>`;
        xp += 10;
        xpVal.textContent = String(xp);
        xpChip.classList.remove('is-bump');
        void xpChip.offsetWidth;
        xpChip.classList.add('is-bump');
        wrap.classList.add('is-happy');
        popXp(btn);
        const r = btn.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2);
      } else {
        fb.className = 'task__fb is-bad';
        fb.innerHTML = `<strong>${esc(L.bad)} ${esc(L.right(L.opts[CORRECT]))}</strong><p>${esc(L.notes[chosen])}</p>`;
      }
      again.hidden = false;
      again.focus({ preventScroll: true });
    };

    optsBox.addEventListener('click', (e) => answer(e.target.closest('.opt')));
    again.addEventListener('click', () => reset(true));

    langBtns.forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.lang === lang) return;
      lang = b.dataset.lang;
      applyLang();
      reset(false);
    }));

    // Digits 1-4 answer the task while it is on screen.
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-4]$/.test(e.key)) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const r = task.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (answered) return;
      e.preventDefault();
      answer($$('.opt', optsBox)[Number(e.key) - 1]);
    });

    // Read the task aloud with the browser's own voice, if it has one.
    const synth = window.speechSynthesis;
    if (synth && typeof synth.getVoices === 'function') synth.getVoices();
    const showNote = (text) => { speakNote.textContent = text; speakNote.hidden = false; };
    speakBtn.addEventListener('click', () => {
      const L = TASK[lang];
      if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') { showNote(L.noVoice); return; }
      if (synth.speaking) { synth.cancel(); speakBtn.classList.remove('is-speaking'); return; }
      const voice = synth.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith(L.voice));
      if (!voice) { showNote(L.noVoice); return; }
      const text = `${L.q} ${order.map((idx, k) => `${k + 1}. ${L.opts[idx]}`).join('. ')}.`;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.95;
      u.onstart = () => speakBtn.classList.add('is-speaking');
      u.onend = u.onerror = () => speakBtn.classList.remove('is-speaking');
      synth.speak(u);
    });

    order = shuffled(null);
    render();
  }

  /* ---------- Confetti burst ---------- */
  function confetti(x, y) {
    if (reduced()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }
    ctx.scale(dpr, dpr);
    const colors = ['#E27B12', '#F6B23C', '#13382D', '#1E9E57', '#FFD08A', '#D23C3C', '#38D0EE'];
    const parts = Array.from({ length: 80 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 6 + Math.random() * 9;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        c: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() < 0.3
      };
    });
    const start = performance.now();
    let last = start;
    const frame = (now) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      const age = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = age > 1100 ? Math.max(0, 1 - (age - 1100) / 500) : 1;
      parts.forEach((p) => {
        p.vy += 0.38 * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
        }
        ctx.restore();
      });
      if (age < 1600) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Theme switcher demo ---------- */
  const themes = $('#themes');
  if (themes) {
    const btns = $$('[data-theme-btn]', themes);
    btns.forEach((b) => b.addEventListener('click', () => {
      const mode = b.dataset.themeBtn;
      themes.dataset.mode = mode;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $$('.scr--dark', themes).forEach((img) => img.setAttribute('aria-hidden', String(mode !== 'space')));
      $$('.scr--light', themes).forEach((img) => img.setAttribute('aria-hidden', String(mode === 'space')));
    }));
  }

  /* ---------- Subjects: grade tabs ---------- */
  const TOPICS = {"1":{"math":["Вверху, внизу. Слева, справа. Впереди, сзади","Столько же. Больше, меньше. Знаки >, <, =","Числа от 1 до 5. Сложение и вычитание","Числа от 6 до 10 и число 0","Числовой отрезок. Сравнение чисел первого десятка","Геометрические фигуры: точка, прямая, луч, отрезок","Сантиметр. Измерение длины отрезков","Связь между суммой и слагаемыми","Десяток. Двузначные числа от 11 до 20","Текстовые задачи на сложение и вычитание"],"ru":["Звуки и буквы. Гласные и согласные","Слог и ударение. Предложение","Твёрдые и мягкие согласные звуки","Звонкие и глухие согласные звуки","Алфавит. Порядок букв","Большая буква в именах и кличках животных","Правила переноса слов по слогам","Правописание ЖИ-ШИ, ЧА-ЩА, ЧУ-ЩУ","Слова, обозначающие предметы и действия","Текст и предложение. Составление рассказа"],"be":["Гукі і літары. Галосныя і зычныя","Склад і націск. Сказ","Цвёрдыя і мяккія зычныя гукі","Звонкія і глухія зычныя гукі","Алфавіт. Парадак літар","Вялікая літара ў імёнах і мянушках жывёл","Правілы пераносу слоў па складах","Правапіс ЖЫ-ШЫ, ЧЫ-ШЧЫ ў беларускай мове","Словы, якія абазначаюць прадметы і дзеянні","Тэкст і сказ. Складанне апавядання"],"world":["Живая и неживая природа","Осень в природе: золотой листопад","Растения сада и огорода: овощи и фрукты","Деревья, кустарники и травы Беларуси","Дикие и домашние животные Беларуси","Птицы родного края: зимующие и перелётные","Зима в природе: снег, лёд и мороз","Весна в природе: пробуждение жизни","Человек и его здоровье: режим дня и гигиена","Лето и безопасность: на улице, в лесу и на воде"],"en":["Greetings & Introductions (Приветствия)","Magic Colors (Цвета радуги)","Numbers 1 to 10 (Счёт от 1 до 10)","School Things (Школьные принадлежности)","Cute Animals & Pets (Животные и питомцы)","My Family (Моя семья)","My Toys (Мои любимые игрушки)","Food & Fruit (Еда и фрукты)","Body Parts (Части тела)","Action Verbs (Действия и движения)"]},"2":{"math":["Двузначные числа до 100: десятки и единицы","Сложение и вычитание без перехода через разряд","Единицы длины: миллиметр, сантиметр, дециметр, метр","Сложение и вычитание с переходом через десяток","Периметр многоугольника: треугольник, прямоугольник","Единицы времени: час и минута","Смысл действия умножения. Знак умножения (·)","Таблица умножения и деления на 2","Таблица умножения и деления на 3","Составные текстовые задачи в 2 действия"],"ru":["Главные члены предложения: подлежащее и сказуемое","Звуки и буквы: слог и ударение","Буква «Ў» в белорусском языке / Разделительный Ь","Правописание гласных после шипящих (Жи-ши, ча-ща)","Парные звонкие и глухие согласные в корне слова","Корень слова и однокоренные родственные слова","Безударные гласные в корне слова и их проверка","Слова: предметы, признаки и действия (Части речи)","Предлоги и их раздельное написание со словами","Текст: повествование и описание. Тема и план"],"be":["Галоўныя члены сказа: дзейнік і выказнік","Гукі і літары: склад і націск","Правапіс літары «Ў» (у нескладовага) і раздзяляльны апостраф","Правапіс галосных пасля шыпячых (Жы-шы, ча-шча)","Парныя звонкія і глухія зычныя ў корані слова","Корань слова і аднакаранёвыя родныя словы","Ненаціскныя галосныя ў корані слова: аканне і яканне","Словы: прадметы, прыкметы і дзеянні (Часціны мовы)","Прыназоўнікі і іх раздзельнае напісанне са словамі","Тэкст: апавяданне і апісанне. Тэма і план"],"world":["Природа и человек. Неживая природа вокруг нас","Свойства воды и круговорот воды в природе","Воздух и его свойства. Значение чистого воздуха","Почва — верхний плодородный слой земли","Органы цветкового растения: корень, стебель, лист","Культурные и дикорастущие растения Беларуси","Насекомые, рыбы, земноводные родного края","Звери и птицы лесов Беларуси","Красная книга Республики Беларусь и заповедники","Организм человека: пять органов чувств"],"en":["Welcome Back! Alphabet & Phonics","My Family (Моя семья)","My Home & Rooms (Мой дом и комнаты)","Furniture & Prepositions of Place","Farm Animals & Pets (Домашние животные)","Yummy Food & Drinks (Еда и напитки)","Numbers 11 to 20 (Числа от 11 до 20)","Clothes for Every Day (Одежда)","Verb to be (Глагол to be: am, is, are)","Have got / Has got (У меня есть...)"]},"3":{"math":["Сотня. Счёт сотнями. Трёхзначные числа до 1000","Сложение и вычитание трёхзначных чисел","Табличное умножение и деление (до 9)","Внетабличное умножение и деление","Деление с остатком и его проверка","Доли: половина, треть, четверть","Площадь прямоугольника и квадрата: S = a · b","Единицы площади: кв. см, кв. дм, кв. м","Задачи на движение: скорость, время, расстояние","Порядок действий и сложные числовые выражения"],"ru":["Текст: тема, основная мысль и план текста","Предложение: главные и второстепенные члены","Состав слова: корень, приставка, суффикс, окончание","Правописание приставок","Разделительные Ъ и Ь / Апостроф в белорусском языке","Имя существительное: род и число","Имя прилагательное: связь с существительным","Личные местоимения","Глагол: времена глаголов (настоящее, прошедшее, будущее)","Правописание НЕ с глаголами. Предлоги и приставки"],"be":["Тэкст: тэма, асноўная думка і план тэксту","Сказ: галоўныя і даданыя члены сказа","Склад слова: корань, прыстаўка, суфікс, канчатак","Правапіс прыставак","Апостраф і мяккі знак у беларускай мове","Імя назоўнік: род і лік","Імя прыметнік: сувязь з назоўнікам","Асабовыя займеннікі","Дзеяслоў: часы дзеяслова (цяперашні, прошлы, будучы)","Правапіс НЕ з дзеясловамі. Прыназоўнікі і прыстаўкі"],"world":["Горизонт. Стороны горизонта и компас","Формы земной поверхности Беларуси: равнины и холмы","Полезные ископаемые Беларуси: торф, соль, глина","Водоёмы Беларуси: великие реки и синие озёра","Лес — природное сообщество: ярусы леса","Луг и болото — природные сообщества родного края","Охрана природы: заповедники и национальные парки","Организм человека: скелет, мышцы и правильная осанка","Органы дыхания и кровообращения (Сердце и лёгкие)","Нервная система: мозг и органы чувств"],"en":["Unit 1: Back to School! School Subjects","Unit 2: Family & Appearance (Внешность)","Unit 3: Daily Routine & Present Simple","Unit 4: Telling the Time (Который час?)","Unit 5: Days of the Week & Hobbies","Unit 6: Animals & Modal Verb CAN / CAN'T","Unit 7: Food & Shopping: Some and Any","Unit 8: Prepositions of Place (Где это?)","Unit 9: Seasons & Weather (Времена года и погода)","Unit 10: Clothes & Seasons (Одежда по сезонам)"]},"4":{"math":["Многозначные числа в пределах 1 000 000: классы и разряды","Единицы величин: тонна, центнер, километр, век","Сложение и вычитание многозначных чисел столбиком","Умножение многозначного числа на двузначное","Деление многозначного числа уголком","Задачи на встречное движение и движение врозь","Площадь фигур. Единицы: ар (сотка) и гектар (га)","Обыкновенные дроби: числитель и знаменатель","Решение уравнений с неизвестными компонентами","Геометрические тела: куб и прямоугольный параллелепипед"],"ru":["Текст и его типы: повествование, описание, рассуждение","Однородные члены предложения и запятая между ними","Три склонения имён существительных. Падежи","Безударные падежные окончания существительных","Склонение имён прилагательных","Местоимения и их склонение с предлогами","Неопределённая форма глагола (Инфинитив)","I и II спряжение глаголов. Личные окончания","Правописание глаголов на -ТСЯ и -ТЬСЯ","Наречие — неизменяемая часть речи"],"be":["Тэкст і яго тыпы: апавяданне, апісанне, разважанне","Аднародныя члены сказа і знакі прыпынку","Тры скланенні назоўнікаў. Склоны","Ненаціскныя склонавыя канчаткі назоўнікаў","Скланенне прыметнікаў","Скланенне займеннікаў і правапіс з прыназоўнікамі","Неазначальная форма дзеяслова (Інфінітыў)","I і II спражэнне дзеясловаў. Асабовыя канчаткі","Правапіс зваротных дзеясловаў на -цца","Прыслоўе — нязменная часціна мовы"],"world":["Мы — белорусы. Государственные символы Республики Беларусь","Древняя Беларусь: Полоцкое и Туровское княжества","Евфросиния Полоцкая и Кирилл Туровский — просветители","Франциск Скорина — знаменитый первопечатник","Великое Княжество Литовское и Грюнвальдская битва (1410 г.)","Знаменитые замки Беларуси: Мир и Несвиж","Беларусь в годы Великой Отечественной войны","Области Беларуси: 6 неповторимых регионов","Город-герой Минск — сердце Беларуси","Современная Беларусь: наука, техника и космос"],"en":["Unit 1: A Day in My Life & Adverbs of Frequency","Unit 2: School Life & Rules (Must / Mustn't)","Unit 3: Where Do You Live? City & Town Places","Unit 4: Degrees of Comparison (Степени сравнения)","Unit 5: Past Simple of Regular Verbs (-ed)","Unit 6: Past Simple of Irregular Verbs (Неправильные глаголы)","Unit 7: Holidays & Future Simple (Will / Won't)","Unit 8: Travelling & Transport (Путешествия)","Unit 9: Nature & Ecology: Should / Shouldn't","Unit 10: Welcome to Belarus! (Достопримечательности Беларуси)"]}};
  const gradeTabs = $$('#gradeTabs [role="tab"]');
  const subjPanel = $('#subjPanel');
  const ruTitle = $('#ruTitle');
  const ruDesc = $('#ruDesc');
  const RU_DESC = {
    1: 'В 1 классе темы идут по Букварю: звуки, буквы, слоги. Читать по слогам помогает тренажёр с микрофоном.',
    2: 'Главные члены предложения, корень слова, безударные гласные и первые части речи.',
    3: 'Состав слова, приставки, род и число существительных, времена глаголов.',
    4: 'Склонения и падежи, спряжение глаголов, однородные члены и типы текста.'
  };
  const MORE = 'Показать все 10 тем';
  const LESS = 'Свернуть';

  function selectGrade(tab, focus) {
    gradeTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    subjPanel.setAttribute('aria-labelledby', tab.id);
    const g = tab.dataset.grade;
    const data = TOPICS[g];
    if (data) {
      $$('.subj__list', subjPanel).forEach((ol) => {
        ol.innerHTML = data[ol.dataset.subj].map((t) => `<li>${esc(t)}</li>`).join('');
        ol.classList.add('is-collapsed');
        const more = ol.nextElementSibling;
        more.setAttribute('aria-expanded', 'false');
        more.textContent = MORE;
        if (!reduced() && ol.animate) {
          ol.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
        }
      });
      if (ruTitle) ruTitle.textContent = g === '1' ? 'Русский язык и грамота' : 'Русский язык';
      if (ruDesc) ruDesc.textContent = RU_DESC[g] || RU_DESC[1];
    }
    if (focus) tab.focus();
  }

  gradeTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectGrade(tab, false));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = gradeTabs[(i + 1) % gradeTabs.length];
      else if (e.key === 'ArrowLeft') next = gradeTabs[(i - 1 + gradeTabs.length) % gradeTabs.length];
      else if (e.key === 'Home') next = gradeTabs[0];
      else if (e.key === 'End') next = gradeTabs[gradeTabs.length - 1];
      if (next) { e.preventDefault(); selectGrade(next, true); }
    });
  });

  $$('.subj__more').forEach((btn) => {
    btn.addEventListener('click', () => {
      const list = document.getElementById(btn.getAttribute('aria-controls'));
      const open = list.classList.toggle('is-collapsed') === false;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? LESS : MORE;
    });
  });
})();
