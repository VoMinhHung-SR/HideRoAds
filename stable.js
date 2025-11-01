// ============================================================
// 🛡️ ROPHIM ADBLOCK - REFACTORED VERSION
// ============================================================
(() => {
    'use strict';
  
    const isGoat = /goatembed\./i.test(location.hostname);
    const isRophim = /rophim\./i.test(location.hostname);
    if (!isGoat && !isRophim) return;
  
    const log = msg => console.log(`✅ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
    const warn = msg => console.warn(`⚠️ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
    const debug = msg => console.log(`🔍 [DEBUG] ${msg}`);
  
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
    // 🚫 NETWORK INTERCEPTOR
    // ============================================================
    const BLOCKED_PATTERNS = [
      /crash2\.html/i, /error\.html/i, /report_issue/i,
      /man88/i, /lu88/i, /sspp/i, /robong\./i, /\.ads\./i, /adserver/i,
      /ad-overlay/i, /ima-ad/i, /jwpsrv\.js/i, /denied/i,
      /jwpltx\.com/i, /prd\.jwpltx/i, /doubleclick\./i, /googlesyndication\./i
    ];
  
    const isCVTAd = (url) => {
      const s = String(url);
      return /\/pmolink\//i.test(s) || /\/vpromolink\//i.test(s) || 
             /\/ad\//i.test(s) || /\/ads\//i.test(s) || /\/promo\//i.test(s);
    };
  
    const shouldBlock = (url) => {
      const s = String(url);
      if (isCVTAd(s)) {
        warn(`🚫 CVT ad blocked: ${s.slice(0, 80)}...`);
        return true;
      }
      if (s.endsWith('.m3u8') || s.endsWith('.ts')) return false;
      return BLOCKED_PATTERNS.some(p => p.test(s));
    };
  
    // Fetch & XHR hooks
    const origFetch = window.fetch;
    window.fetch = function(url, ...args) {
      if (shouldBlock(url)) {
        warn(`🚫 Fetch blocked: ${String(url).slice(0, 50)}...`);
        return Promise.resolve(new Response('', {status: 204}));
      }
      return origFetch.call(this, url, ...args);
    };
  
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
              // Remove ad configs
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
                
                console.log(`🚀 FORCE SKIP - Position: ${pos}s, Duration: ${dur}s`);
                
                if (playlist && playlist.length > currentIndex + 1) {
                  this.playlistItem(currentIndex + 1);
                  console.log('✅ FORCE SKIP: Jumped to next playlist item');
                  return true;
                }
                
                if (dur > 0) {
                  const seekTo = Math.min(dur - 0.5, 15);
                  this.seek(seekTo);
                  console.log(`✅ FORCE SKIP: Seeked to ${seekTo}s`);
                  return true;
                }
                
                this.play();
                this.setMute(false);
                console.log('✅ FORCE SKIP: Force play activated');
                return true;
              } catch(e) {
                console.error('❌ FORCE SKIP ERROR:', e.message);
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
                  warn(`🚀 ULTRA FAST SKIP - Ad detected (${dur}s) - IMMEDIATE ACTION`);
                  
                  const playlist = this.getPlaylist(), currentIndex = this.getPlaylistIndex();
                  
                  if (playlist && playlist.length > currentIndex + 1) {
                    this.playlistItem(currentIndex + 1);
                    warn('⚡ INSTANT: Jumped to next playlist item');
                  } else if (dur > 0) {
                    this.seek(Math.min(dur - 0.1, 15));
                    warn(`⚡ INSTANT: Seeked to end`);
                  } else {
                    this.play();
                    this.setMute(false);
                    warn('⚡ INSTANT: Force play');
                  }
                  
                  adSkipped = true;
                  skipInProgress = false;
                  setTimeout(() => { adSkipped = false; skipInProgress = false; }, 3000);
                }
                
                if (state !== 'playing') this.play();
                if (this.getMute()) this.setMute(false);
                
              } catch(e) {
                skipInProgress = false;
                debug(`❌ Ultra fast skip error: ${e.message}`);
              }
            };
            
            // Event listeners
            ['playlistItem', 'ready', 'time', 'adPlay', 'adBreakStart', 'instreamMode'].forEach(event => {
              this.on(event, () => {
                if (['adPlay', 'adBreakStart', 'instreamMode'].includes(event)) {
                  debug(`🚫 ${event.toUpperCase()} - IMMEDIATE SKIP`);
                }
                ultraFastSkip();
              });
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
      log('🎨 Enhanced CSS injected');
    };
  
    injectCSS();
  
    if (isRophim) {
      let count = 0;
      
      const clean = () => {
        const foundAds = document.querySelectorAll(AD_SELECTORS.join(','));
        
        if (foundAds.length > 0) {
          debug(`🧹 FOUND ${foundAds.length} AD ELEMENTS`);
          foundAds.forEach((el, index) => {
            debug(`🧹 AD ELEMENT ${index + 1}: ${el.tagName}.${el.className} - ${el.id || 'no-id'}`);
          });
        }
        
        foundAds.forEach(el => {
          if (!el.closest('video,#embed-player,.jwplayer,.watch-player')) {
            debug(`🗑️ REMOVING AD ELEMENT: ${el.tagName}.${el.className}`);
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
              debug(`🗑️ REMOVING HIGH Z-INDEX ELEMENT: z-index=${zIndex}`);
              el.remove();
              count++;
            }
          }
        });
      };
  
      clean();
      setInterval(clean, 500);
      
      const obs = new MutationObserver((mutations) => {
        let hasAdElements = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              AD_SELECTORS.forEach(selector => {
                if (node.matches && node.matches(selector)) {
                  debug(`🆕 NEW AD ELEMENT DETECTED: ${node.tagName}.${node.className}`);
                  hasAdElements = true;
                }
              });
            }
          });
        });
        
        if (hasAdElements) {
          debug(`🔄 MUTATION DETECTED - Running clean`);
          clean();
        }
      });
      
      obs.observe(document.documentElement, {childList: true, subtree: true});
      
      setTimeout(() => {
        if (count > 0) log(`🧹 Cleaned ${count} ads`);
      }, 5000);
    }
  
    // ============================================================
    // 🚫 POPUP/ALERT BLOCKER & DOM SKIP
    // ============================================================
    window.open = () => null;
    window.alert = () => {};
    window.confirm = () => false;
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop,[class*="backdrop"]').forEach(el => el.remove());
      }
    }, true);
  
    // Ultra fast DOM-based skip (Backup system)
    const ultraFastDomSkip = () => {
      const skipButton = document.querySelector('.jw-skip, .jw-skip-button, [class*="skip"]');
      if (skipButton && skipButton.offsetParent !== null) {
        const text = skipButton.textContent?.trim();
        if (text === 'Bỏ qua' || skipButton.classList.contains('jw-skippable') || text.includes('Skip')) {
          debug(`⚡ DOM SKIP: Auto-clicking skip button`);
          skipButton.click();
          return true;
        }
      }
      
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        const duration = video.duration, currentTime = video.currentTime;
        
        if (duration < 60 && duration > 0 && currentTime < 3) {
          debug(`⚡ DOM SKIP: Short video detected (${duration}s) - IMMEDIATE SEEK`);
          video.currentTime = Math.max(duration - 0.1, 0);
          
          const jwPlayer = window.jwplayer();
          if (jwPlayer && typeof jwPlayer.playlistItem === 'function') {
            try {
              const playlist = jwPlayer.getPlaylist(), currentIndex = jwPlayer.getPlaylistIndex();
              if (playlist && playlist.length > currentIndex + 1) {
                jwPlayer.playlistItem(currentIndex + 1);
                debug(`⚡ DOM SKIP: Jumped to next playlist item`);
              }
            } catch(e) {
              debug(`❌ DOM skip failed: ${e.message}`);
            }
          }
          return true;
        }
      }
      return false;
    };
      
    setInterval(ultraFastDomSkip, 200);
    log('🟢 AdBlock active - Lightweight mode (CVT ads blocked, all .m3u8 visible)');
  })();