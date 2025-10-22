// ============================================================
// 🛡️ ROPHIM ADBLOCK - FINAL STABLE VERSION
// ============================================================
(() => {
  'use strict';

  const isGoat = /goatembed\./i.test(location.hostname);
  const isRophim = /rophim\./i.test(location.hostname);
  const currentDomain = location.hostname;
  
  if (!isGoat && !isRophim) return;

  const log = msg => console.log(`✅ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
  const warn = msg => console.warn(`⚠️ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);

  // Enhanced blocking patterns for ad domains
  const AD_DOMAINS = [
    /robong\./i,
    /man88\./i,
    /lu88\./i,
    /sspp\./i,
    /catfish\./i,
    /\.ads\./i,
    /adserver/i,
    /affiliate/i,
    /promo/i,
    /bet/i,
    /casino/i,
    /gambling/i
  ];
  
  const isAdDomain = (url) => {
    const s = String(url);
    return AD_DOMAINS.some(pattern => pattern.test(s));
  };

  // ============================================================
  // 🔥 SERVICE WORKER KILLER - PASSIVE MODE
  // ============================================================
  const killServiceWorkers = async () => {
    if (!navigator.serviceWorker) return;
    
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const hasController = !!navigator.serviceWorker.controller;
      
      if (regs.length > 0 || hasController) {
        warn(`🔥 Killing ${regs.length} SW (controller: ${hasController})`);
        
        // Unregister all
        for (const reg of regs) {
          await reg.unregister();
        }
        
        log('✅ SW killed');
      }
    } catch (e) {
      warn(`SW kill failed: ${e.message}`);
    }
  };

  // Block SW registration
  if (navigator.serviceWorker) {
    try {
      const origRegister = navigator.serviceWorker.register;
      Object.defineProperty(navigator.serviceWorker, 'register', {
        value: function(...args) {
          warn(`🚫 Blocked SW registration: ${args[0]}`);
          return Promise.reject(new DOMException('Blocked by AdBlock', 'NotSupportedError'));
        },
        writable: false,
        configurable: true
      });
      
      log('🚫 SW registration blocked');
    } catch (e) {
      warn(`SW block failed: ${e.message}`);
    }
  }

  // Kill existing SWs
  killServiceWorkers();

  // ============================================================
  // 🚫 ANTI-DEBUGGER - ENHANCED
  // ============================================================
  try {
    // Block eval with debugger
    const origEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string' && /debugger/i.test(code)) {
        warn('🚫 Blocked debugger in eval');
        return origEval.call(this, code.replace(/debugger\s*;?/gi, ''));
      }
      return origEval.call(this, code);
    };
    
    // Block Function constructor with debugger
    const OrigFunction = window.Function;
    window.Function = function(...args) {
      const code = args[args.length - 1];
      if (typeof code === 'string' && /debugger/i.test(code)) {
        warn('🚫 Blocked debugger in Function()');
        args[args.length - 1] = code.replace(/debugger\s*;?/gi, '');
      }
      return OrigFunction.apply(this, args);
    };
    window.Function.prototype = OrigFunction.prototype;
    
    // Hook Worker to block debugger in workers
    if (window.Worker) {
      const OrigWorker = window.Worker;
      window.Worker = function(scriptURL, ...args) {
        // Block data: URIs with debugger
        if (typeof scriptURL === 'string' && scriptURL.startsWith('data:')) {
          warn('🚫 Blocked data: URI Worker');
          throw new DOMException('Blocked by AdBlock', 'SecurityError');
        }
        return new OrigWorker(scriptURL, ...args);
      };
      window.Worker.prototype = OrigWorker.prototype;
    }
    
    // Override Object.defineProperty to catch debugger setters
    const origDefProp = Object.defineProperty;
    Object.defineProperty = function(obj, prop, desc) {
      if (desc && typeof desc.get === 'function') {
        const getStr = desc.get.toString();
        if (/debugger/i.test(getStr)) {
          warn('🚫 Blocked debugger in getter');
          desc.get = function() { return undefined; };
        }
      }
      if (desc && typeof desc.set === 'function') {
        const setStr = desc.set.toString();
        if (/debugger/i.test(setStr)) {
          warn('🚫 Blocked debugger in setter');
          desc.set = function() {};
        }
      }
      return origDefProp.call(this, obj, prop, desc);
    };
    
    log('🚫 Anti-debugger active');
  } catch (e) {
    warn(`Anti-debugger failed: ${e.message}`);
  }

  // ============================================================
  // 🚫 NETWORK BLOCKER - ENHANCED
  // ============================================================
  const BLOCKED = [
    /crash2\.html/i,
    /error\.html/i,
    /ping\.gif/i,
    /report_issue/i,
    /man88/i,
    /lu88/i,
    /sspp/i,
    /\.ads\./i,
    /adserver/i,
    /preroll/i,
    /ad-overlay/i,
    /ima-ad/i,
    /jwpsrv\.js/i,
    /denied/i,
    /jwpltx\.com/i,  // Block JW Platform tracking
    /prd\.jwpltx/i,   // Block production tracking
    /data:application\/javascript.*debugger/i  // Block data URIs with debugger
  ];

  const ALLOWED = [
    /jwplayer\.js/i,
    /provider\.hlsjs\.js/i,
    /\.m3u8/i,
    /\.ts$/i,
    /\.mp4/i,
    /\.webp$/i,
    /\.woff2?$/i
  ];

  const shouldBlock = (url) => {
    const s = String(url);
    
    // Block data: URIs with specific patterns
    if (s.startsWith('data:')) {
      if (/debugger|crash2|error/i.test(s)) {
        warn('🚫 Blocked malicious data: URI');
        return true;
      }
    }
    
    if (ALLOWED.some(p => p.test(s))) return false;
    return BLOCKED.some(p => p.test(s));
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
      this._blocked = true;
      warn(`🚫 XHR blocked: ${String(url).slice(0, 50)}`);
      return;
    }
    return origOpen.call(this, m, url, ...args);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._blocked) return;
    return origSend.call(this, ...args);
  };

  // Block script injection with data: URIs
  const origCreateElement = document.createElement;
  document.createElement = function(tag, ...args) {
    const el = origCreateElement.call(this, tag, ...args);
    
    if (tag.toLowerCase() === 'script') {
      const srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      
      Object.defineProperty(el, 'src', {
        get: srcDesc.get,
        set(url) {
          if (shouldBlock(url)) {
            warn(`🚫 Script blocked: ${String(url).slice(0, 50)}`);
            return;
          }
          return srcDesc.set.call(this, url);
        }
      });
    }
    
    return el;
  };

  log('🚫 Network blocker active');

  // ============================================================
  // 🎯 GOATEMBED: URL PROTECTION
  // ============================================================
  if (isGoat) {
    const currentUrl = location.href;
    const isBad = /crash2\.html|error\.html/i.test(currentUrl) || 
                  (/\.jpg$/i.test(currentUrl) && !/\/player\//i.test(currentUrl));
    
    if (isBad) {
      warn(`🔴 Bad URL: ${currentUrl}`);
      window.stop();
      
      // Get video ID
      let vid = null;
      
      if (document.referrer) {
        const m = document.referrer.match(/goatembed\.com\/([A-Za-z0-9_-]{8,})/);
        if (m && m[1] !== 'resource' && m[1] !== 'e') {
          vid = m[1];
        }
      }
      
      if (!vid) {
        try {
          vid = sessionStorage.getItem('goat_vid');
        } catch (e) {}
      }
      
      if (vid) {
        const fix = `https://goatembed.com/${vid}?version=1`;
        const count = parseInt(sessionStorage.getItem('goat_redir') || '0');
        
        if (count < 1) {
          sessionStorage.setItem('goat_redir', '1');
          log(`🔄 Redirecting to: ${fix}`);
          setTimeout(() => location.replace(fix), 100);
          throw new Error('Redirecting');
        }
      }
      
      // Show error
      document.open();
      document.write(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Blocked</title><style>
        *{margin:0;padding:0}body{background:#1e293b;color:#fff;font:16px/1.6 system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
        .box{background:#334155;padding:40px;border-radius:16px;text-align:center;max-width:500px}.icon{font-size:60px;margin-bottom:20px}
        h1{font-size:24px;margin-bottom:12px}p{opacity:.9;margin-bottom:8px}.url{background:#1e293b;padding:12px;border-radius:8px;font:12px monospace;word-break:break-all;margin:16px 0}
        button{background:#3b82f6;color:#fff;border:0;padding:12px 24px;border-radius:8px;font:600 14px system-ui;cursor:pointer;margin:8px 4px}
        button:hover{background:#2563eb}
        </style></head><body><div class="box"><div class="icon">🚫</div><h1>URL Blocked</h1>
        <p>RoPhim AdBlock has blocked this page.</p>
        <div class="url">${currentUrl.replace(/</g, '&lt;').slice(0, 100)}</div>
        <button onclick="history.back()">← Back</button>
        ${vid ? `<button onclick="location='https://goatembed.com/${vid}?version=1'">🔄 Reload</button>` : ''}
        </div></body></html>
      `);
      document.close();
      throw new Error('Blocked');
    }
    
    // Clean state
    sessionStorage.removeItem('goat_redir');
    
    // Store ID
    const m = currentUrl.match(/goatembed\.com\/([A-Za-z0-9_-]{8,})/);
    if (m && m[1] !== 'resource' && m[1] !== 'e') {
      try {
        sessionStorage.setItem('goat_vid', m[1]);
      } catch (e) {}
    }
    
    log(`✅ URL OK: ${currentUrl.slice(0, 60)}`);
  }

  // ============================================================
  // 🔒 REDIRECT PROTECTION
  // ============================================================
  if (isGoat || isRophim) {
    let blockCount = 0;
    
    // Hook via descriptor
    try {
      const LocationProto = Object.getPrototypeOf(location);
      
      // Hook href
      const hrefDesc = Object.getOwnPropertyDescriptor(LocationProto, 'href');
      if (hrefDesc && hrefDesc.set) {
        Object.defineProperty(location, 'href', {
          get: hrefDesc.get,
          set(url) {
            if (shouldBlock(url) || isAdDomain(url)) {
              blockCount++;
              warn(`🚫 href blocked (${blockCount}): ${String(url).slice(0, 50)}`);
              return;
            }
            return hrefDesc.set.call(location, url);
          },
          configurable: true
        });
      }
      
      log('🔒 Redirect protection active');
    } catch (e) {
      warn(`Redirect hook failed: ${e.message}`);
    }
    
    // Report
    setTimeout(() => {
      if (blockCount > 0) {
        log(`✅ Blocked ${blockCount} redirects`);
      }
    }, 5000);
  }

  // ============================================================
  // 🎯 ROPHIM: IFRAME MANAGER
  // ============================================================
  if (isRophim) {
    const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
    if (match) {
      try {
        sessionStorage.setItem('rophim_vid', match[0]);
        log(`💾 Stored video ID: ${match[0]}`);
      } catch (e) {}
    }
    
    const getCorrectUrl = () => {
      if (!match) return null;
      const p = new URLSearchParams(location.search);
      return `https://goatembed.com/${match[0]}?version=${p.get('ver')||2}&season=${p.get('s')||1}&episode=${p.get('ep')||1}`;
    };
    
    // Hook createElement
    const origCreate = document.createElement;
    document.createElement = function(tag, ...args) {
      const el = origCreate.call(this, tag, ...args);
      
      if (tag.toLowerCase() === 'iframe') {
        const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
        
        Object.defineProperty(el, 'src', {
          get: srcDesc.get,
          set(url) {
            const s = String(url);
            
            if (shouldBlock(s)) {
              const fix = getCorrectUrl();
              if (fix) {
                warn(`🛡️ Iframe blocked: ${s.slice(0, 50)}`);
                return srcDesc.set.call(this, fix);
              }
              return;
            }
            
            return srcDesc.set.call(this, s);
          }
        });
      }
      
      return el;
    };
    
    log('🛡️ Iframe manager active');
  }

  // ============================================================
  // 🔥 JW PLAYER HOOK - ENHANCED AD BLOCKING
  // ============================================================
  let jwOrig = null;
  let adSkipCount = 0;
  
  Object.defineProperty(window, 'jwplayer', {
    get: () => jwOrig,
    set(val) {
      if (!val || jwOrig) return;
      
      log('🎬 JW Player detected');
      
      jwOrig = function(id) {
        const p = val(id);
        if (!p) return p;
        
        const origSetup = p.setup;
        p.setup = function(cfg) {
          log('⚙️ Player setup intercepted');
          
          if (cfg) {
            // Remove all advertising
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
            
            log('✅ Config cleaned');
          }
          
          const res = origSetup.call(this, cfg);
          
          // AGGRESSIVE ad blocking
          this.playAd = function() {
            adSkipCount++;
            warn(`🚫 playAd() blocked (${adSkipCount})`);
            this.play();
            return this;
          };
          
          this.pauseAd = function() {
            warn('🚫 pauseAd() blocked');
            return this;
          };
          
          this.skipAd = function() {
            warn('⏭️ skipAd() called');
            this.play();
            return this;
          };
          
          // Force skip on any ad event
          const forceSkip = () => {
            setTimeout(() => {
              try {
                adSkipCount++;
                warn(`⏭️ Force skip ad (${adSkipCount})`);
                
                // Multiple skip attempts
                this.skipAd();
                this.play();
                
                // Try to seek past ad if it has duration
                const pos = this.getPosition();
                if (pos < 5) {
                  this.seek(5);
                }
                
                // Set volume to 0 during ad
                const origVol = this.getVolume();
                this.setVolume(0);
                setTimeout(() => this.setVolume(origVol), 100);
              } catch(e) {
                warn(`Skip failed: ${e.message}`);
              }
            }, 10);
          };
          
          // Hook ALL ad events
          this.on('adStarted', forceSkip);
          this.on('adBreakStart', forceSkip);
          this.on('adImpression', forceSkip);
          this.on('adPlay', forceSkip);
          this.on('adRequest', forceSkip);
          this.on('adSchedule', forceSkip);
          this.on('adError', (e) => {
            warn('❌ Ad error - forcing skip');
            forceSkip();
          });
          
          // Log useful events
          this.on('ready', () => log('✅ Player ready'));
          this.on('play', () => log('▶️ Playing'));
          this.on('complete', () => log('✅ Playback complete'));
          
          // Monitor for hidden ads
          this.on('time', (e) => {
            // If player is "playing" but paused, force play
            const state = this.getState();
            if (state === 'paused' && e.position > 0) {
              setTimeout(() => this.play(), 50);
            }
          });
          
          log('✅ Player hooks installed');
          
          return res;
        };
        
        return p;
      };
      
      Object.keys(val).forEach(k => {
        try { jwOrig[k] = val[k]; } catch(e) {}
      });
      
      if (val.prototype) jwOrig.prototype = val.prototype;
      
      log('✅ JW Player fully hooked');
    },
    configurable: true
  });

  // ============================================================
  // 🎨 CSS INJECTION - ENHANCED
  // ============================================================
  const css = document.createElement('style');
  css.textContent = `
    [class*="man88"],[class*="lu88"],[class*="sspp"],
    .denied-box,.ad-overlay,.ima-ad-container,.app-box-fix,
    [class*="preroll"],[class*="ads"]:not(.watch-player),
    .jw-ad,.jw-ad-container,
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
    .watch-player,video,#embed-player,.jwplayer{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
    }
  `;
  (document.head || document.documentElement).appendChild(css);
  log('🎨 CSS injected');

  // ============================================================
  // 🧹 DOM CLEANER - ENHANCED
  // ============================================================
  if (isRophim) {
    const selectors = [
      '[class*="man88"]','[class*="lu88"]','[class*="sspp"]',
      '.denied-box','.ad-overlay','.ima-ad-container','.app-box-fix',
      '[class*="preroll"]','[class*="ads"]:not(.watch-player)',
      '.jw-ad','.jw-ad-container',
      '.modal-backdrop','.fade.modal-backdrop','.modal-backdrop.show',
      'div.fade.modal-backdrop.show',
      '[id*="shadow-root"]','#shadow-root',
      '[class*="backdrop"]','[class*="overlay"]:not(.watch-player)'
    ];

    let count = 0;
    const clean = () => {
      document.querySelectorAll(selectors.join(',')).forEach(el => {
        if (!el.closest('video,#embed-player,.jwplayer,.watch-player')) {
          el.remove();
          count++;
        }
      });
    };

    // Initial clean
    clean();
    
    // Clean every 500ms (more frequent for modals)
    setInterval(clean, 500);
    
    // Observer for new elements
    const obs = new MutationObserver(() => {
      clean();
    });
    obs.observe(document.documentElement, {childList: true, subtree: true});
    
    setTimeout(() => {
      if (count > 0) log(`🧹 Cleaned ${count} ads`);
    }, 5000);
  }

  // ============================================================
  // 🍪 COOKIE TRICK - FORCE DISABLE POPUPS
  // ============================================================
  if (isRophim) {
    // Set cookies to disable popups permanently
    const disablePopups = () => {
      try {
        // Set _popunder_opened_v0.1 to disable popup
        document.cookie = '_popunder_opened_v0.1=1; path=/; max-age=31536000'; // 1 year
        document.cookie = `_popunder_opened_v0.1=1; path=/; domain=.${currentDomain}; max-age=31536000`;
        
        // Set _n_rb_show to disable robong show
        document.cookie = '_n_rb_show=1; path=/; max-age=31536000';
        document.cookie = `_n_rb_show=1; path=/; domain=.${currentDomain}; max-age=31536000`;
        
        // Set _allow_popunder to 0 to disable
        document.cookie = '_allow_popunder=0; path=/; max-age=31536000';
        document.cookie = `_allow_popunder=0; path=/; domain=.${currentDomain}; max-age=31536000`;
        
        // Additional popup blocking cookies
        document.cookie = '_popup_blocked=1; path=/; max-age=31536000';
        document.cookie = '_ad_blocked=1; path=/; max-age=31536000';
        
        log('🍪 Popup cookies set to disable');
      } catch (e) {
        warn(`Cookie trick failed: ${e.message}`);
      }
    };
    
    // Set immediately
    disablePopups();
    
    // Set again after 1 second to ensure it sticks
    setTimeout(disablePopups, 1000);
    
    // Monitor and re-set if needed
    setInterval(() => {
      const hasPopupCookie = document.cookie.includes('_popunder_opened_v0.1=1');
      if (!hasPopupCookie) {
        disablePopups();
        log('🔄 Re-applied popup disable cookies');
      }
    }, 5000);
    
    log('🍪 Cookie trick active');
  }

  // ============================================================
  // 🚫 POPUP BLOCKER
  // ============================================================
  window.open = () => {
    warn('🚫 Popup blocked');
    return null;
  };

  // ============================================================
  // ✅ INIT COMPLETE
  // ============================================================
  log('🟢 AdBlock active');
})();