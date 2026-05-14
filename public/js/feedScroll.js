document.addEventListener('DOMContentLoaded', () => {
  const videos = Array.from(document.querySelectorAll('.post video'));
  if (!videos.length) return;

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: [0.5, 0.75, 0.9]
  };

  let currentPlaying = null;

  const pauseAll = () => videos.forEach(v => {
    try { v.pause(); } catch (e) {}
  });

  const playVideo = (v) => {
    if (!v) return;
    try { v.play().catch(()=>{}); } catch (e) {}
  };

  const observer = new IntersectionObserver((entries) => {
    // Find the entry with largest intersectionRatio that's >= 0.75
    const visible = entries
      .filter(e => e.target.tagName === 'VIDEO')
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (visible.length) {
      const best = visible[0];
      if (best.intersectionRatio >= 0.75) {
        if (currentPlaying && currentPlaying !== best.target) {
          try { currentPlaying.pause(); } catch (e) {}
        }
        currentPlaying = best.target;
        playVideo(currentPlaying);
      } else {
        // If none meet threshold, pause any playing video
        if (currentPlaying) {
          try { currentPlaying.pause(); } catch (e) {}
          currentPlaying = null;
        }
      }
    }
  }, options);

  videos.forEach(v => {
    v.setAttribute('preload', 'metadata');
    v.controls = true; // show native controls so users can pause/unmute/volume/fullscreen
    v.muted = true; // start muted so autoplay works; user can unmute via controls
    observer.observe(v);

    // double-click toggles fullscreen for convenience
    v.addEventListener('dblclick', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      } else {
        if (v.requestFullscreen) v.requestFullscreen().catch(()=>{});
      }
    });
  });

  // Pause videos when page hidden to save resources
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAll();
    else if (currentPlaying) playVideo(currentPlaying);
  });

  // Optional: keyboard controls (space to play/pause current)
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (e.code === 'Space' && !isInput) {
      e.preventDefault();
      if (currentPlaying) {
        if (currentPlaying.paused) playVideo(currentPlaying);
        else currentPlaying.pause();
      }
    }
  });
});
