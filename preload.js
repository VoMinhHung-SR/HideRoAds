// ============================================================
// 🎯 PRELOAD - PREVENT REDIRECTS + JW PLAYER HOOK
// ============================================================
(() => {
  'use strict';

  const isRophim = /rophim\./i.test(location.hostname);
  const isGoatembed = /goatembed\./i.test(location.hostname);
  
  if (!isRophim && !isGoatembed) return;

  const log = msg => console.log(`✅ [${isGoatembed ? 'Goat' : 'RoPhim'}] ${msg}`);

  // ============================================================
  // 🛡️ PREVENT REDIRECTS (goatembed.com only)
  // ============================================================
  if (isGoatembed) {
    const originalHref = location.href;
    log(`🔒 Original URL: ${originalHref}`);
    
    // Check if current URL is bad
    const isBadUrl = /crash2\.html|error\.html|\.jpg$/i.test(originalHref);
    
    if (isBadUrl) {
      log(`🚫 BAD URL detected on load`);
      
      // Try to extract video ID and redirect
      const match = originalHref.match(/goatembed\.com\/([A-Za-z0-9_-]+)/);
      if (match) {
        const videoId = match[1];
        if (videoId !== 'resource') {
          const correctUrl = `https://goatembed.com/${videoId}?version=1`;
          log(`🔄 Redirecting to: ${correctUrl}`);
          location.replace(correctUrl);
          return;
        }
      }
      
      // If can't redirect, try parent
      try {
        const parentPath = window.top.location.pathname;
        const parentMatch = parentPath.match(/([A-Za-z0-9_-]{8,})/);
        
        if (parentMatch) {
          const videoId = parentMatch[1];
          const correctUrl = `https://goatembed.com/${videoId}?version=1`;
          log(`🔄 Redirecting from parent: ${correctUrl}`);
          location.replace(correctUrl);
          return;
        }
      } catch (e) {}
      
      // Show error
      log('🛑 Showing error page');
      document.open();
      document.write(`
        <html>
          <head><title>Blocked</title></head>
          <body style="margin:0;background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="text-align:center;">
              <h1>🚫 Invalid URL</h1>
              <p>This page was blocked by RoPhim AdBlock</p>
              <small>${originalHref}</small>
            </div>
          </body>
        </html>
      `);
      document.close();
      return;
    }
    
    // HOOK location to prevent redirects
    let redirectBlocked = 0;
    
    // Hook location.replace
    const originalReplace = location.replace.bind(location);
    location.replace = function(url) {
      const urlStr = url.toString();
      
      if (/crash2\.html|error\.html|\.jpg$/i.test(urlStr)) {
        redirectBlocked++;
        log(`🚫 BLOCKED location.replace(${redirectBlocked}): ${urlStr}`);
        return;
      }
      
      log(`✅ Allow location.replace: ${urlStr}`);
      return originalReplace(url);
    };
    
    // Hook location.href setter
    const locationDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    Object.defineProperty(location, 'href', {
      get: locationDesc.get,
      set: function(url) {
        const urlStr = url.toString();
        
        if (/crash2\.html|error\.html|\.jpg$/i.test(urlStr)) {
          redirectBlocked++;
          log(`🚫 BLOCKED location.href(${redirectBlocked}): ${urlStr}`);
          return;
        }
        
        log(`✅ Allow location.href: ${urlStr}`);
        return locationDesc.set.call(this, url);
      }
    });
    
    // Hook window.location
    try {
      const windowLocationDesc = Object.getOwnPropertyDescriptor(window, 'location');
      if (windowLocationDesc && windowLocationDesc.set) {
        Object.defineProperty(window, 'location', {
          get: windowLocationDesc.get,
          set: function(url) {
            const urlStr = url.toString();
            
            if (/crash2\.html|error\.html|\.jpg$/i.test(urlStr)) {
              redirectBlocked++;
              log(`🚫 BLOCKED window.location(${redirectBlocked}): ${urlStr}`);
              return;
            }
            
            log(`✅ Allow window.location: ${urlStr}`);
            return windowLocationDesc.set.call(this, url);
          }
        });
      }
    } catch (e) {}
    
    // Hook assign
    const originalAssign = location.assign.bind(location);
    location.assign = function(url) {
      const urlStr = url.toString();
      
      if (/crash2\.html|error\.html|\.jpg$/i.test(urlStr)) {
        redirectBlocked++;
        log(`🚫 BLOCKED location.assign(${redirectBlocked}): ${urlStr}`);
        return;
      }
      
      log(`✅ Allow location.assign: ${urlStr}`);
      return originalAssign(url);
    };
    
    log('🛡️ Redirect protection installed');
    
    // Monitor for 10 seconds
    setTimeout(() => {
      log(`✅ Protection ended - blocked ${redirectBlocked} redirects`);
    }, 10000);
  }

  // ============================================================
  // 🔥 JW PLAYER HOOK
  // ============================================================
  let jwplayerOriginal = null;
  let hookInstalled = false;
  
  const installHook = () => {
    if (hookInstalled) return;
    hookInstalled = true;
    
    Object.defineProperty(window, 'jwplayer', {
      get() {
        return jwplayerOriginal;
      },
      set(value) {
        if (!value) return;
        
        log('🎬 JW Player library loaded');
        
        // Wrap jwplayer function
        jwplayerOriginal = function(id) {
          const player = value(id);
          if (!player) return player;
          
          // Hook setup method
          const originalSetup = player.setup;
          player.setup = function(config) {
            log('🔧 Player setup intercepted');
            
            if (config) {
              // Remove advertising
              if (config.advertising) {
                delete config.advertising;
                log('🚫 Removed advertising');
              }
              
              // Clean playlist
              if (config.playlist) {
                config.playlist = config.playlist.map(item => {
                  if (item.adschedule) delete item.adschedule;
                  if (item.advertising) delete item.advertising;
                  return item;
                });
                log('🚫 Cleaned playlist');
              }
              
              config.autostart = true;
              log('✅ Set autostart');
            }
            
            const result = originalSetup.call(this, config);
            
            // Override ad methods
            this.playAd = () => {
              log('🚫 playAd() blocked');
              this.play();
              return this;
            };
            
            this.pauseAd = () => {
              log('🚫 pauseAd() blocked');
              return this;
            };
            
            this.skipAd = () => {
              log('⏭️ skipAd() called');
              this.play();
              return this;
            };
            
            // Events
            this.on('ready', () => log('✅ Player ready'));
            this.on('play', () => log('▶️ Playing'));
            this.on('pause', () => log('⏸️ Paused'));
            this.on('error', (e) => log('❌ Error:', e.message || 'unknown'));
            
            // Auto-skip ads
            const skipAd = () => {
              log('🚫 Ad detected - skipping');
              setTimeout(() => {
                try {
                  this.skipAd();
                  this.play();
                } catch (e) {}
              }, 50);
            };
            
            this.on('adStarted', skipAd);
            this.on('adBreakStart', skipAd);
            this.on('adImpression', skipAd);
            this.on('adError', (e) => {
              log('❌ Ad error - skipping');
              this.skipAd();
            });
            
            log('✅ Player setup complete');
            return result;
          };
          
          return player;
        };
        
        // Copy properties
        Object.keys(value).forEach(key => {
          try { jwplayerOriginal[key] = value[key]; } catch (e) {}
        });
        
        if (value.prototype) {
          jwplayerOriginal.prototype = value.prototype;
        }
        
        log('✅ JW Player hook installed');
      },
      configurable: true,
      enumerable: true
    });
  };

  installHook();
  log('🟢 Hook ready');

  // ============================================================
  // 🔍 MONITOR
  // ============================================================
  const isInIframe = window !== window.top;
  log(`📍 Context: ${isInIframe ? 'IFRAME' : 'MAIN'}`);
  
  // Check for jwplayer
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    checkCount++;
    
    if (window.jwplayer && typeof window.jwplayer === 'function') {
      log(`✅ jwplayer found after ${checkCount * 200}ms`);
      clearInterval(checkInterval);
      return;
    }
    
    if (checkCount >= 30) {
      log('⚠️ jwplayer not loaded after 6s');
      
      // Debug info
      const scripts = document.querySelectorAll('script[src]');
      if (scripts.length === 0) {
        log('⚠️ NO SCRIPTS - page may be hijacked!');
      } else {
        log(`📜 ${scripts.length} scripts loaded`);
        
        // List first 5 scripts
        scripts.forEach((s, i) => {
          if (i < 5) {
            const url = s.src;
            const filename = url.split('/').pop();
            log(`  ${i + 1}. ${filename}`);
          }
        });
      }
      
      clearInterval(checkInterval);
    }
  }, 200);
})();