(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
