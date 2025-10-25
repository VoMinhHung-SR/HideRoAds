// ============================================================
// 🛡️ ROPHIM ADBLOCK - SMART SKIP VERSION
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
  // 🚫 SMART NETWORK INTERCEPTOR
  // ============================================================
  const BLOCKED_PATTERNS = [
    // Crash/Error pages
    /crash2\.html/i, /error\.html/i, /report_issue/i,
    
    // Ad domains (non-streaming)
    /man88/i, /lu88/i, /sspp/i, /robong\./i,
    /\.ads\./i, /adserver/i, /ad-overlay/i,
    /ima-ad/i, /jwpsrv\.js/i, /denied/i,
    
    // JWP tracking
    /jwpltx\.com/i, /prd\.jwpltx/i,
    
    // Google ads
    /doubleclick\./i, /googlesyndication\./i
  ];

  // ⭐ Check if CVT ad request
  const isCVTAd = (url) => {
    const s = String(url);
    return /cvt\.finallygotthexds\.site/i.test(s) && /\/pmolink\//i.test(s);
  };

  // ⭐ Check if content request
  const isContentStream = (url) => {
    const s = String(url);
    return /sundaythekingplays\.site/i.test(s) && /\/hls\//i.test(s);
  };

  const shouldBlock = (url) => {
    const s = String(url);
    
    // NEVER block content streams
    if (isContentStream(s)) {
      return false;
    }
    
    // NEVER block .m3u8 or .ts files (HLS segments)
    if (s.endsWith('.m3u8') || s.endsWith('.ts')) {
      return false;
    }
    
    // Block non-streaming patterns
    return BLOCKED_PATTERNS.some(p => p.test(s));
  };

  // ⭐ FAKE SUCCESS for CVT ads - make it think ads loaded
  const createFakeM3U8Response = () => {
    // Minimal valid HLS playlist that completes immediately
    const fakePlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:1
#EXTINF:0.1,
#EXT-X-ENDLIST`;
    
    return new Response(fakePlaylist, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Length': fakePlaylist.length.toString(),
        'Access-Control-Allow-Origin': '*'
      }
    });
  };

  // Fetch hook with smart handling
  const origFetch = window.fetch;
  window.fetch = async function(url, ...args) {
    const urlStr = String(url);
    
    // Block non-streaming ads
    if (shouldBlock(urlStr)) {
      warn(`🚫 Blocked: ${urlStr.slice(0, 50)}...`);
      return Promise.resolve(new Response('', {status: 204}));
    }
    
    // ⭐ Intercept CVT ad requests - return fake success
    if (isCVTAd(urlStr)) {
      warn(`🎯 CVT ad intercepted - returning fake success: ${urlStr.slice(0, 60)}...`);
      
      // Return fake but valid HLS response
      if (urlStr.endsWith('.m3u8')) {
        return Promise.resolve(createFakeM3U8Response());
      }
      
      // For .ts segments, return empty but valid
      return Promise.resolve(new Response(new Uint8Array(0), {
        status: 200,
        headers: {
          'Content-Type': 'video/MP2T',
          'Content-Length': '0'
        }
      }));
    }
    
    // ⭐ Log content requests (for debugging)
    if (isContentStream(urlStr)) {
      log(`📺 Content loading: ${urlStr.slice(0, 80)}...`);
    }
    
    // Allow everything else
    return origFetch.call(this, url, ...args);
  };

  // XHR hook with same logic
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(m, url, ...args) {
    const urlStr = String(url);
    
    this._url = urlStr;
    this._isCVTAd = isCVTAd(urlStr);
    this._isBlocked = shouldBlock(urlStr) && !this._isCVTAd;
    
    if (this._isBlocked) {
      warn(`🚫 XHR blocked: ${urlStr.slice(0, 50)}...`);
      return;
    }
    
    if (this._isCVTAd) {
      warn(`🎯 CVT ad XHR intercepted: ${urlStr.slice(0, 60)}...`);
    }
    
    return origOpen.call(this, m, url, ...args);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._isBlocked) return;
    
    // ⭐ Fake response for CVT ads
    if (this._isCVTAd) {
      setTimeout(() => {
        Object.defineProperty(this, 'status', { value: 200, writable: false });
        Object.defineProperty(this, 'statusText', { value: 'OK', writable: false });
        Object.defineProperty(this, 'readyState', { value: 4, writable: false });
        
        if (this._url.endsWith('.m3u8')) {
          Object.defineProperty(this, 'responseText', { 
            value: '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ENDLIST', 
            writable: false 
          });
        } else {
          Object.defineProperty(this, 'response', { value: new Uint8Array(0), writable: false });
        }
        
        if (this.onload) this.onload();
        if (this.onreadystatechange) this.onreadystatechange();
      }, 10);
      return;
    }
    
    return origSend.call(this, ...args);
  };

  log('🚫 Smart network interceptor active');

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
  // 🔥 JW PLAYER HOOK - INTELLIGENT SKIP
  // ============================================================
  let jwOrig = null;
  let playerInstance = null;
  let adSkipped = false;
  
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
            // Remove ad configs
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
            warn('❌ playAd blocked');
            this.play();
            return this;
          };
          
          this.pauseAd = function() {
            return this;
          };
          
          this.skipAd = function() { 
            this.play();
            return this;
          };
          
          // ⭐ Smart skip logic
          const smartSkip = () => {
            try {
              const pos = this.getPosition();
              const dur = this.getDuration();
              
              // If at beginning and short duration (likely ad), skip ahead
              if (pos < 3 && dur < 30 && !adSkipped) {
                warn(`⏭️ Detected short content (${dur}s) - skipping to real content`);
                
                // Try to skip to next playlist item or seek forward
                const playlist = this.getPlaylist();
                const currentIndex = this.getPlaylistIndex();
                
                if (playlist && playlist.length > currentIndex + 1) {
                  this.playlistItem(currentIndex + 1);
                  warn('✅ Jumped to next playlist item');
                } else {
                  this.seek(Math.min(5, dur - 0.5));
                  warn('✅ Seeked forward');
                }
                
                adSkipped = true;
                
                // Reset flag after content starts
                setTimeout(() => { adSkipped = false; }, 5000);
              }
              
              // Ensure playing
              if (this.getState() !== 'playing' && pos > 0) {
                this.play();
              }
              
              // Unmute
              if (this.getMute()) {
                this.setMute(false);
              }
            } catch(e) {}
          };
          
          // Listen to events
          this.on('playlistItem', () => {
            warn('📺 Playlist item changed');
            setTimeout(smartSkip, 500);
          });
          
          this.on('ready', () => {
            warn('✅ Player ready');
            setTimeout(() => {
              this.play();
              this.setMute(false);
              smartSkip();
            }, 300);
          });
          
          this.on('time', () => {
            const pos = this.getPosition();
            const dur = this.getDuration();
            
            // Continuously check if stuck on short content
            if (pos < 3 && dur < 30 && dur > 0) {
              smartSkip();
            }
          });
          
          // Initial skip
          setTimeout(smartSkip, 800);
          
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
      
      body.modal-open{
        overflow:auto!important;
        padding-right:0!important;
      }
      
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
  log('🟢 Smart AdBlock activated');
})();