// ============================================================
// 🛡️ ROPHIM ADBLOCK - OPTIMIZED FINAL VERSION
// ============================================================
(() => {
  'use strict';

  const isGoat = /goatembed\./i.test(location.hostname);
  const isRophim = /rophim\./i.test(location.hostname);
  
  if (!isGoat && !isRophim) return;

  const log = msg => console.log(`✅ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
  const warn = msg => console.warn(`⚠️ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);

  // ============================================================
  // 🍪 COOKIE PROTECTION - FIRST PRIORITY
  // ============================================================
  const COOKIE_CONFIG = {
    path: '/',
    maxAge: 31536000, // 1 year
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

  // Apply immediately
  protectCookies();

  // Monitor and re-apply every 2 seconds
  setInterval(protectCookies, 2000);

  log('🍪 Cookie protection active');

  // ============================================================
  // 🔥 SERVICE WORKER KILLER
  // ============================================================
  const killServiceWorkers = async () => {
    if (!navigator.serviceWorker) return;
    
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map(reg => reg.unregister()));
        log('✅ SW killed');
      }
    } catch (e) {
      warn(`SW kill failed: ${e.message}`);
    }
  };

  // Block SW registration
  if (navigator.serviceWorker) {
    try {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        value: () => Promise.reject(new DOMException('Blocked', 'NotSupportedError')),
        writable: false,
        configurable: true
      });
      log('🚫 SW blocked');
    } catch (e) {}
  }

  killServiceWorkers();

  // ============================================================
  // 🚫 ANTI-DEBUGGER
  // ============================================================
  try {
    const origEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string' && /debugger/i.test(code)) {
        return origEval.call(this, code.replace(/debugger\s*;?/gi, ''));
      }
      return origEval.call(this, code);
    };

    const OrigFunction = window.Function;
    window.Function = function(...args) {
      const code = args[args.length - 1];
      if (typeof code === 'string' && /debugger/i.test(code)) {
        args[args.length - 1] = code.replace(/debugger\s*;?/gi, '');
      }
      return OrigFunction.apply(this, args);
    };
    window.Function.prototype = OrigFunction.prototype;

    if (window.Worker) {
      const OrigWorker = window.Worker;
      window.Worker = function(url, ...args) {
        if (typeof url === 'string' && url.startsWith('data:')) {
          throw new DOMException('Blocked', 'SecurityError');
        }
        return new OrigWorker(url, ...args);
      };
      window.Worker.prototype = OrigWorker.prototype;
    }

    log('🚫 Anti-debugger active');
  } catch (e) {}

  // ============================================================
  // 🚫 NETWORK BLOCKER
  // ============================================================
  const BLOCKED_PATTERNS = [
    /crash2\.html/i, /error\.html/i, /ping\.gif/i, /report_issue/i,
    /man88/i, /lu88/i, /sspp/i, /robong\./i,
    /\.ads\./i, /adserver/i, /preroll/i, /ad-overlay/i,
    /ima-ad/i, /jwpsrv\.js/i, /denied/i,
    /jwpltx\.com/i, /prd\.jwpltx/i,
    /data:application\/javascript.*debugger/i
  ];

  const ALLOWED_PATTERNS = [
    /jwplayer\.js/i, /provider\.hlsjs\.js/i,
    /\.m3u8/i, /\.ts$/i, /\.mp4/i, /\.webp$/i, /\.woff2?$/i
  ];

  const shouldBlock = (url) => {
    const s = String(url);
    
    if (s.startsWith('data:') && /debugger|crash2|error/i.test(s)) {
      return true;
    }
    
    if (ALLOWED_PATTERNS.some(p => p.test(s))) return false;
    return BLOCKED_PATTERNS.some(p => p.test(s));
  };

  // Fetch hook
  const origFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (shouldBlock(url)) {
      return Promise.resolve(new Response('', {status: 204}));
    }
    return origFetch.call(this, url, ...args);
  };

  // XHR hook
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url, ...args) {
    if (shouldBlock(url)) {
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
  // 🔥 JW PLAYER HOOK
  // ============================================================
  let jwOrig = null;
  
  Object.defineProperty(window, 'jwplayer', {
    get: () => jwOrig,
    set(val) {
      if (!val || jwOrig) return;
      
      jwOrig = function(id) {
        const p = val(id);
        if (!p) return p;
        
        const origSetup = p.setup;
        p.setup = function(cfg) {
          if (cfg) {
            delete cfg.advertising;
            delete cfg.preload;
            cfg.autostart = true;
            
            if (cfg.playlist) {
              cfg.playlist = cfg.playlist.map(i => {
                delete i.adschedule;
                delete i.advertising;
                return i;
              });
            }
          }
          
          const res = origSetup.call(this, cfg);
          
          // Block all ad methods
          this.playAd = () => { this.play(); return this; };
          this.pauseAd = () => this;
          this.skipAd = () => { this.play(); return this; };
          
          const forceSkip = () => {
            setTimeout(() => {
              try {
                this.skipAd();
                this.play();
                
                const pos = this.getPosition();
                if (pos < 5) this.seek(5);
                
                const vol = this.getVolume();
                this.setVolume(0);
                setTimeout(() => this.setVolume(vol), 100);
              } catch(e) {}
            }, 10);
          };
          
          ['adStarted', 'adBreakStart', 'adImpression', 'adPlay', 'adRequest', 'adSchedule', 'adError'].forEach(evt => {
            this.on(evt, forceSkip);
          });
          
          this.on('time', (e) => {
            if (this.getState() === 'paused' && e.position > 0) {
              setTimeout(() => this.play(), 50);
            }
          });
          
          return res;
        };
        
        return p;
      };
      
      Object.keys(val).forEach(k => {
        try { jwOrig[k] = val[k]; } catch(e) {}
      });
      
      if (val.prototype) jwOrig.prototype = val.prototype;
      
      log('✅ JW Player hooked');
    },
    configurable: true
  });

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
      div[style*="position: absolute"][style*="z-index: 9999"]{
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
      '.jw-ad','.jw-ad-container',
      '.modal-backdrop','.fade.modal-backdrop','.modal-backdrop.show',
      '[id*="shadow-root"]','#shadow-root',
      '[class*="backdrop"]','[class*="overlay"]:not(.watch-player)'
    ];

    let count = 0;
    
    const clean = () => {
      // Remove ad elements
      document.querySelectorAll(AD_SELECTORS.join(',')).forEach(el => {
        if (!el.closest('video,#embed-player,.jwplayer,.watch-player')) {
          el.remove();
          count++;
        }
      });
      
      // Unlock body scroll
      if (document.body) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      
      // Remove high z-index overlays
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

    // Initial + periodic cleaning
    clean();
    setInterval(clean, 500);
    
    // Observe DOM changes
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

  // ESC key to close modals
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