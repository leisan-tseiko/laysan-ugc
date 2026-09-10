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
  const clips = ['videos/0819.mp4'];
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

  document.querySelectorAll('.portfolio-card .card-video-wrap').forEach((wrap) => {
    const video = wrap.querySelector('video');
    const btn = wrap.querySelector('.play-btn');
    const scrub = wrap.querySelector('.video-scrub');
    const scrubFill = wrap.querySelector('.video-scrub-fill');
    if (!video || !btn) return;

    function play() {
      document.querySelectorAll('.card-video-wrap.is-playing').forEach((other) => {
        if (other !== wrap) {
          other.classList.remove('is-playing');
          other.querySelector('video')?.pause();
        }
      });
      video.muted = false;
      video.play();
      wrap.classList.add('is-playing');
      if (isMobile()) enterFullscreen(video);
    }

    btn.addEventListener('click', () => {
      if (video.paused) {
        play();
      } else {
        video.pause();
        wrap.classList.remove('is-playing');
      }
    });

    video.addEventListener('pause', () => wrap.classList.remove('is-playing'));
    video.addEventListener('webkitendfullscreen', () => video.pause());

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
        if (video.paused) play();
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
})();
