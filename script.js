/* Scroll reveal — earthy editorial */
(function(){
  const targets = document.querySelectorAll(
    '.section-head, .challenge-text, .challenge-fragments, .response, ' +
    '.manifesto-row, .path li, .logic, .card, .pillars-list li, ' +
    '.value-grid article, .partner-table, .values-grid > div, .contact-inner'
  );

  targets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting){
        // stagger items within siblings groups
        const idx = Array.from(entry.target.parentElement.children).indexOf(entry.target);
        entry.target.style.transitionDelay = Math.min(idx * 60, 360) + 'ms';
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

  targets.forEach(el => io.observe(el));

  /* ============ HERO TYPEWRITER REVEAL ============ */
  /* Each .word in the hero title carries data-word="..."; we expand into per-letter
     spans so we can stage opacity+blur reveals on a single timer. After the last
     letter resolves we toggle .is-loaded on .hero, which crossfades the background
     image from blurry → sharp and fades in the surrounding chrome. */
  const hero = document.querySelector('.hero[data-hero]');
  if (hero){
    const title = hero.querySelector('.hero-title');
    const words = title ? title.querySelectorAll('.word') : [];
    const letters = [];

    words.forEach((word, wi) => {
      const host  = word.querySelector('em') || word;
      const text  = host.getAttribute('data-word') || host.textContent || '';
      host.textContent = '';
      [...text].forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'letter';
        // preserve spaces so the layout stays correct
        span.innerHTML = ch === ' ' ? '&nbsp;' : ch;
        host.appendChild(span);
        letters.push(span);
      });
    });

    const PER_LETTER = 55;   // ms between letters
    const HOLD       = 180;  // ms hold after last letter
    let i = 0;

    function nextLetter(){
      if (i >= letters.length){
        // typing done — reveal surrounding chrome + clear bg blur
        setTimeout(() => {
          hero.classList.add('is-loaded');
        }, HOLD);
        return;
      }
      letters[i].classList.add('is-on');
      i++;
      setTimeout(nextLetter, PER_LETTER);
    }

    // start once paint settles
    requestAnimationFrame(() => {
      requestAnimationFrame(nextLetter);
    });

    // respect reduced motion: just reveal everything
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      letters.forEach(l => l.classList.add('is-on'));
      hero.classList.add('is-loaded');
    }
  }

  /* ============ MANIFESTO CYCLER ============ */
  const stage = document.querySelector('.m-stage');
  if (stage){
    const slides = stage.querySelectorAll('.m-slide');
    const tabs   = stage.querySelectorAll('.m-tab');
    const bar    = stage.querySelector('.m-tab-progress-bar');
    const CYCLE  = 5000;
    let active   = 0;
    let timer    = null;
    let progressRAF = null;
    let progressStart = 0;

    function setActive(i){
      active = (i + slides.length) % slides.length;
      slides.forEach((s, idx) => {
        const on = idx === active;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      tabs.forEach((t, idx) => {
        t.classList.toggle('is-active', idx === active);
      });
    }

    function runProgress(){
      if (!bar) return;
      cancelAnimationFrame(progressRAF);
      progressStart = performance.now();
      bar.style.inset = '0 100% 0 0';
      const tick = (now) => {
        const elapsed = now - progressStart;
        const pct = Math.min(elapsed / CYCLE, 1);
        bar.style.inset = `0 ${(1 - pct) * 100}% 0 0`;
        if (pct < 1) progressRAF = requestAnimationFrame(tick);
      };
      progressRAF = requestAnimationFrame(tick);
    }

    function startTimer(){
      clearInterval(timer);
      runProgress();
      timer = setInterval(() => {
        setActive(active + 1);
        runProgress();
      }, CYCLE);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        if (i === active) return;
        setActive(i);
        startTimer();
      });
    });

    /* Pause cycling when stage is offscreen */
    const stageIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          startTimer();
        } else {
          clearInterval(timer);
          cancelAnimationFrame(progressRAF);
        }
      });
    }, { threshold: 0.25 });
    stageIO.observe(stage);
  }
})();


/* ============================================================
   NAVBAR · "The Hub" dropdown
   ============================================================ */
