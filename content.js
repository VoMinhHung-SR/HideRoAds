// ============================================================
// 🛡️ ROPHIM ADBLOCK - ULTIMATE FIX V3
// ============================================================
(() => {
  'use strict';

  const isGoat = /goatembed\./i.test(location.hostname);
  const isRophim = /rophim\./i.test(location.hostname);
  
  if (!isGoat && !isRophim) return;

  const log = msg => console.log(`✅ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);
  const warn = msg => console.warn(`⚠️ [${isGoat ? 'Goat' : 'RoPhim'}] ${msg}`);

  // ============================================================
  // 🚨 GOATEMBED: INSTANT URL CHECK
  // ============================================================
  if (isGoat) {
    const currentUrl = location.href;
    // More precise bad URL detection - exclude player resource URLs
    const isBadUrl = /crash2\.html|error\.html|resource\/crash|resource\/error/i.test(currentUrl) || 
                     (/\.jpg$/i.test(currentUrl) && !/\/player\/|\/v1\/|\/resource\/embed/i.test(currentUrl));
    
    // Extract video ID from current URL if possible
    const getVideoId = (url) => {
      const match = url.match(/goatembed\.com\/([A-Za-z0-9_-]{8,})/);
      return match && match[1] !== 'resource' ? match[1] : null;
    };
    
    const currentVideoId = getVideoId(currentUrl);
    
    if (isBadUrl) {
      warn(`🔴 BAD URL detected: ${currentUrl}`);
      
      // Stop page loading
      window.stop();
      
      // Try to get video ID from various sources
      let videoId = null;
      
      // 1. From session storage (set by parent)
      try {
        videoId = sessionStorage.getItem('rophim_video_id');
        if (videoId) log(`📦 Got video ID from storage: ${videoId}`);
      } catch (e) {}
      
      // 2. From URL parameters
      if (!videoId) {
        const params = new URLSearchParams(location.search);
        videoId = params.get('id') || params.get('v');
        if (videoId) log(`🔗 Got video ID from params: ${videoId}`);
      }
      
      // 3. From document.referrer
      if (!videoId && document.referrer) {
        videoId = getVideoId(document.referrer);
        if (videoId) log(`↩️ Got video ID from referrer: ${videoId}`);
      }
      
      // 4. From current URL (if it has one before crash2)
      if (!videoId) {
        videoId = currentVideoId;
        if (videoId) log(`🎯 Got video ID from current URL: ${videoId}`);
      }
      
      // If we have video ID, redirect
      if (videoId) {
        const correctUrl = `https://goatembed.com/${videoId}?version=1`;
        
        // Prevent infinite loop
        const redirectKey = 'rophim_redirect_attempt';
        const attempts = parseInt(sessionStorage.getItem(redirectKey) || '0');
        
        if (attempts >= 3) {
          warn('🛑 Too many redirect attempts - showing error');
        } else {
          sessionStorage.setItem(redirectKey, String(attempts + 1));
          log(`🔄 REDIRECT (attempt ${attempts + 1}): ${correctUrl}`);
          
          // Use replace to avoid history
          location.replace(correctUrl);
          
          // Block everything
          throw new Error('Redirecting...');
        }
      }
      
      // Can't fix - show error page
      warn('🛑 Cannot determine video ID - showing error');
      showErrorPage(currentUrl);
      throw new Error('Bad URL blocked');
    }
    
    // URL is clean - clear redirect counter
    try {
      sessionStorage.removeItem('rophim_redirect_attempt');
      sessionStorage.setItem('rophim_video_id', currentVideoId || '');
    } catch (e) {}
    
    log(`✅ URL is clean: ${currentUrl}`);
  }

  // ============================================================
  // 🖼️ ERROR PAGE
  // ============================================================
  function showErrorPage(blockedUrl) {
    document.open();
    document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Blocked by RoPhim AdBlock</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: #fff;
            font-family: -apple-system, system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            text-align: center;
            max-width: 600px;
            background: rgba(0,0,0,0.3);
            padding: 40px;
            border-radius: 16px;
            backdrop-filter: blur(10px);
          }
          .icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: shake 0.5s infinite;
          }
          @keyframes shake {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }
          h1 {
            font-size: 32px;
            margin-bottom: 16px;
            font-weight: 700;
          }
          p {
            font-size: 16px;
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 12px;
          }
          .url {
            background: rgba(0,0,0,0.4);
            padding: 12px;
            border-radius: 8px;
            word-break: break-all;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            margin: 20px 0;
            border-left: 4px solid #ef4444;
          }
          button {
            background: #fff;
            color: #dc2626;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.2s;
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255,255,255,0.3);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🚫</div>
          <h1>Invalid URL Blocked</h1>
          <p>This page attempted to load an advertising or error page.</p>
          <p><strong>RoPhim AdBlock</strong> has blocked it to protect your experience.</p>
          <div class="url">${blockedUrl.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <button onclick="window.parent.postMessage({type:'rophim_reload'}, '*')">🔄 Reload Video</button>
          <button onclick="window.history.back()" style="margin-left: 10px;">← Go Back</button>
        </div>
      </body>
      </html>
    `);
    document.close();
  }

  // ============================================================
  // 🔒 REDIRECT PROTECTION (Goatembed)
  // ============================================================
  if (isGoat) {
    const originalUrl = location.href;
    let blockCount = 0;
    
    const blockRedirect = (method, url) => {
      // Don't block player resource URLs
      if (/\/player\/|\/v1\/|\/resource\/embed|U10BA1JTB1NXAVABU1JTVVcAA1dQBIED/i.test(url)) {
        return null; // Allow
      }
      blockCount++;
      warn(`🚫 BLOCKED ${method}(${blockCount}): ${url.substring(0, 80)}`);
      return false;
    };
    
    // Hook all redirect methods
    const origReplace = location.replace.bind(location);
    location.replace = function(url) {
      const urlStr = String(url);
      // Allow player resources
      if (/\/player\/|\/v1\/|\/resource\/embed|U10BA1JTB1NXAVABU1JTVVcAA1dQBIED/i.test(urlStr)) {
        return origReplace(urlStr);
      }
      if (/crash2|error|resource\/(?!embed)|\.jpg$/i.test(urlStr)) {
        return blockRedirect('replace', urlStr);
      }
      return origReplace(urlStr);
    };
    
    const origAssign = location.assign.bind(location);
    location.assign = function(url) {
      const urlStr = String(url);
      if (/crash2|error|resource\/(?!embed)|\.jpg$/i.test(urlStr)) {
        return blockRedirect('assign', urlStr);
      }
      return origAssign(urlStr);
    };
    
    const hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    Object.defineProperty(location, 'href', {
      get: hrefDesc.get,
      set(url) {
        const urlStr = String(url);
        if (/crash2|error|resource\/(?!embed)|\.jpg$/i.test(urlStr)) {
          blockRedirect('href', urlStr);
          return;
        }
        return hrefDesc.set.call(this, urlStr);
      }
    });
    
    log('🔒 Redirect protection active');
    
    // Report status to parent
    setTimeout(() => {
      log(`✅ Protected - blocked ${blockCount} redirects`);
      try {
        window.parent.postMessage({
          type: 'rophim_status',
          blocked: blockCount,
          url: location.href
        }, '*');
      } catch (e) {}
    }, 5000);
  }

  // ============================================================
  // 🎯 ROPHIM: IFRAME MANAGER
  // ============================================================
  if (isRophim) {
    // Listen for messages from iframe
    window.addEventListener('message', (e) => {
      if (e.data.type === 'rophim_reload') {
        log('🔄 Reload requested from iframe');
        location.reload();
      }
      
      if (e.data.type === 'rophim_status') {
        log(`📊 Iframe status: blocked ${e.data.blocked} redirects`);
      }
    });
    
    // Store video ID for iframe
    const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
    if (match) {
      try {
        sessionStorage.setItem('rophim_video_id', match[0]);
        log(`💾 Stored video ID: ${match[0]}`);
      } catch (e) {}
    }
    
    // Get correct iframe URL
    const getCorrectUrl = () => {
      if (!match) return null;
      const params = new URLSearchParams(location.search);
      return `https://goatembed.com/${match[0]}?version=${params.get('ver')||1}&season=${params.get('s')||1}&episode=${params.get('ep')||1}`;
    };
    
    // Hook iframe creation
    const origCreate = document.createElement;
    document.createElement = function(tag, ...args) {
      const el = origCreate.call(this, tag, ...args);
      
      if (tag.toLowerCase() === 'iframe') {
        log('🎬 Iframe created - installing protections');
        
        const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
        
        Object.defineProperty(el, 'src', {
          get: srcDesc.get,
          set(url) {
            const urlStr = String(url);
            
            // Block bad URLs
            if (/crash2|error|resource\/(?!embed)|\.jpg$/i.test(urlStr)) {
              const correct = getCorrectUrl();
              if (correct) {
                warn(`🛡️ Blocked iframe hijack: ${urlStr.substring(0, 60)}`);
                log(`✅ Redirected to: ${correct}`);
                return srcDesc.set.call(this, correct);
              }
            }
            
            // Fix wrong video ID
            if (/goatembed\.com/i.test(urlStr) && match) {
              if (!urlStr.includes(match[0])) {
                const correct = getCorrectUrl();
                if (correct) {
                  warn(`🔧 Fixed wrong video ID in iframe`);
                  return srcDesc.set.call(this, correct);
                }
              }
            }
            
            return srcDesc.set.call(this, urlStr);
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
  let hooked = false;
  
  Object.defineProperty(window, 'jwplayer', {
    get: () => jwOrig,
    set(val) {
      if (!val || hooked) return;
      hooked = true;
      
      log('🎬 JW Player detected');
      
      jwOrig = function(id) {
        const player = val(id);
        if (!player) return player;
        
        const origSetup = player.setup;
        player.setup = function(cfg) {
          log('⚙️ Player setup intercepted');
          
          if (cfg) {
            // Remove ads
            delete cfg.advertising;
            if (cfg.playlist) {
              cfg.playlist = cfg.playlist.map(item => {
                delete item.adschedule;
                delete item.advertising;
                return item;
              });
            }
            cfg.autostart = true;
            log('✅ Cleaned config');
          }
          
          const result = origSetup.call(this, cfg);
          
          // Override ad methods
          this.playAd = () => { log('🚫 playAd blocked'); this.play(); return this; };
          this.pauseAd = () => { log('🚫 pauseAd blocked'); return this; };
          this.skipAd = () => { log('⏭️ skipAd called'); this.play(); return this; };
          
          // Auto-skip
          const skip = () => {
            setTimeout(() => {
              try { this.skipAd(); this.play(); } catch(e) {}
            }, 50);
          };
          
          this.on('adStarted', skip);
          this.on('adBreakStart', skip);
          this.on('adImpression', skip);
          this.on('adError', () => { log('❌ Ad error'); skip(); });
          
          this.on('ready', () => log('✅ Player ready'));
          
          return result;
        };
        
        return player;
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
  // 🧹 CONTENT PROTECTION (RoPhim)
  // ============================================================
  if (isRophim) {
    // Kill Service Workers
    (async () => {
      if (!navigator.serviceWorker) return;
      
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        warn(`🔥 Killing ${regs.length} service workers`);
        await Promise.all(regs.map(r => r.unregister()));
        log('✅ Service workers killed');
      }
      
      // Block new registrations
      const orig = navigator.serviceWorker.register;
      navigator.serviceWorker.register = () => {
        warn('🚫 Service Worker registration blocked');
        return Promise.reject(new Error('Blocked by AdBlock'));
      };
    })();

    // Network blocker - UPDATED to allow player resources
    const BAD = /crash2|error|man88|lu88|report_issue|\.ads\.|adserver|catfish|sspp|preroll|ad-overlay|ima-ad/i;
    const ALLOW = /\/player\/|\/v1\/|\/resource\/embed|goatembed\.com\/v1\/player/i;
    
    const origFetch = window.fetch;
    window.fetch = function(url, ...args) {
      const urlStr = String(url);
      if (BAD.test(urlStr) && !ALLOW.test(urlStr)) {
        log(`🚫 Blocked fetch: ${urlStr.substring(0, 50)}`);
        return Promise.resolve(new Response('', {status: 204}));
      }
      return origFetch.call(this, url, ...args);
    };
    
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, url, ...args) {
      if (BAD.test(url)) {
        this._blocked = true;
        log(`🚫 Blocked XHR: ${url.substring(0, 50)}`);
        return;
      }
      return origOpen.call(this, m, url, ...args);
    };
    
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._blocked) return;
      return origSend.call(this, ...args);
    };

    // CSS injection
    const style = document.createElement('style');
    style.textContent = `
      [class*="man88"], [class*="lu88"], [class*="sspp"],
      .denied-box, .ad-overlay, .ima-ad-container,
      [class*="preroll"], [class*="ads"]:not(.watch-player),
      .jw-ad, .jw-ad-container { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Popup blocker
    window.open = () => { log('🚫 Blocked popup'); return null; };

    // DOM cleaner
    const clean = () => {
      const sel = '[class*="man88"],[class*="lu88"],[class*="sspp"],.denied-box,.ad-overlay';
      document.querySelectorAll(sel).forEach(el => {
        if (!el.closest('video,#embed-player,.jwplayer')) el.remove();
      });
    };

    setInterval(clean, 2000);
    
    const obs = new MutationObserver(clean);
    obs.observe(document.documentElement, { childList: true, subtree: true });

    log('✅ Content protection active');
  }

  log('🟢 All systems online');
})();