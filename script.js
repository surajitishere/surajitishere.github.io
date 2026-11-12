// Surajit Mondal, v6. Vanilla JS; the page is complete without it.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => n.toLocaleString('en-US');
  const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* ---------- light and dark ---------- */
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (t) => {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#0b132b' : '#f7f5ef');
    if (toggle) toggle.setAttribute('aria-pressed', String(t === 'dark'));
  };
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode: the choice lasts this visit */ }
      if (reduce || !document.startViewTransition) { applyTheme(next); return; }
      const box = toggle.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => applyTheme(next));
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    });
  }

  // with no saved choice, follow the system when it changes
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
      if (saved !== 'light' && saved !== 'dark') applyTheme(e.matches ? 'light' : 'dark');
    });
  }

  /* ---------- the sky: the 1,000-genome tree ---------- */
  const sky = document.getElementById('sky');
  if (sky) {
    const stage = sky.querySelector('.sky-stage');
    const turn = sky.querySelector('.sky-turn');
    const tree = sky.querySelector('.sky-tree');
    const num = sky.querySelector('.sky-n');
    const unit = sky.querySelector('.sky-u');
    const name = sky.querySelector('.sky-name');
    const status = document.getElementById('branch-status');
    const labs = [...sky.querySelectorAll('.lab')];
    const chips = [...document.querySelectorAll('.phy')];
    const doms = [...document.querySelectorAll('.dom')];
    const phyla = labs.map((l) => ({
      k: +l.dataset.k, n: +l.dataset.n, name: l.dataset.name, note: l.dataset.note,
      dom: l.dataset.dom, hue: l.dataset.hue, a0: +l.dataset.a0, a1: +l.dataset.a1,
    }));
    const DOMAINS = { a: { n: 200, name: 'Archaea' }, b: { n: 800, name: 'Bacteria' } };

    // the glow: a blurred copy of the branches underneath, without the names
    const glow = tree.cloneNode(true);
    glow.classList.remove('sky-tree');
    glow.classList.add('sky-glow');
    glow.removeAttribute('role');
    glow.removeAttribute('aria-labelledby');
    glow.setAttribute('aria-hidden', 'true');
    glow.querySelector('.labels').remove();
    glow.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    turn.insertBefore(glow, tree);

    const clades = [...sky.querySelectorAll('.clade')];
    tree.querySelectorAll('.clade').forEach((g) => g.style.setProperty('--i', g.dataset.k || 0));

    // on a phone the rim names go and the tree fills the frame
    const small = window.matchMedia('(max-width: 640px)');
    let span = 1200;
    const frame = () => {
      span = small.matches ? 820 : 1200;
      const vb = `${-span / 2} ${-span / 2} ${span} ${span}`;
      tree.setAttribute('viewBox', vb);
      glow.setAttribute('viewBox', vb);
    };
    frame();
    small.addEventListener('change', frame);

    // a selection is a phylum ("k7") or a domain ("da", "db"); "" is the whole tree
    let pinned = '';
    let preview = '';
    let shown = null;
    let counting = false;

    const pick = (key) => {
      if (!key) return null;
      if (key[0] === 'k') {
        const p = phyla.find((x) => x.k === +key.slice(1));
        return { n: p.n, name: p.name, note: p.note, colour: `var(--k${p.hue})`,
          has: (el) => +el.dataset.k === p.k, said: `${p.name}, ${p.n} genomes${p.note ? ` (${p.note})` : ''}` };
      }
      const d = DOMAINS[key[1]];
      return { n: d.n, name: d.name, note: '', colour: '',
        has: (el) => el.dataset.dom === key[1], said: `${d.name}, ${d.n} genomes` };
    };

    const setReadout = (n, colour, part) => {
      num.style.setProperty('--readout', colour || '');
      name.style.setProperty('--readout', colour || '');
      unit.classList.toggle('is-part', part);
      if (shown === n) return;
      shown = n;
      counting = false;
      num.textContent = fmt(n);
      if (!reduce) {
        num.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: easeOut });
      }
    };

    const render = () => {
      const key = preview || pinned;
      const sel = pick(key);
      if (sel) sky.dataset.active = key;
      else delete sky.dataset.active;
      clades.forEach((g) => g.classList.toggle('on', !!sel && sel.has(g)));
      labs.forEach((l) => {
        l.classList.toggle('on', !!sel && sel.has(l));
        l.setAttribute('aria-pressed', String(pinned === `k${l.dataset.k}`));
      });
      chips.forEach((c) => {
        c.classList.toggle('is-on', key === `k${c.dataset.k}`);
        c.setAttribute('aria-pressed', String(pinned === `k${c.dataset.k}`));
      });
      doms.forEach((b) => {
        b.classList.toggle('is-on', key === `d${b.dataset.dom}`);
        b.setAttribute('aria-pressed', String(pinned === `d${b.dataset.dom}`));
      });
      if (sel) {
        setReadout(sel.n, sel.colour, true);
        name.textContent = sel.name;
        if (sel.note) {
          const note = document.createElement('small');
          note.textContent = sel.note;
          name.append(note);
        }
      } else {
        name.textContent = '';
        if (!counting) setReadout(1000, '', false);
      }
      sky.classList.toggle('is-held', !!sel || stage.matches(':hover'));
    };

    const announce = () => {
      const sel = pick(pinned);
      status.textContent = sel ? sel.said : 'All 1,000 genomes';
    };

    const choose = (key) => {
      pinned = pinned === key ? '' : key;
      render();
      announce();
    };

    const rotation = () => {
      const t = getComputedStyle(turn).transform;
      if (!t || t === 'none') return 0;
      const m = new DOMMatrixReadOnly(t);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    };

    // which phylum lies under the pointer: by angle around the root, so a whole wedge and its name answer
    const hit = (e) => {
      const box = stage.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      const r = Math.hypot(dx, dy) / (box.width / span);
      if (r < 110 || r > (small.matches ? 400 : 600)) return '';
      let a = (Math.atan2(dy, dx) * 180) / Math.PI - rotation();
      while (a < -90) a += 360;
      while (a >= 270) a -= 360;
      let best = '';
      let bestD = 1.5;
      phyla.forEach((x) => {
        const d = a < x.a0 ? x.a0 - a : a > x.a1 ? a - x.a1 : 0;
        if (d < bestD) { bestD = d; best = `k${x.k}`; }
      });
      return best;
    };

    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const key = hit(e);
      stage.style.cursor = key ? 'pointer' : '';
      if (key !== preview) { preview = key; render(); }
    });
    stage.addEventListener('pointerenter', () => sky.classList.add('is-held'));
    stage.addEventListener('pointerleave', () => { preview = ''; render(); });
    stage.addEventListener('click', (e) => {
      const key = hit(e);
      pinned = key && pinned !== key ? key : '';
      preview = e.pointerType === 'mouse' ? key : '';
      render();
      announce();
    });

    // the names are a row of buttons for the keyboard: Tab reaches one, arrows walk the rim
    labs.forEach((l, i) => {
      const key = `k${l.dataset.k}`;
      l.addEventListener('focus', () => {
        labs.forEach((x) => x.setAttribute('tabindex', x === l ? '0' : '-1'));
        preview = key;
        render();
      });
      l.addEventListener('blur', () => { preview = ''; render(); });
      l.addEventListener('keydown', (e) => {
        let j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % labs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + labs.length - 1) % labs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = labs.length - 1;
        if (j >= 0) { e.preventDefault(); labs[j].focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(key); }
      });
    });

    const wire = (els, keyOf) => els.forEach((b, i) => {
      const key = keyOf(b);
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { preview = key; render(); } });
      b.addEventListener('pointerleave', () => { preview = ''; render(); });
      b.addEventListener('focus', () => { preview = key; render(); });
      b.addEventListener('blur', () => { preview = ''; render(); });
      b.addEventListener('click', () => choose(key));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); els[(i + 1) % els.length].focus(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); els[(i + els.length - 1) % els.length].focus(); }
      });
    });
    wire(chips, (b) => `k${b.dataset.k}`);
    wire(doms, (b) => `d${b.dataset.dom}`);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (pinned || preview)) { pinned = ''; preview = ''; render(); announce(); }
    });

    // the count rises once with the tree
    if (!reduce) {
      counting = true;
      shown = 1000;
      const t0 = performance.now() + 250;
      const dur = 1500;
      const step = (now) => {
        if (!counting) return;
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        const v = Math.round(1000 * (1 - Math.pow(1 - p, 3)));
        num.textContent = fmt(v);
        if (p < 1) requestAnimationFrame(step);
        else counting = false;
      };
      num.textContent = '0';
      requestAnimationFrame(step);
    }
  }

  /* ---------- entrances ---------- */
  const revealables = [...document.querySelectorAll('[data-reveal], [data-develop]')];
  const groupsOf = new Map();
  revealables.forEach((el) => {
    const host = el.closest('article, .tool-rows, .about-side, section') || document.body;
    const i = groupsOf.get(host) || 0;
    groupsOf.set(host, i + 1);
    el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`);
  });
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------- hyperspectral schematic: point along it to pick a waveband ---------- */
  const hs = document.getElementById('hs');
  if (hs) {
    const STOPS = [[400, '#8a6dff'], [440, '#5a6cff'], [475, '#3f9dff'], [500, '#2fd2e0'], [525, '#3fe0a0'],
      [550, '#8fe36a'], [575, '#e6e04a'], [595, '#ffc93f'], [620, '#ff9a3d'], [650, '#ff6a4d'],
      [690, '#f0465a'], [730, '#b8395e'], [800, '#7a3d66'], [900, '#5b4670'], [1000, '#4c4a6e']];
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const colour = (w) => {
      for (let i = 0; i < STOPS.length - 1; i++) {
        const [w0, c0] = STOPS[i];
        const [w1, c1] = STOPS[i + 1];
        if (w >= w0 && w <= w1) {
          const t = (w - w0) / (w1 - w0);
          const a = rgb(c0);
          const b = rgb(c1);
          return `rgb(${a.map((x, j) => Math.round(x + (b[j] - x) * t)).join(',')})`;
        }
      }
      return STOPS[STOPS.length - 1][1];
    };
    const svg = hs.querySelector('.hs');
    const cursor = svg.querySelector('.hs-cursor');
    const label = svg.querySelector('.hs-lambda');
    const x0 = +cursor.dataset.x0;
    const x1 = +cursor.dataset.x1;
    let nm = null;
    const set = (lam) => {
      const band = Math.min(1000, Math.round(lam / 5) * 5);
      cursor.setAttribute('transform', `translate(${(((lam - 400) / 600) * (x1 - x0)).toFixed(1)} 0)`);
      if (nm === band) return;
      nm = band;
      label.textContent = `${band} nm`;
      svg.style.setProperty('--scan', colour(lam));
    };
    const at = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return Math.min(1000, Math.max(400, 400 + ((p.x - x0) / (x1 - x0)) * 600));
    };
    const follow = (e) => {
      if (e.pointerType !== 'mouse' && !e.buttons) return;
      const lam = at(e);
      if (lam !== null) set(lam);
    };
    set(680);
    svg.addEventListener('pointerdown', (e) => { const lam = at(e); if (lam !== null) set(lam); });
    svg.addEventListener('pointermove', follow);
  }

  /* ---------- local time in Thiruvananthapuram ---------- */
  const clock = document.querySelector('[data-clock]');
  if (clock && window.Intl) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { clock.textContent = `Local time ${f.format(new Date())} (IST, UTC+5:30)`; };
    tick();
    setInterval(tick, 20000);
  }

  /* ---------- copy the email address ---------- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('.copy-label');
    const rest = label.innerHTML;
    btn.addEventListener('click', async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        ok = true;
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = btn.dataset.copy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        ta.remove();
      }
      label.textContent = ok ? 'Copied' : 'Press Ctrl+C to copy';
      btn.classList.toggle('done', ok);
      clearTimeout(btn.t);
      btn.t = setTimeout(() => { label.innerHTML = rest; btn.classList.remove('done'); }, 2200);
    });
  });
})();
