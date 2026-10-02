(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile nav toggle ---------- */
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-nav');

  if (header && navToggle && siteNav) {
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    navToggle.addEventListener('click', () => {
      setOpen(!header.classList.contains('nav-open'));
    });
    siteNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) setOpen(false);
    });
    window.matchMedia('(min-width: 721px)').addEventListener('change', (mq) => {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- viewfinder: cycle sources + live timecode ---------- */
  const vf = document.querySelector('.viewfinder-video');
  const timecode = document.querySelector('.timecode');
  const clips = ['videos/hero-loop.mp4'];
  let clipIndex = 0;

  function fmt(t) {
    const h = String(Math.floor(t / 3600)).padStart(2, '0');
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  if (vf && timecode) {
    vf.addEventListener('timeupdate', () => { timecode.textContent = fmt(vf.currentTime); });

    if (!reduceMotion) {
      vf.addEventListener('ended', () => {
        clipIndex = (clipIndex + 1) % clips.length;
        vf.querySelector('source').src = clips[clipIndex];
        vf.load();
        vf.play().catch(() => {});
      });
    }
  }

  /* ---------- portfolio card play/pause ---------- */
  const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

  function enterFullscreen(video) {
    if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  }

  /* ---------- focused card: the clip being watched lifts over a dimmed page ---------- */
  const cardVideos = () => document.querySelectorAll('.portfolio-card .card-video');
  const visibleCards = new Set();
  let focusedCard = null;

  const backdrop = document.createElement('div');
  backdrop.className = 'card-backdrop';
  backdrop.innerHTML = '<button class="card-backdrop-close" type="button" aria-label="Close video">'
    + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  document.body.appendChild(backdrop);

  function startPreview(v) {
    v.muted = true;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  function focusCard(card) {
    if (focusedCard && focusedCard !== card) focusedCard.classList.remove('is-focused');
    focusedCard = card;
    // grow by up to a quarter, but never past 90% of the screen height
    const phone = card.querySelector('.phone-mockup');
    const lift = Math.max(1, Math.min(1.25, (window.innerHeight * 0.9) / phone.offsetHeight));
    card.style.setProperty('--lift', lift.toFixed(3));
    card.classList.add('is-focused');
    backdrop.classList.add('is-on');
    cardVideos().forEach((v) => { if (!card.contains(v)) v.pause(); });
    phone.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function unfocusCard() {
    if (!focusedCard) return;
    const card = focusedCard;
    focusedCard = null;
    card.classList.remove('is-focused');
    backdrop.classList.remove('is-on');
    if (reduceMotion) {
      card.querySelector('.card-video').pause();
      return;
    }
    // everything on screen, the closed clip included, goes back to its muted preview
    cardVideos().forEach((v) => { if (visibleCards.has(v)) startPreview(v); else v.pause(); });
  }

  backdrop.addEventListener('click', unfocusCard);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') unfocusCard();
  });

  document.querySelectorAll('.portfolio-card .card-video-wrap').forEach((wrap) => {
    const video = wrap.querySelector('video');
    const btn = wrap.querySelector('.play-btn');
    const scrub = wrap.querySelector('.video-scrub');
    const scrubFill = wrap.querySelector('.video-scrub-fill');
    if (!video || !btn) return;

    function play(fromStart = true) {
      document.querySelectorAll('.card-video-wrap.is-playing').forEach((other) => {
        if (other !== wrap) {
          other.classList.remove('is-playing');
          other.querySelector('video')?.pause();
        }
      });
      // leaving the muted preview: start the clip over so the viewer sees the hook.
      // Pause before the seek, or the preview's old position is heard for a moment
      // once the sound is on, and the audio jumps back to the start.
      if (video.muted) {
        video.pause();
        if (fromStart) video.currentTime = 0;
      }
      video.muted = false;
      video.play();
      wrap.classList.add('is-playing');
      if (isMobile()) enterFullscreen(video);
      else focusCard(wrap.closest('.portfolio-card'));
    }

    btn.addEventListener('click', () => {
      // a muted preview counts as not playing yet: the click starts it with sound
      if (video.paused || video.muted) {
        play();
      } else {
        video.pause();
        wrap.classList.remove('is-playing');
      }
    });

    video.addEventListener('pause', () => wrap.classList.remove('is-playing'));
    video.addEventListener('webkitendfullscreen', () => video.pause());
    video.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) video.pause();
    });

    if (scrub && scrubFill) {
      video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        scrubFill.style.width = pct + '%';
        scrub.setAttribute('aria-valuenow', String(Math.round(pct)));
      });

      scrub.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = scrub.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        if (video.duration) video.currentTime = ratio * video.duration;
        if (video.paused || video.muted) play(false);
      });
    }
  });

  /* ---------- photo card crossfade ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('.card-photo-wrap').forEach((wrap) => {
      const photos = wrap.querySelectorAll('.card-photo');
      if (photos.length < 2) return;
      let i = 0;
      setInterval(() => {
        photos[i].classList.remove('is-active');
        i = (i + 1) % photos.length;
        photos[i].classList.add('is-active');
      }, 3200);
    });
  }

  /* ---------- pause offscreen video to save resources ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (!v.hasAttribute('data-autoplay')) return;
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.viewfinder-video, .about-video').forEach((v) => {
    v.setAttribute('data-autoplay', '');
    io.observe(v);
  });

  /* ---------- portfolio cards: muted preview only while on screen ---------- */
  // each card restarts from the first frame when it scrolls in, so nobody
  // lands mid-clip; a card the viewer is listening to is paused, not reset
  const cardIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (entry.isIntersecting) {
        visibleCards.add(v);
        // while a card is focused the rest of the row stays still
        if (reduceMotion || focusedCard || !v.paused) return;
        startPreview(v);
      } else {
        visibleCards.delete(v);
        if (focusedCard && focusedCard.contains(v)) unfocusCard();
        // only previews stop on scroll: the phone's fullscreen player can report
        // the clip being watched as off screen, and it must keep playing
        else if (v.muted) v.pause();
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.portfolio-card .card-video').forEach((v) => cardIo.observe(v));
})();
