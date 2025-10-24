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
  const COOKIE_CONFIG = {
    path: '/',
    maxAge: 31536000,
    sameSite: 'Lax'
  };

  const ANTI_AD_COOKIES = {
    '_allow_popunder': '0',
    '_popunder_opened_v0.1': '0',
    '_n_rb_show': '1',
    '_popup_blocked': '1',
    '_ad_blocked': '1'
  };

  const setCookie = (name, value, options = {}) => {
    const opts = { ...COOKIE_CONFIG, ...options };
    const parts = [`${name}=${value}`, `path=${opts.path}`, `max-age=${opts.maxAge}`, `SameSite=${opts.sameSite}`];
    document.cookie = parts.join('; ');
  };

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
    return match ? match[2] : null;
  };

  const protectCookies = () => {
    Object.entries(ANTI_AD_COOKIES).forEach(([name, value]) => {
      if (getCookie(name) !== value) {
        setCookie(name, value);
      }
    });
  };

  protectCookies();
  setInterval(protectCookies, 2000);
  log('🍪 Cookie protection active');

  // ============================================================
  // 🚫 NETWORK BLOCKER - PRECISION MODE
  // ============================================================
  const BLOCKED_PATTERNS = [
    // Crash/Error pages
    /crash2\.html/i, /error\.html/i, /ping\.gif/i, /report_issue/i,
    
    // Ad domains
    /man88/i, /lu88/i, /sspp/i, /robong\./i,
    /\.ads\./i, /adserver/i, /preroll/i, /ad-overlay/i,
    /ima-ad/i, /jwpsrv\.js/i, /denied/i,
    
    // JWP tracking
    /jwpltx\.com/i, /prd\.jwpltx/i,
    
    // Google ads
    /doubleclick\./i, /googlesyndication\./i
  ];

  // ⭐ ONLY block CVT requests with /pmolink/ path
  const isCVTAd = (url) => {
    const s = String(url);
    return /cvt\.finallygotthexds\.site/i.test(s) && /\/pmolink\//i.test(s);
  };

  const shouldBlock = (url) => {
    const s = String(url);
    
    // Block CVT ad requests
    if (isCVTAd(s)) {
      warn(`🚫 CVT ad blocked: ${s.slice(0, 80)}...`);
      return true;
    }
    
    // Block other ad patterns (but NOT .m3u8 files)
    if (s.endsWith('.m3u8') || s.endsWith('.ts')) {
      return false; // Allow ALL HLS streams
    }
    
    return BLOCKED_PATTERNS.some(p => p.test(s));
  };

  // Fetch hook
  const origFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (shouldBlock(url)) {
      warn(`🚫 Fetch blocked: ${String(url).slice(0, 50)}...`);
      return Promise.resolve(new Response('', {status: 204}));
    }
    return origFetch.call(this, url, ...args);
  };

  // XHR hook
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url, ...args) {
    if (shouldBlock(url)) {
      warn(`🚫 XHR blocked: ${String(url).slice(0, 50)}...`);
      this._blocked = true;
      return;
    }
    return origOpen.call(this, m, url, ...args);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._blocked) return;
    return origSend.call(this, ...args);
  };

  log('🚫 Network blocker active (CVT ads only)');

  // ============================================================
  // 🎯 URL PROTECTION
  // ============================================================
  if (isGoat) {
    const currentUrl = location.href;
    const isBad = /crash2\.html|error\.html/i.test(currentUrl) || 
                  (/\.jpg$/i.test(currentUrl) && !/\/player\//i.test(currentUrl));
    
    if (isBad) {
      window.stop();
      
      let vid = null;
      
      if (document.referrer) {
        const m = document.referrer.match(/goatembed\.com\/([A-Za-z0-9_-]{8,})/);
        if (m && m[1] !== 'resource' && m[1] !== 'e') vid = m[1];
      }
      
      if (!vid) {
        try { vid = sessionStorage.getItem('goat_vid'); } catch (e) {}
      }
      
      if (vid && !sessionStorage.getItem('goat_redir')) {
        sessionStorage.setItem('goat_redir', '1');
        setTimeout(() => location.replace(`https://goatembed.com/${vid}?version=1`), 100);
        throw new Error('Redirecting');
      }
      
      document.open();
      document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Blocked</title><style>*{margin:0;padding:0}body{background:#1e293b;color:#fff;font:16px/1.6 system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.box{background:#334155;padding:40px;border-radius:16px;text-align:center;max-width:500px}.icon{font-size:60px;margin-bottom:20px}h1{font-size:24px;margin-bottom:12px}button{background:#3b82f6;color:#fff;border:0;padding:12px 24px;border-radius:8px;font:600 14px system-ui;cursor:pointer;margin:8px 4px}button:hover{background:#2563eb}</style></head><body><div class="box"><div class="icon">🚫</div><h1>URL Blocked</h1><button onclick="history.back()">← Back</button>${vid ? `<button onclick="location='https://goatembed.com/${vid}?version=1'">🔄 Reload</button>` : ''}</div></body></html>`);
      document.close();
      throw new Error('Blocked');
    }
    
    sessionStorage.removeItem('goat_redir');
    
    const m = currentUrl.match(/goatembed\.com\/([A-Za-z0-9_-]{8,})/);
    if (m && m[1] !== 'resource' && m[1] !== 'e') {
      try { sessionStorage.setItem('goat_vid', m[1]); } catch (e) {}
    }
    
    log('✅ URL OK');
  }

  // ============================================================
  // 🔒 REDIRECT PROTECTION
  // ============================================================
  const AD_DOMAINS = [
    /robong\./i, /man88\./i, /lu88\./i, /sspp\./i, 
    /bet/i, /casino/i
  ];
  
  const isAdDomain = url => AD_DOMAINS.some(p => p.test(String(url))) || isCVTAd(url);

  try {
    const LocationProto = Object.getPrototypeOf(location);
    const hrefDesc = Object.getOwnPropertyDescriptor(LocationProto, 'href');
    
    if (hrefDesc && hrefDesc.set) {
      Object.defineProperty(location, 'href', {
        get: hrefDesc.get,
        set(url) {
          if (shouldBlock(url) || isAdDomain(url)) {
            warn(`🚫 Redirect blocked: ${String(url).slice(0, 40)}`);
            return;
          }
          return hrefDesc.set.call(location, url);
        },
        configurable: true
      });
    }
    
    log('🔒 Redirect protection active');
  } catch (e) {}

  // ============================================================
  // 🎯 IFRAME MANAGER
  // ============================================================
  if (isRophim) {
    const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
    if (match) {
      try { sessionStorage.setItem('rophim_vid', match[0]); } catch (e) {}
    }
    
    const getCorrectUrl = () => {
      if (!match) return null;
      const p = new URLSearchParams(location.search);
      return `https://goatembed.com/${match[0]}?version=${p.get('ver')||2}&season=${p.get('s')||1}&episode=${p.get('ep')||1}`;
    };
    
    const origCreate = document.createElement;
    document.createElement = function(tag, ...args) {
      const el = origCreate.call(this, tag, ...args);
      
      if (tag.toLowerCase() === 'iframe') {
        const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
        
        Object.defineProperty(el, 'src', {
          get: srcDesc.get,
          set(url) {
            if (shouldBlock(url)) {
              const fix = getCorrectUrl();
              if (fix) return srcDesc.set.call(this, fix);
              return;
            }
            return srcDesc.set.call(this, url);
          }
        });
      }
      
      return el;
    };
    
    log('🛡️ Iframe manager active');
  }

  // ============================================================
  // 🔥 JW PLAYER HOOK - FORCE SKIP ADS
  // ============================================================
  let jwOrig = null;
  let playerInstance = null;
  
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
            // Remove ALL ad configs
            delete cfg.advertising;
            delete cfg.preload;
            delete cfg.vastPlugin;
            delete cfg.ima;
            delete cfg.googima;
            delete cfg.freewheel;
            cfg.autostart = true;
            cfg.mute = false;
            
            if (cfg.playlist) {
              cfg.playlist = cfg.playlist.map(i => {
                delete i.adschedule;
                delete i.advertising;
                delete i.preroll;
                delete i.vmap;
                delete i.vastxml;
                return i;
              });
            }
          }
          
          const res = origSetup.call(this, cfg);
          
          // Override ad methods
          this.playAd = function() { 
            warn('❌ playAd blocked - forcing play');
            this.play();
            return this;
          };
          
          this.pauseAd = function() {
            warn('❌ pauseAd blocked');
            return this;
          };
          
          this.skipAd = function() { 
            warn('✅ skipAd - forcing play');
            this.play();
            return this;
          };
          
          // ⭐ FORCE SKIP AFTER 5 SECONDS
          const forceSkipAds = () => {
            setTimeout(() => {
              try {
                const state = this.getState();
                const pos = this.getPosition();
                
                // If stuck at beginning (ad playing), skip to 5s
                if (pos < 5 && state !== 'playing') {
                  this.play();
                  this.seek(5);
                  warn(`⏭️ Force skipped to 5s (was at ${pos}s)`);
                }
                
                // Unmute and restore volume
                if (this.getMute()) {
                  this.setMute(false);
                  warn('🔊 Unmuted player');
                }
                
                const vol = this.getVolume();
                if (vol === 0) {
                  this.setVolume(100);
                  warn('🔊 Volume restored');
                }
              } catch(e) {}
            }, 50);
          };
          
          // Listen to ad events and force skip
          const adEvents = [
            'adStarted', 'adBreakStart', 'adImpression', 'adPlay', 
            'adRequest', 'adSchedule', 'adError', 'adBlock',
            'beforePlay', 'ready', 'pause'
          ];
          
          adEvents.forEach(evt => {
            this.on(evt, () => {
              warn(`🚫 Ad event: ${evt} - forcing skip`);
              forceSkipAds();
            });
          });
          
          // Monitor state changes
          this.on('state', (e) => {
            if (e.newstate === 'paused' || e.newstate === 'idle') {
              warn(`⚠️ State: ${e.newstate} - forcing play`);
              forceSkipAds();
            }
          });
          
          // Auto-play when ready
          this.on('ready', () => {
            warn('✅ Player ready - starting playback');
            setTimeout(() => {
              this.play();
              this.seek(5); // Skip first 5s (usually ads)
              this.setMute(false);
              this.setVolume(100);
            }, 200);
          });
          
          // Initial force skip
          setTimeout(forceSkipAds, 500);
          
          return res;
        };
        
        return p;
      };
      
      Object.keys(val).forEach(k => {
        try { jwOrig[k] = val[k]; } catch(e) {}
      });
      
      if (val.prototype) jwOrig.prototype = val.prototype;
      
      log('✅ JW Player hooked (force skip mode)');
    },
    configurable: true
  });

  // Monitor player and force play if stuck
  setInterval(() => {
    if (playerInstance) {
      try {
        const state = playerInstance.getState();
        const pos = playerInstance.getPosition();
        
        // If paused at beginning, force play and skip
        if (state === 'paused' && pos < 5) {
          playerInstance.play();
          playerInstance.seek(5);
        }
        
        // Ensure unmuted
        if (playerInstance.getMute()) {
          playerInstance.setMute(false);
        }
      } catch (e) {}
    }
  }, 1000);

  // ============================================================
  // 🎨 CSS INJECTION - HIDE ADS
  // ============================================================
  const injectCSS = () => {
    const css = document.createElement('style');
    css.textContent = `
      /* Hide ad elements */
      [class*="man88"],[class*="lu88"],[class*="sspp"],[class*="robong"],
      .denied-box,.ad-overlay,.ima-ad-container,.app-box-fix,
      [class*="preroll"],[class*="ads"]:not(.watch-player),
      .jw-ad,.jw-ad-container,.content-rb,.rb-header,
      .modal-backdrop,.fade.modal-backdrop,.modal-backdrop.show,
      .fade.modal-backdrop.show,div.fade.modal-backdrop.show,
      #shadow-root,[id*="shadow"],[class*="backdrop"],
      [class*="overlay"]:not(.watch-player):not(video),
      div[style*="position: fixed"][style*="z-index"],
      div[style*="position: absolute"][style*="z-index: 9999"],
      .jw-flag-ads,.jw-flag-ads-googleima,.jw-flag-advertising{
        display:none!important;
        opacity:0!important;
        pointer-events:none!important;
        visibility:hidden!important;
      }
      
      /* Ensure body is scrollable */
      body.modal-open{
        overflow:auto!important;
        padding-right:0!important;
      }
      
      /* Ensure player is visible */
      .watch-player,video,#embed-player,.jwplayer{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
      }
    `;
    (document.head || document.documentElement).appendChild(css);
    log('🎨 CSS injected');
  };

  injectCSS();

  // ============================================================
  // 🧹 DOM CLEANER
  // ============================================================
  if (isRophim) {
    const AD_SELECTORS = [
      '[class*="man88"]','[class*="lu88"]','[class*="sspp"]','[class*="robong"]',
      '.denied-box','.ad-overlay','.ima-ad-container','.app-box-fix','.content-rb',
      '[class*="preroll"]','[class*="ads"]:not(.watch-player)',
      '.jw-ad','.jw-ad-container','.jw-flag-ads',
      '.modal-backdrop','.fade.modal-backdrop','.modal-backdrop.show',
      '[id*="shadow-root"]','#shadow-root',
      '[class*="backdrop"]','[class*="overlay"]:not(.watch-player)'
    ];

    let count = 0;
    
    const clean = () => {
      document.querySelectorAll(AD_SELECTORS.join(',')).forEach(el => {
        if (!el.closest('video,#embed-player,.jwplayer,.watch-player')) {
          el.remove();
          count++;
        }
      });
      
      if (document.body) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      
      document.querySelectorAll('div[style*="position:"][style*="z-index"]').forEach(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        
        if (zIndex > 9000 && !el.closest('video,#embed-player,.jwplayer,.watch-player')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
            el.remove();
            count++;
          }
        }
      });
    };

    clean();
    setInterval(clean, 500);
    
    const obs = new MutationObserver(clean);
    obs.observe(document.documentElement, {childList: true, subtree: true});
    
    setTimeout(() => {
      if (count > 0) log(`🧹 Cleaned ${count} ads`);
    }, 5000);
  }

  // ============================================================
  // 🚫 POPUP/ALERT BLOCKER
  // ============================================================
  window.open = () => null;
  window.alert = () => {};
  window.confirm = () => false;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop,[class*="backdrop"]').forEach(el => el.remove());
    }
  }, true);

  // ============================================================
  // ✅ COMPLETE
  // ============================================================
  log('🟢 AdBlock active - Lightweight mode (CVT ads blocked, all .m3u8 visible)');
})();