/* Rinaldi Delcourt : interactions (vanilla JS, aucune dépendance) */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro du hero ---------- */
  function intro() {
    $$('[data-intro]').forEach((el, i) => { el.style.transitionDelay = `${0.1 + i * 0.1}s`; });
    const go = () => requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
    const img = $('.hero-media img');
    if (reduce || !img || img.complete) return go();
    img.addEventListener('load', go, { once: true });
    img.addEventListener('error', go, { once: true });
    setTimeout(go, 1000);
  }

  /* ---------- En-tête : fond blanc au défilement, lien actif ---------- */
  function header() {
    const el = $('[data-header]');
    const hero = $('.hero');
    const update = () => el.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 90);
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);

    const links = $$('.nav-list a');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.hash === `#${e.target.id}`));
    }), { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(a => { const s = $(a.hash); if (s) io.observe(s); });
  }

  /* ---------- Menu mobile ---------- */
  function menu() {
    const btn = $('[data-burger]');
    const nav = $('#nav');
    const head = $('[data-header]');
    const label = $('.sr-only', btn);
    const set = open => {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      head.classList.toggle('menu-open', open);
      document.body.classList.toggle('locked', open);
      label.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', nav).forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); } });
    matchMedia('(min-width: 1025px)').addEventListener('change', e => e.matches && set(false));
  }

  /* ---------- Expertises : accordéon (un seul ouvert à la fois) ---------- */
  function accordion() {
    const items = $$('[data-accordion] .exp');
    items.forEach(item => {
      const btn = $('.exp-btn', item);
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        items.forEach(other => {
          const b = $('.exp-btn', other);
          const on = other === item && open;
          b.setAttribute('aria-expanded', String(on));
          other.classList.toggle('is-open', on);
        });
      });
    });
    // Premier domaine ouvert par défaut pour montrer l'interaction
    if (items[0]) { items[0].classList.add('is-open'); $('.exp-btn', items[0]).setAttribute('aria-expanded', 'true'); }
  }

  /* ---------- Équipe : filtres par domaine ---------- */
  function teamFilter() {
    const chips = $$('[data-filter]');
    const people = $$('[data-team] .person');
    const status = $('[data-filter-status]');
    chips.forEach(chip => chip.addEventListener('click', () => {
      const key = chip.dataset.filter;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      let shown = 0;
      people.forEach(p => {
        const match = key === 'all' || p.dataset.area.split(' ').includes(key);
        if (match) shown++;
        if (match && p.classList.contains('is-hidden')) {
          p.classList.remove('is-hidden');
          p.classList.add('is-entering');
          requestAnimationFrame(() => requestAnimationFrame(() => p.classList.remove('is-entering')));
        } else if (!match) {
          p.classList.add('is-hidden');
        }
      });
      status.textContent = `${shown} avocat${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''}.`;
    }));
  }

  /* ---------- Chiffres : comptage unique à l'apparition ---------- */
  function counters() {
    if (reduce) return;
    const els = $$('[data-count]');
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const el = entry.target;
      const end = parseFloat(el.dataset.count);
      const dec = Number(el.dataset.decimals || 0);
      const suffix = el.dataset.suffix || '';
      const final = el.innerHTML;
      const t0 = performance.now();
      const step = now => {
        const p = Math.min((now - t0) / 1500, 1);
        const v = end * (1 - Math.pow(1 - p, 4));
        el.innerHTML = v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        if (p < 1) requestAnimationFrame(step); else el.innerHTML = final;
      };
      requestAnimationFrame(step);
    }), { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Validation de formulaires (réutilisable) ---------- */
  const rules = {
    area: v => !!v || 'Sélectionnez un domaine.',
    phone: v => /^[+\d][\d\s.()-]{8,}$/.test(v.trim()) || 'Indiquez un numéro de téléphone complet.',
    first: v => v.trim().length > 1 || 'Indiquez votre prénom.',
    last: v => v.trim().length > 1 || 'Indiquez votre nom.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Indiquez une adresse e-mail valide, par exemple nom@societe.fr.',
    message: v => v.trim().length >= 20 || 'Décrivez votre demande en quelques phrases (20 caractères minimum).',
    consent: (_, el) => el.checked || 'Votre accord est nécessaire pour traiter la demande.'
  };

  function validate(form, { onSuccess, statusEl }) {
    const fields = () => $$('input, select, textarea', form).filter(el => el.name in rules && el.required);
    const check = el => {
      const res = rules[el.name](el.value, el);
      const ok = res === true;
      el.setAttribute('aria-invalid', String(!ok));
      const err = document.getElementById(`${el.id}-err`);
      if (err) err.textContent = ok ? '' : res;
      return ok;
    };
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
    form.addEventListener('change', e => { if (e.target.name in rules && e.target.required) check(e.target); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = fields().filter(el => !check(el));
      if (statusEl) { statusEl.textContent = ''; statusEl.classList.remove('is-error'); }
      if (bad.length) {
        bad[0].focus();
        if (statusEl && bad.length > 1) { statusEl.classList.add('is-error'); statusEl.textContent = `${bad.length} champs sont à corriger.`; }
        return;
      }
      const btn = $('button[type="submit"]', form);
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Envoi en cours';
      // Démonstration : remplacer par un appel fetch() vers le service d'envoi réel.
      setTimeout(() => {
        form.reset();
        fields().forEach(el => el.removeAttribute('aria-invalid'));
        btn.disabled = false; btn.textContent = label;
        onSuccess();
      }, 900);
    });
  }

  function forms() {
    const cb = $('#callback');
    const cbStatus = $('.cb-status', cb);
    validate(cb, { onSuccess: () => { cbStatus.textContent = 'Demande enregistrée. Un avocat vous rappelle sous 24 heures ouvrées.'; } });

    const contact = $('#contact-form');
    const st = $('.form-status', contact);
    validate(contact, { statusEl: st, onSuccess: () => { st.textContent = 'Demande envoyée. Vous recevrez une réponse sous 24 heures ouvrées.'; } });
  }

  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  intro(); header(); menu(); accordion(); teamFilter(); counters(); forms();
})();
