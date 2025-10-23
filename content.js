// ============================================================
// 🛡️ ROPHIM ADBLOCK - FIXED VERSION
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
  // 🔥 SERVICE WORKER KILLER - AGGRESSIVE MODE
  // ============================================================
  const killServiceWorkers = async () => {
    if (!navigator.serviceWorker) return;
    
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
        warn(`✅ SW killed: ${reg.scope}`);
      }
      
      // Force reload controller
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('KILL');
      }
    } catch (e) {
      warn(`SW kill failed: ${e.message}`);
    }
  };

  // Block SW registration BEFORE anything else
  if (navigator.serviceWorker) {
    const origRegister = navigator.serviceWorker.register;
    const origGetReg = navigator.serviceWorker.getRegistration;
    const origGetRegs = navigator.serviceWorker.getRegistrations;
    
    Object.defineProperty(navigator.serviceWorker, 'register', {
      value: function(...args) {
        warn(`🚫 SW registration blocked: ${args[0]}`);
        return Promise.reject(new DOMException('Service Worker blocked', 'SecurityError'));
      },
      writable: false,
      configurable: false
    });
    
    Object.defineProperty(navigator.serviceWorker, 'getRegistration', {
      value: async function() {
        await killServiceWorkers();
        return undefined;
      },
      writable: false,
      configurable: false
    });
    
    Object.defineProperty(navigator.serviceWorker, 'getRegistrations', {
      value: async function() {
        await killServiceWorkers();
        return [];
      },
      writable: false,
      configurable: false
    });
    
    log('🚫 SW registration blocked');
  }

  // Aggressive SW killing
  killServiceWorkers();
  setInterval(killServiceWorkers, 1000);

  // ============================================================
  // 🚫 ANTI-DEBUGGER - ENHANCED
  // ============================================================
  
  // 1. Override console.debug to prevent debugger detection
  const origConsole = { ...console };
  console.debug = () => {};
  console.clear = () => {};
  
  // 2. Block eval with debugger
  const origEval = window.eval;
  window.eval = function(code) {
    if (typeof code === 'string' && /debugger/i.test(code)) {
      warn('🚫 Debugger in eval blocked');
      return origEval.call(this, code.replace(/debugger\s*;?/gi, '/* removed */'));
    }
    return origEval.call(this, code);
  };

  // 3. Block Function constructor with debugger
  const OrigFunction = window.Function;
  window.Function = function(...args) {
    const code = args[args.length - 1];
    if (typeof code === 'string' && /debugger/i.test(code)) {
      warn('🚫 Debugger in Function blocked');
      args[args.length - 1] = code.replace(/debugger\s*;?/gi, '/* removed */');
    }
    return OrigFunction.apply(this, args);
  };
  window.Function.prototype = OrigFunction.prototype;

  // 4. Block ALL types of Workers
  if (window.Worker) {
    const OrigWorker = window.Worker;
    window.Worker = function(scriptURL, options) {
      const url = String(scriptURL);
      
      // Block data: and blob: URLs
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        warn(`🚫 Worker blocked: ${url.slice(0, 50)}`);
        throw new DOMException('Worker blocked by security policy', 'SecurityError');
      }
      
      // Check if URL contains debugger
      if (url.includes('debugger') || url.includes('ZGVidWdnZXI')) { // base64 of 'debugger'
        warn(`🚫 Suspicious worker blocked: ${url.slice(0, 50)}`);
        throw new DOMException('Suspicious worker blocked', 'SecurityError');
      }
      
      return new OrigWorker(scriptURL, options);
    };
    window.Worker.prototype = OrigWorker.prototype;
  }

  // 5. Block SharedWorker
  if (window.SharedWorker) {
    window.SharedWorker = function() {
      warn('🚫 SharedWorker blocked');
      throw new DOMException('SharedWorker not supported', 'NotSupportedError');
    };
  }

  // 6. Intercept setTimeout/setInterval with debugger
  const origSetTimeout = window.setTimeout;
  const origSetInterval = window.setInterval;
  
  window.setTimeout = function(fn, delay, ...args) {
    if (typeof fn === 'string' && /debugger/i.test(fn)) {
      warn('🚫 setTimeout debugger blocked');
      return;
    }
    return origSetTimeout.call(this, fn, delay, ...args);
  };
  
  window.setInterval = function(fn, delay, ...args) {
    if (typeof fn === 'string' && /debugger/i.test(fn)) {
      warn('🚫 setInterval debugger blocked');
      return;
    }
    return origSetInterval.call(this, fn, delay, ...args);
  };

  log('🚫 Anti-debugger active');

  // ============================================================
  // 🚫 NETWORK BLOCKER
  // ============================================================
  const BLOCKED_PATTERNS = [
    /crash2\.html/i, /error\.html/i, /ping\.gif/i, /report_issue/i,
    /man88/i, /lu88/i, /sspp/i, /robong\./i,
    /\.ads\./i, /adserver/i, /preroll/i, /ad-overlay/i,
    /ima-ad/i, /jwpsrv\.js/i, /denied/i,
    /jwpltx\.com/i, /prd\.jwpltx/i,
    /doubleclick\./i, /googlesyndication\./i,
    /sw\.js$/i, /service-worker\.js$/i, /serviceworker\.js$/i,
    /data:application\/javascript.*debugger/i,
    /blob:.*debugger/i,
    /ZGVidWdnZXI/i // base64 'debugger'
  ];

  const ALLOWED_PATTERNS = [
    /jwplayer\.js/i, /provider\.hlsjs\.js/i,
    /\.m3u8/i, /\.ts$/i, /\.mp4/i, /\.webp$/i, /\.woff2?$/i
  ];

  const shouldBlock = (url) => {
    const s = String(url);
    
    if (s.startsWith('data:')) {
      try {
        const decoded = atob(s.split(',')[1] || '');
        if (/debugger/i.test(decoded)) {
          warn(`🚫 Blocked data URL with debugger`);
          return true;
        }
      } catch (e) {}
      
      if (/debugger|crash2|error/i.test(s)) return true;
    }
    
    if (ALLOWED_PATTERNS.some(p => p.test(s))) return false;
    return BLOCKED_PATTERNS.some(p => p.test(s));
  };

  // Fetch hook
  const origFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (shouldBlock(url)) {
      warn(`🚫 Fetch blocked: ${String(url).slice(0, 50)}`);
      return Promise.resolve(new Response('', {status: 204}));
    }
    return origFetch.call(this, url, ...args);
  };

  // XHR hook
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url, ...args) {
    if (shouldBlock(url)) {
      warn(`🚫 XHR blocked: ${String(url).slice(0, 50)}`);
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

  log('🚫 Network blocker active');

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
  const AD_DOMAINS = [/robong\./i, /man88\./i, /lu88\./i, /sspp\./i, /bet/i, /casino/i];
  const isAdDomain = url => AD_DOMAINS.some(p => p.test(String(url)));

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
  // 🔥 JW PLAYER HOOK - SUPER AGGRESSIVE
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
          
          // Override ALL ad methods
          this.playAd = function() { 
            warn('❌ playAd called - forcing skip');
            this.play();
            return this;
          };
          
          this.pauseAd = function() {
            warn('❌ pauseAd called - ignoring');
            return this;
          };
          
          this.skipAd = function() { 
            warn('✅ skipAd called - forcing play');
            this.play();
            return this;
          };
          
          // Aggressive ad skipper
          const forcePlay = () => {
            setTimeout(() => {
              try {
                const state = this.getState();
                
                // Force play if not playing
                if (state !== 'playing') {
                  this.play();
                }
                
                // Skip first 5 seconds
                const pos = this.getPosition();
                if (pos < 5) {
                  this.seek(5);
                  warn(`⏭️ Skipped to 5s (was at ${pos}s)`);
                }
                
                // Unmute if muted
                if (this.getMute()) {
                  this.setMute(false);
                  warn('🔊 Unmuted player');
                }
                
                // Ensure volume
                const vol = this.getVolume();
                if (vol === 0) {
                  this.setVolume(100);
                  warn('🔊 Volume restored to 100');
                }
              } catch(e) {
                warn(`Error in forcePlay: ${e.message}`);
              }
            }, 50);
          };
          
          // Listen to ALL ad events
          const adEvents = [
            'adStarted', 'adBreakStart', 'adImpression', 'adPlay', 
            'adRequest', 'adSchedule', 'adError', 'adBlock',
            'adClick', 'adCompanions', 'adComplete', 'adSkipped',
            'adTime', 'adViewableImpression', 'adMeta',
            'beforePlay', 'playlistItem', 'ready', 'pause'
          ];
          
          adEvents.forEach(evt => {
            this.on(evt, (e) => {
              if (e && e.type && /ad/i.test(e.type)) {
                warn(`🚫 Ad event blocked: ${e.type}`);
              }
              forcePlay();
            });
          });
          
          // Monitor state changes
          this.on('state', (e) => {
            if (e.newstate === 'paused' || e.newstate === 'idle') {
              warn(`⚠️ State changed to ${e.newstate} - forcing play`);
              forcePlay();
            }
          });
          
          // Monitor playback
          let lastPos = 0;
          this.on('time', (e) => {
            // Detect if stuck at beginning (ad playing)
            if (e.position < 5 && e.position === lastPos && e.position > 0) {
              warn('⚠️ Stuck at beginning - force seeking');
              this.seek(5);
            }
            lastPos = e.position;
            
            // Auto-play if paused
            const state = this.getState();
            if (state === 'paused' && e.position > 0) {
              setTimeout(() => this.play(), 100);
            }
          });
          
          // Force play when ready
          this.on('ready', () => {
            warn('✅ Player ready - forcing play');
            setTimeout(() => {
              this.play();
              this.seek(5);
              this.setMute(false);
              this.setVolume(100);
            }, 200);
          });
          
          // Force play immediately
          setTimeout(() => {
            forcePlay();
          }, 500);
          
          return res;
        };
        
        return p;
      };
      
      Object.keys(val).forEach(k => {
        try { jwOrig[k] = val[k]; } catch(e) {}
      });
      
      if (val.prototype) jwOrig.prototype = val.prototype;
      
      log('✅ JW Player hooked (super aggressive mode)');
    },
    configurable: true
  });

  // Monitor for player and force play
  setInterval(() => {
    if (playerInstance) {
      try {
        const state = playerInstance.getState();
        const pos = playerInstance.getPosition();
        
        if (state === 'paused' && pos < 5) {
          playerInstance.play();
          playerInstance.seek(5);
        }
        
        if (playerInstance.getMute()) {
          playerInstance.setMute(false);
        }
      } catch (e) {}
    }
  }, 500);

  // ============================================================
  // 🎨 CSS INJECTION
  // ============================================================
  const injectCSS = () => {
    const css = document.createElement('style');
    css.textContent = `
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
      body.modal-open{overflow:auto!important;padding-right:0!important}
      .watch-player,video,#embed-player,.jwplayer{display:block!important;visibility:visible!important;opacity:1!important}
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
  log('🟢 AdBlock active - All protections enabled');
})();