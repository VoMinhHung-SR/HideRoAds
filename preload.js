// ============================================================
// 🎯 PRELOAD - PREVENT IFRAME HIJACKING
// ============================================================
(() => {
  'use strict';

  const isRophim = /rophim\./i.test(location.hostname);
  const isGoatembed = /goatembed\./i.test(location.hostname);
  
  if (!isRophim && !isGoatembed) return;

  const log = msg => console.log(`✅ [RoPhim${isGoatembed ? ' iframe' : ''}] ${msg}`);

  // ============================================================
  // 🛡️ PROTECT IFRAME FROM HIJACKING
  // ============================================================
  if (isGoatembed) {
    const originalHref = location.href;
    log(`🔒 Original URL: ${originalHref}`);
    
    // Check for bad redirects
    const isBadUrl = /crash2\.html|error\.html|\.jpg$/i.test(originalHref);
    
    if (isBadUrl) {
      log(`🚫 BAD URL detected: ${originalHref}`);
      
      // Try to extract video ID from parent page
      try {
        const parentUrl = window.top.location.pathname;
        const match = parentUrl.match(/([A-Za-z0-9_-]{8,})/);
        
        if (match) {
          const videoId = match[1];
          const correctUrl = `https://goatembed.com/${videoId}?version=1`;
          
          log(`🔄 Redirecting to correct URL: ${correctUrl}`);
          location.replace(correctUrl);
          return;
        }
      } catch (e) {
        log('⚠️ Cannot access parent URL (cross-origin)');
      }
      
      // If can't get parent, block the page
      log('🛑 Blocking bad page');
      document.open();
      document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;"><h2>🚫 Blocked: Invalid URL</h2></body></html>');
      document.close();
      return;
    }
    
    // Monitor for hijacking attempts
    let redirectCount = 0;
    const maxRedirects = 3;
    
    const checkHijack = setInterval(() => {
      const currentHref = location.href;
      
      if (currentHref !== originalHref) {
        redirectCount++;
        log(`⚠️ Hijack detected (${redirectCount}/${maxRedirects}): ${currentHref}`);
        
        // If redirected to bad URL
        if (/crash2\.html|error\.html|\.jpg$/i.test(currentHref)) {
          log('🚫 Blocked hijack - restoring original URL');
          location.replace(originalHref);
        }
        
        if (redirectCount >= maxRedirects) {
          log('🛑 Too many redirects - stopping monitor');
          clearInterval(checkHijack);
        }
      }
    }, 500);
    
    // Stop monitoring after 10 seconds
    setTimeout(() => {
      clearInterval(checkHijack);
      log('✅ Hijack protection timeout - assuming safe');
    }, 10000);
  }

  // ============================================================
  // 🔥 HOOK JWPLAYER - ULTRA EARLY
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
        
        log('🎬 JW Player detected!');
        
        jwplayerOriginal = function(id) {
          log(`🎬 jwplayer('${id || 'default'}') called`);
          
          const player = value(id);
          if (!player) return player;
          
          // Hook setup
          const originalSetup = player.setup;
          player.setup = function(config) {
            log('🔧 setup() intercepted');
            
            if (config) {
              log('📋 Config before:', JSON.stringify(config, null, 2).substring(0, 500));
              
              // Remove ads
              if (config.advertising) {
                log('🚫 Removed: advertising');
                delete config.advertising;
              }
              
              if (config.playlist) {
                config.playlist = config.playlist.map(item => {
                  if (item.adschedule) delete item.adschedule;
                  if (item.advertising) delete item.advertising;
                  return item;
                });
                log('🚫 Cleaned playlist ads');
              }
              
              config.autostart = true;
              log('✅ Set autostart = true');
            }
            
            const result = originalSetup.call(this, config);
            
            // Override ad methods
            this.playAd = () => { log('🚫 playAd blocked'); this.play(); return this; };
            this.pauseAd = () => { log('🚫 pauseAd blocked'); return this; };
            this.skipAd = () => { log('⏭️ skipAd'); this.play(); return this; };
            
            // Events
            this.on('ready', () => log('✅ Player READY'));
            this.on('play', () => log('▶️ Playing'));
            this.on('error', (e) => log('❌ Error:', e.message || 'unknown'));
            
            const adSkip = () => {
              log('🚫 Ad event - skipping');
              setTimeout(() => { this.skipAd(); this.play(); }, 50);
            };
            
            this.on('adStarted', adSkip);
            this.on('adBreakStart', adSkip);
            this.on('adError', adSkip);
            
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
    
    log('🎯 Hook ready');
  };

  installHook();
  
  // ============================================================
  // 🔍 DEBUG & MONITOR
  // ============================================================
  const isInIframe = window !== window.top;
  log(`📍 ${isInIframe ? 'IFRAME' : 'MAIN'} | ${location.hostname}`);
  
  // Monitor jwplayer loading
  let checkCount = 0;
  const checkJWPlayer = setInterval(() => {
    checkCount++;
    
    if (window.jwplayer && typeof window.jwplayer === 'function') {
      log(`✅ jwplayer loaded after ${checkCount * 200}ms`);
      clearInterval(checkJWPlayer);
      return;
    }
    
    if (checkCount >= 30) {
      log('⚠️ jwplayer NOT loaded after 6s');
      
      // Debug: List scripts
      const scripts = document.querySelectorAll('script[src]');
      if (scripts.length > 0) {
        log(`📜 Found ${scripts.length} scripts:`);
        scripts.forEach((s, i) => {
          const url = s.src;
          const filename = url.split('/').pop();
          log(`  ${i + 1}. ${filename}`);
        });
      } else {
        log('⚠️ NO SCRIPTS found on page - page may be hijacked!');
      }
      
      // Debug: Show page content
      log('📄 Page title:', document.title);
      log('📄 Body text:', document.body?.innerText?.substring(0, 200) || 'empty');
      
      clearInterval(checkJWPlayer);
    }
  }, 200);
  
  // Monitor script additions
  const observeScripts = () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
            const src = node.src || '';
            const inline = !src && node.textContent?.length > 0;
            
            if (src) {
              const filename = src.split('/').pop();
              log(`📜 Script added: ${filename}`);
              
              if (/jwplayer|stuff\.js/i.test(src)) {
                log('🎬 JW Player script detected!');
              }
            } else if (inline) {
              log('📜 Inline script added');
              
              // Check if it contains jwplayer
              if (node.textContent.includes('jwplayer')) {
                log('🎬 JW Player inline script detected!');
              }
            }
          }
        });
      });
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      log('👀 Monitoring scripts');
    }
  };
  
  if (document.body) {
    observeScripts();
  } else {
    document.addEventListener('DOMContentLoaded', observeScripts);
  }
})();