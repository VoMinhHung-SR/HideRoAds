// ============================================================
// 🛡️ ROPHIM ADBLOCK - OPTIMIZED VERSION
// ============================================================
(() => {
  'use strict';

  const isGoat = /goatembed\./i.test(location.hostname);
  const isRophim = /rophim\./i.test(location.hostname);
  if (!isGoat && !isRophim) return;

  const log = msg => console.log(`✅ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
  const warn = msg => console.warn(`⚠️ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);

  // ============================================================
  // 🍪 COOKIE PROTECTION
  // ============================================================
  const COOKIE_CONFIG = { path: '/', maxAge: 31536000, sameSite: 'Lax' };
  const ANTI_AD_COOKIES = {
    '_allow_popunder': '0', '_popunder_opened_v0.1': '0', '_n_rb_show': '1',
    '_popup_blocked': '1', '_ad_blocked': '1'
  };

  const setCookie = (name, value, options = {}) => {
    const opts = { ...COOKIE_CONFIG, ...options };
    document.cookie = `${name}=${value}; path=${opts.path}; max-age=${opts.maxAge}; SameSite=${opts.sameSite}`;
  };

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
    return match ? match[2] : null;
  };

  const protectCookies = () => {
    Object.entries(ANTI_AD_COOKIES).forEach(([name, value]) => {
      if (getCookie(name) !== value) setCookie(name, value);
    });
  };

  protectCookies();
  setInterval(protectCookies, 2000);
  log('🍪 Cookie protection active');

  // ============================================================
  // 🔥 JW PLAYER HOOK
  // ============================================================
  let jwOrig = null, playerInstance = null, adSkipped = false, skipInProgress = false;
  
  Object.defineProperty(window, 'jwplayer', {
    get: () => jwOrig,
    set(val) {
      if (!val || jwOrig) return;
      
      jwOrig = function(id) {
        const p = val(id);
        if (!p) return p;
        
        playerInstance = p;
        const origSetup = p.setup;
        
        p.setup = function(cfg) {
          if (cfg) {
            ['advertising', 'preload', 'vastPlugin', 'ima', 'googima', 'freewheel'].forEach(key => delete cfg[key]);
            cfg.autostart = true;
            cfg.mute = false;
            
            if (cfg.playlist) {
              cfg.playlist = cfg.playlist.map(i => {
                ['adschedule', 'advertising', 'preroll', 'vmap', 'vastxml'].forEach(key => delete i[key]);
                return i;
              });
            }
          }
          
          const res = origSetup.call(this, cfg);
          
          // Override ad methods
          this.playAd = () => { warn('❌ playAd blocked'); this.play(); return this; };
          this.pauseAd = () => this;
          this.skipAd = () => { this.play(); return this; };
          
          // Force skip method
          this.forceSkip = () => {
            try {
              const pos = this.getPosition(), dur = this.getDuration();
              const playlist = this.getPlaylist(), currentIndex = this.getPlaylistIndex();
              
              if (playlist && playlist.length > currentIndex + 1) {
                this.playlistItem(currentIndex + 1);
                return true;
              }
              
              if (dur > 0) {
                this.seek(Math.min(dur - 0.5, 15));
                return true;
              }
              
              this.play();
              this.setMute(false);
              return true;
            } catch(e) {
              return false;
            }
          };
          
          // Ultra fast skip
          const ultraFastSkip = () => {
            if (skipInProgress) return;
            
            try {
              const pos = this.getPosition(), dur = this.getDuration(), state = this.getState();
              const isAd = (dur < 60 && dur > 0) || (pos < 3 && dur < 30) || 
                          (dur < 45 && pos < 5) || (state === 'paused' && pos < 10);
              
              if (isAd && !adSkipped) {
                skipInProgress = true;
                const playlist = this.getPlaylist(), currentIndex = this.getPlaylistIndex();
                
                if (playlist && playlist.length > currentIndex + 1) {
                  this.playlistItem(currentIndex + 1);
                } else if (dur > 0) {
                  this.seek(Math.min(dur - 0.1, 15));
                } else {
                  this.play();
                  this.setMute(false);
                }
                
                adSkipped = true;
                skipInProgress = false;
                setTimeout(() => { adSkipped = false; skipInProgress = false; }, 3000);
              }
              
              if (state !== 'playing') this.play();
              if (this.getMute()) this.setMute(false);
            } catch(e) {
              skipInProgress = false;
            }
          };
          
          // Event listeners
          ['playlistItem', 'ready', 'time', 'adPlay', 'adBreakStart', 'instreamMode'].forEach(event => {
            this.on(event, ultraFastSkip);
          });
          
          // Initialization
          ultraFastSkip();
          [100, 300, 500].forEach(delay => setTimeout(ultraFastSkip, delay));
          
          return res;
        };
        
        return p;
      };
      
      Object.keys(val).forEach(k => {
        try { jwOrig[k] = val[k]; } catch(e) {}
      });
      
      if (val.prototype) jwOrig.prototype = val.prototype;
      log('✅ JW Player hooked (intelligent skip)');
    },
    configurable: true
  });

  // ============================================================
  // 🎨 CSS INJECTION & DOM CLEANER
  // ============================================================
  const AD_SELECTORS = [
    '[class*="man88"]','[class*="lu88"]','[class*="sspp"]','[class*="robong"]',
    '.denied-box','.ad-overlay','.ima-ad-container','.app-box-fix','.content-rb',
    '[class*="preroll"]','[class*="ads"]:not(.watch-player)','.jw-ad','.jw-ad-container',
    '.jw-flag-ads','.sspp-area','.is-pop','.ssp-pop-id','.modal-backdrop',
    '.fade.modal-backdrop','.modal-backdrop.show','[id*="shadow-root"]','#shadow-root',
    '[class*="backdrop"]','[class*="overlay"]:not(.watch-player)','.jw-skip','.jw-skip-button',
    '.jw-skiptext','.jw-skip-icon','.jw-countdown','.jw-countdown-container',
    '.jw-countdown-show','.jw-ad-skip','.jw-ad-skip-button','.jw-ad-countdown',
    '.jw-ima-ad-container','.jw-ima-ad-overlay','.jw-ad-display','.jw-ad-controls',
    '.jw-ad-message','[class*="skip"]','[class*="countdown"]','[class*="ad-"]',
    '[id*="skip"]','[id*="countdown"]','[id*="ad-"]','.jw-instream','.jw-instream-ad',
    '.jw-ad-break','.jw-ad-marker','.jw-ad-cue','.jw-ad-timeline','[class*="cvt"]',
    '[id*="cvt"]','[class*="pmolink"]','[class*="finallygotthexds"]','[class*="sundaythekingplays"]'
  ];

  const hideElement = (el) => {
    el.style.cssText = 'display:none!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;position:absolute!important;left:-9999px!important;top:-9999px!important;z-index:-9999!important;';
  };

  const injectCSS = () => {
    const css = document.createElement('style');
    css.textContent = `
      ${AD_SELECTORS.join(',')}{
        display:none!important;
        opacity:0!important;
        pointer-events:none!important;
        visibility:hidden!important;
      }
      
      body.modal-open{
        overflow:auto!important;
        padding-right:0!important;
      }
      
      .watch-player,video,#embed-player,.jwplayer{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
      }
      
      [class*="backdrop"]:not(.watch-player),
      [class*="overlay"]:not(.watch-player):not(video),
      div[style*="position: fixed"][style*="z-index: 9999"],
      div[style*="position: absolute"][style*="z-index: 9999"]{
        display:none!important;
        opacity:0!important;
        pointer-events:none!important;
        visibility:hidden!important;
      }
    `;
    (document.head || document.documentElement).appendChild(css);
    log('🎨 Enhanced CSS injected (safe mode)');
  };

  injectCSS();

  if (isRophim) {
    let count = 0, lastCleanTime = 0;
    
    const clean = () => {
      const now = Date.now();
      if (now - lastCleanTime < 100) return;
      lastCleanTime = now;
      
      try {
        const foundAds = document.querySelectorAll(AD_SELECTORS.join(','));
        
        foundAds.forEach(el => {
          if (el.parentNode && !el.closest('video,#embed-player,.jwplayer,.watch-player')) {
            try {
              hideElement(el);
              count++;
            } catch(e) {}
          }
        });
      
        document.querySelectorAll('div[style*="position:"][style*="z-index"]').forEach(el => {
          if (el.offsetParent === null || !el.parentNode) return;
          
          try {
            const style = window.getComputedStyle(el);
            const zIndex = parseInt(style.zIndex);
            
            if (zIndex > 9000 && !el.closest('video,#embed-player,.jwplayer,.watch-player')) {
              const rect = el.getBoundingClientRect();
              if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
                hideElement(el);
                count++;
              }
            }
          } catch(e) {}
        });
      } catch(e) {}
    };

    clean();
    setInterval(clean, 1000);
    
    const obs = new MutationObserver((mutations) => {
      let hasAdElements = false;
      
      try {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.matches) {
                AD_SELECTORS.forEach(selector => {
                  if (node.matches(selector)) {
                    hasAdElements = true;
                    return false;
                  }
                });
              }
            });
          }
        });
        
        if (hasAdElements) setTimeout(clean, 50);
      } catch(e) {}
    });
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        obs.observe(document.documentElement, {childList: true, subtree: true});
      });
    } else {
      obs.observe(document.documentElement, {childList: true, subtree: true});
    }
    
    setTimeout(() => {
      if (count > 0) log(`🧹 Cleaned ${count} ads`);
    }, 5000);
  }

  // ============================================================
  // 🚫 DOM SKIP
  // ============================================================
  let lastSkipTime = 0;
  const ultraFastDomSkip = () => {
    const now = Date.now();
    if (now - lastSkipTime < 500) return;
    lastSkipTime = now;
    
    try {
      const skipButton = document.querySelector('.jw-skip, .jw-skip-button, [class*="skip"]');
      if (skipButton && skipButton.offsetParent !== null && skipButton.parentNode) {
        const text = skipButton.textContent?.trim();
        if (text === 'Bỏ qua' || skipButton.classList.contains('jw-skippable') || text.includes('Skip')) {
          skipButton.click();
          return true;
        }
      }
      
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        if (!video.parentNode) continue;
        
        const duration = video.duration, currentTime = video.currentTime;
        
        if (duration < 60 && duration > 0 && currentTime < 3) {
          try {
            video.currentTime = Math.max(duration - 0.1, 0);
            
            const jwPlayer = window.jwplayer();
            if (jwPlayer && typeof jwPlayer.playlistItem === 'function') {
              try {
                const playlist = jwPlayer.getPlaylist(), currentIndex = jwPlayer.getPlaylistIndex();
                if (playlist && playlist.length > currentIndex + 1) {
                  jwPlayer.playlistItem(currentIndex + 1);
                }
              } catch(e) {}
            }
            return true;
          } catch(e) {}
        }
      }
    } catch(e) {}
    return false;
  };
    
  setInterval(ultraFastDomSkip, 500);
})();