(function initNavDrop(){
  const drops = document.querySelectorAll('[data-nav-drop]');
  if(!drops.length) return;

  function closeAll(except){
    drops.forEach(d => {
      if(d === except) return;
      d.classList.remove('is-open');
      const t = d.querySelector('.nav-drop-trigger');
      if(t) t.setAttribute('aria-expanded', 'false');
    });
  }

  drops.forEach(drop => {
    const trigger = drop.querySelector('.nav-drop-trigger');
    if(!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = drop.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(open) closeAll(drop);
    });

    // Close after choosing an item
    drop.querySelectorAll('.nav-drop-menu a').forEach(a => {
      a.addEventListener('click', () => {
        drop.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  });

  // Outside-click closes
  document.addEventListener('click', (e) => {
    if(!e.target.closest('[data-nav-drop]')) closeAll(null);
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeAll(null);
  });
})();

/* ============================================================
   HOMEPAGE · Projects carousel
   ============================================================ */
(function initProjCarousel(){
  const stage = document.querySelector('.pc-stage');
  if(!stage) return;
  const track = stage.querySelector('.pc-track');
  const prev  = stage.querySelector('.pc-prev');
  const next  = stage.querySelector('.pc-next');
  const dots  = document.querySelectorAll('.pc-dots .pc-dot');
  if(!track) return;

  function cardStep(){
    const card = track.querySelector('.pc-card');
    if(!card) return 360;
    const gap = parseFloat(getComputedStyle(track).columnGap || 24);
    return card.getBoundingClientRect().width + gap;
  }

  prev && prev.addEventListener('click', () => {
    track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
  });
  next && next.addEventListener('click', () => {
    track.scrollBy({ left:  cardStep(), behavior: 'smooth' });
  });

  // Dots → scroll to that card
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      track.scrollTo({ left: i * cardStep(), behavior: 'smooth' });
    });
  });

  // Sync dot active state while scrolling
  let raf = null;
  track.addEventListener('scroll', () => {
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const idx = Math.round(track.scrollLeft / cardStep());
      dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    });
  });
})();


/* ============================================================
   MOBILE MENU — hamburger ↔ slide-down panel
   ============================================================ */
(function initMobileMenu(){
  const burger = document.querySelector('[data-nav-burger]');
  const panel  = document.querySelector('[data-mobile-menu]');
  if(!burger || !panel) return;

  const closeBtn  = panel.querySelector('[data-mm-close]');
  const groupBtn  = panel.querySelector('[data-mm-group-trigger]');

  function open(){
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
  }
  function close(){
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
    // collapse the Hub dropdown when closing the panel
    if(groupBtn) groupBtn.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', (e) => {
    e.preventDefault();
    const open_ = burger.getAttribute('aria-expanded') === 'true';
    if(open_) close(); else open();
  });

  // X close button inside the panel
  if(closeBtn){
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
  }

  // The Hub collapsible dropdown
  if(groupBtn){
    groupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = groupBtn.getAttribute('aria-expanded') === 'true';
      groupBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  }

  // Close when any link inside the panel is tapped (but not the group trigger button)
  panel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => close());
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });

  // Close when the viewport grows past the mobile breakpoint
  const mq = window.matchMedia('(min-width: 901px)');
  const onChange = () => { if(mq.matches) close(); };
  if(mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
})();

/* ============================================================
   TESTIMONIALS CAROUSEL
   ============================================================ */
(function initTestiCarousel(){
  const stage = document.querySelector('[data-testi-stage]');
  if(!stage) return;
  const track = stage.querySelector('[data-testi-track]');
  const prev  = stage.querySelector('.tc-prev');
  const next  = stage.querySelector('.tc-next');
  const dots  = document.querySelectorAll('[data-testi-dots] .tc-dot');
  if(!track) return;

  const cards = () => track.querySelectorAll('.testi');
  const count = () => cards().length;

  function step(){
    const card = track.querySelector('.testi');
    if(!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || 24);
    return card.getBoundingClientRect().width + gap;
  }

  function currentIndex(){
    return Math.round(track.scrollLeft / step());
  }

  function goTo(idx, behavior){
    const total = count();
    if(total === 0) return;
    // wrap around
    const wrapped = ((idx % total) + total) % total;
    track.scrollTo({ left: wrapped * step(), behavior: behavior || 'smooth' });
  }

  prev && prev.addEventListener('click', () => {
    pauseAutoplay();
    goTo(currentIndex() - 1);
  });
  next && next.addEventListener('click', () => {
    pauseAutoplay();
    goTo(currentIndex() + 1);
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      pauseAutoplay();
      goTo(i);
    });
  });

  // Sync the active dot on scroll
  let raf = null;
  track.addEventListener('scroll', () => {
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const idx = currentIndex();
      dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    });
  });

  /* ---------- AUTOPLAY — advance every 8s, wrap to start ---------- */
  const AUTOPLAY_MS = 8000;
  const RESUME_MS   = 12000; // wait this long after user interaction before resuming
  let autoplayId = null;
  let resumeId   = null;

  function tick(){
    goTo(currentIndex() + 1);
  }
  function startAutoplay(){
    stopAutoplay();
    if(count() < 2) return;
    autoplayId = setInterval(tick, AUTOPLAY_MS);
  }
  function stopAutoplay(){
    if(autoplayId){ clearInterval(autoplayId); autoplayId = null; }
  }
  function pauseAutoplay(){
    stopAutoplay();
    if(resumeId) clearTimeout(resumeId);
    resumeId = setTimeout(startAutoplay, RESUME_MS);
  }

  // Pause on hover (desktop) and on touch (mobile)
  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', startAutoplay);
  stage.addEventListener('touchstart', pauseAutoplay, { passive: true });

  // Pause when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) stopAutoplay();
    else startAutoplay();
  });

  // Respect reduced motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!reduced.matches){
    startAutoplay();
  }
})();

/* Founders section: stacked vertical on mobile, side-by-side on desktop.
   No JS — pure CSS responsive grid. */
