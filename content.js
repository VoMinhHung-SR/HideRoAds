(() => {
  'use strict';

  if (!/rophim\./i.test(location.hostname)) return;

  const log = msg => console.log(`✅ [RoPhim] ${msg}`);
  const warn = msg => console.warn(`⚠️ [RoPhim] ${msg}`);
  blockServiceWorkerRegistration();
  killServiceWorkers();
  // ============================================================
  // 🎯 ENHANCED CONFIG
  // ============================================================
  const CONFIG = {
    blocked: /man88|lu88|crash2\.html|report_issue|\.ads\.|adserver|catfish|sspp|preroll|ad-overlay|ima-ad/i,
    allowed: /goatembed\.com|rophim\.mx|rophim\.com/i,
    adSelectors: [
      // Classic ads
      '[class*="man88"]', '[class*="lu88"]', '[class*="sspp"]', '[class*="catfish"]',
      '[href*="man88"]', '[href*="lu88"]', '[href*="88."]',
      '[src*="man88"]', '[src*="lu88"]',
      
      // Overlay ads
      '.denied-box', '.ad-overlay', '.ima-ad-container',
      '[class*="preroll"]', '[class*="ads"]',
      
      // SSPP ads from CSS
      '.sspp-area', '[class*="sspp"]',
      
      // JW Player ads
      '.jw-ad', '.jw-ad-container', '.jw-ad-group',
      '.jw-ad-control', '.jw-ad-controls',
      
      // Generic overlay patterns
      'div[style*="position: fixed"][style*="z-index: 999"]',
      'div[style*="position: fixed"][style*="z-index: 9999"]',
      'div[style*="position: absolute"][style*="z-index: 999"]',
      
      // Popup patterns
      'div[id*="popup"]', 'div[class*="popup"]',
      'div[id*="modal"][class*="ad"]'
    ]
  };

  // // ============================================================
  // // 🔥 SERVICE WORKER KILLER
  // // ============================================================
  // const killServiceWorkers = async () => {
  //   if (!navigator.serviceWorker) return;
  //   try {
  //     const regs = await navigator.serviceWorker.getRegistrations();
  //     await Promise.all(regs.map(r => r.unregister()));
  //     if (regs.length > 0) log(`Killed ${regs.length} service workers`);
  //   } catch (e) {}
  // };
  // ============================================================
  // 🔥 KILL SERVICE WORKER - HIGHEST PRIORITY
  // ============================================================
  const killServiceWorkers = async () => {
    if (!navigator.serviceWorker) return;
    
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      
      if (regs.length > 0) {
        log(`🔥 Found ${regs.length} service workers - killing...`);
        
        await Promise.all(regs.map(async (reg) => {
          log(`🔥 Killing: ${reg.scope}`);
          await reg.unregister();
        }));
        
        log(`✅ Killed ${regs.length} service workers`);
        
        // Force reload to apply changes
        if (regs.length > 0 && !sessionStorage.getItem('sw_killed')) {
          sessionStorage.setItem('sw_killed', '1');
          log('🔄 Reloading to clear SW cache...');
          setTimeout(() => location.reload(), 100);
        }
      }
    } catch (e) {
      warn('Failed to kill service workers: ' + e.message);
    }
  };

  // // Block Service Worker registration
  // const blockServiceWorkerRegistration = () => {
  //   if (!navigator.serviceWorker) return;
    
  //   const originalRegister = navigator.serviceWorker.register;
  //   navigator.serviceWorker.register = function(...args) {
  //     log(`🚫 Blocked Service Worker registration: ${args[0]}`);
  //     return Promise.resolve({
  //       installing: null,
  //       waiting: null,
  //       active: null,
  //       scope: '/',
  //       update: () => Promise.resolve(),
  //       unregister: () => Promise.resolve(true)
  //     });
  //   };
    
  //   log('Service Worker registration blocked');
  // };

  // Block Service Worker registration
  const blockServiceWorkerRegistration = () => {
    if (!navigator.serviceWorker) return;
    
    const originalRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function(...args) {
      warn(`🚫 BLOCKED Service Worker registration: ${args[0]}`);
      return Promise.reject(new Error('Service Worker blocked by extension'));
    };
    
    log('Service Worker registration blocked');
  };

  // ============================================================
  // 🚫 NETWORK BLOCKER
  // ============================================================
  const setupNetworkBlocker = () => {
    const origFetch = window.fetch;
    window.fetch = function(url, ...args) {
      const urlStr = url?.toString() || '';
      if (CONFIG.blocked.test(urlStr) && !CONFIG.allowed.test(urlStr)) {
        log(`🚫 Fetch: ${urlStr.slice(0, 40)}...`);
        return Promise.resolve(new Response('', { status: 204 }));
      }
      return origFetch.call(this, url, ...args);
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (CONFIG.blocked.test(url) && !CONFIG.allowed.test(url)) {
        this._blocked = true;
        log(`🚫 XHR: ${url.slice(0, 40)}...`);
        return;
      }
      return origOpen.call(this, method, url, ...args);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._blocked) return;
      return origSend.call(this, ...args);
    };

    log('Network blocker active');
  };

  // ============================================================
  // 🧹 SMART DOM CLEANER
  // ============================================================
  let adCount = 0;
  let cleaningQueue = [];
  let isProcessing = false;

  const cleanAds = (root = document) => {
    if (!root?.querySelectorAll || isProcessing) return;
    
    isProcessing = true;
    
    requestAnimationFrame(() => {
      try {
        const selector = CONFIG.adSelectors.join(',');
        const elements = Array.from(root.querySelectorAll(selector));
        
        elements.forEach(el => {
          if (!el?.isConnected || !el.parentNode) return;
          
          // Skip player elements
          const isPlayer = el.closest('.watch-player, #embed-player, #player, video, [id*="player"], .jwplayer');
          if (isPlayer) return;
          
          // Additional check for JW Player structure
          if (el.classList.contains('jw-wrapper') || el.classList.contains('jw-media')) return;
          
          try {
            if (document.contains(el) && el.parentNode?.contains(el)) {
              el.parentNode.removeChild(el);
              adCount++;
            }
          } catch (e) {}
        });

        // Clean bad iframes
        const iframes = Array.from(root.querySelectorAll('iframe:not(#embed-player):not([id*="player"])'));
        iframes.forEach(iframe => {
          if (!iframe?.isConnected || !iframe.parentNode) return;
          
          const src = iframe.src || iframe.getAttribute('data-src') || '';
          if (CONFIG.blocked.test(src)) {
            try {
              if (document.contains(iframe) && iframe.parentNode?.contains(iframe)) {
                iframe.parentNode.removeChild(iframe);
                adCount++;
              }
            } catch (e) {}
          }
        });

        if (adCount > 0 && adCount % 5 === 0) {
          log(`Removed ${adCount} ads`);
        }
      } catch (e) {
        warn('cleanAds error: ' + e.message);
      } finally {
        isProcessing = false;
      }
    });
  };

  // ============================================================
  // 🩹 IFRAME FIXER
  // ============================================================
  let lastIframeFix = 0;
  const fixPlayerIframe = () => {
    const now = Date.now();
    if (now - lastIframeFix < 2000) return;
    lastIframeFix = now;

    try {
      const iframe = document.querySelector('iframe#embed-player, iframe[id*="player"]');
      if (!iframe?.src) return;

      if (CONFIG.blocked.test(iframe.src)) {
        warn('🔧 Fixing infected iframe...');
        
        const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
        if (!match) return;
        
        const videoId = match[0];
        const params = new URLSearchParams(location.search);
        const cleanUrl = `https://goatembed.com/${videoId}?ver=${params.get('ver')||1}&s=${params.get('s')||1}&ep=${params.get('ep')||1}`;
        
        iframe.src = cleanUrl;
        log(`✅ Fixed iframe: ${videoId}`);
      }
    } catch (e) {}
  };

  // Block iframe hijacking - ENHANCED
  const origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'src' && this.tagName === 'IFRAME') {
      if (CONFIG.blocked.test(value) || /crash2\.html/i.test(value)) {
        warn(`🛡️ Blocked iframe hijack: ${value}`);
        
        // Nếu là player iframe, fix lại URL đúng
        if (this.id === 'embed-player' || this.id?.includes('player')) {
          const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
          if (match) {
            const videoId = match[0];
            const params = new URLSearchParams(location.search);
            const cleanUrl = `https://goatembed.com/${videoId}?ver=${params.get('ver')||1}&s=${params.get('s')||1}&ep=${params.get('ep')||1}`;
            log(`✅ Redirected iframe to: ${cleanUrl}`);
            return origSetAttr.call(this, name, cleanUrl);
          }
        }
        
        return; // Block hoàn toàn
      }
    }
    return origSetAttr.call(this, name, value);
  };

  // ============================================================
  // 🎬 ULTRA-AGGRESSIVE VIDEO CONTROLLER
  // ============================================================
  const patchedVideos = new WeakSet();
  let lastSkipTime = 0;
  
  const patchVideo = (video) => {
    if (!video?.isConnected || patchedVideos.has(video)) return;
    patchedVideos.add(video);

    // IMMEDIATE skip on load
    const forceSkip = () => {
      try {
        if (!video?.isConnected) return;
        
        const now = Date.now();
        if (now - lastSkipTime < 500) return; // Debounce
        
        const ct = video.currentTime;
        const dur = video.duration;
        
        // Force skip ANY content before 5 seconds (preroll ads)
        if (ct < 5 && dur > 10) {
          video.currentTime = 5;
          lastSkipTime = now;
          log('⚡ Force skipped preroll to 5s');
        }
        
        // Detect ad by checking if controls are hidden
        const jwPlayer = video.closest('.jwplayer');
        if (jwPlayer) {
          const isAd = jwPlayer.classList.contains('jw-flag-ads') || 
                      jwPlayer.classList.contains('jw-flag-ads-vpaid') ||
                      document.querySelector('.jw-ad-group');
          
          if (isAd && ct < 30) {
            video.currentTime = Math.min(dur - 1, 30);
            lastSkipTime = now;
            log('⚡ Detected JW ad, skipped to 30s');
          }
        }
      } catch (e) {}
    };

    // Run on EVERY frame
    video.addEventListener('timeupdate', forceSkip, { passive: true });
    
    // Also run on loadedmetadata (earliest possible)
    video.addEventListener('loadedmetadata', () => {
      setTimeout(forceSkip, 50);
      setTimeout(forceSkip, 100);
      setTimeout(forceSkip, 200);
    }, { passive: true, once: true });
    
    // Skip preroll ngay khi video có thể play
    video.addEventListener('canplay', () => {
      if (video.currentTime < 5 && (video.duration || 0) > 10) {
        video.currentTime = 5;
        log('⚡ Preroll skipped on canplay');
      }
    }, { passive: true, once: true });
    
    // Run on play
    video.addEventListener('play', () => {
      forceSkip();
      setTimeout(forceSkip, 100);
      setTimeout(cleanAds, 100);
    }, { passive: true });
    
    video.addEventListener('pause', () => setTimeout(() => !isProcessing && cleanAds(), 100), { passive: true });
    
    log('🎬 Video ultra-patched');
  };

  const checkVideos = () => {
    try {
      // Patch all videos
      document.querySelectorAll('video').forEach(patchVideo);
      
      // AGGRESSIVE skip button clicking
      const skipSelectors = [
        '.jw-skip.jw-skippable',
        '.jw-skip',
        '[class*="skip"]:not([style*="none"])',
        '.ad-skip',
        'button[class*="skip"]',
        '[class*="skip"][class*="btn"]',
        '.skip-buttons .sb-button'
      ];
      
      for (const sel of skipSelectors) {
        const skips = document.querySelectorAll(sel);
        skips.forEach(skip => {
          if (skip?.offsetParent && skip.isConnected) {
            try {
              skip.click();
              log('⏭️ Auto-clicked: ' + sel);
            } catch (e) {}
          }
        });
      }
      
      // Remove JW Player ad controls
      document.querySelectorAll('.jw-ad-group, .jw-ad-controls, .jw-skip:not(.jw-skippable)').forEach(el => {
        try {
          if (el.parentNode?.contains(el)) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      });
    } catch (e) {}
  };

  // ============================================================
  // 🚫 POPUP BLOCKER
  // ============================================================
  const setupPopupBlocker = () => {
    window.open = function() {
      log('🚫 Blocked popup');
      return null;
    };

    document.addEventListener('click', (e) => {
      const bad = e.target.closest('[class*="man88"], [class*="lu88"], [href*="88."], [class*="ads"], [class*="popup"]');
      if (bad && !bad.closest('video, #embed-player, .jwplayer')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        log('🚫 Blocked ad click');
      }
    }, { capture: true });

    document.addEventListener('contextmenu', (e) => {
      const bad = e.target.closest('[class*="man88"], [class*="lu88"]');
      if (bad) e.preventDefault();
    }, { capture: true });

    log('Popup blocker active');
  };

  // ============================================================
  // 🎨 ULTRA-AGGRESSIVE CSS INJECTION
  // ============================================================
  const injectCSS = () => {
    const style = document.createElement('style');
    style.id = 'rophim-adblock-css';
    style.textContent = `
      /* Hide all ad patterns */
      [class*="man88"], [class*="lu88"], [class*="sspp"],
      [class*="catfish"], [href*="man88"], [href*="lu88"],
      .denied-box, .ad-overlay, .ima-ad-container,
      [class*="preroll"], [class*="ads"]:not(.watch-player):not(#embed-player),
      .sspp-area, .jw-ad, .jw-ad-container,
      div[style*="position: fixed"][style*="z-index: 999"],
      div[style*="position: fixed"][style*="z-index: 9999"],
      div[id*="popup"][class*="ad"],
      body > div[style*="position: fixed"]:not(#rp-player):not(.jwplayer) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        z-index: -9999 !important;
      }

      /* Ensure player visible */
      .watch-player, video, #embed-player, #player,
      [id*="player"]:not([class*="ad"]),
      .jwplayer:not(.jw-ad) {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Remove pseudo-element ads */
      *::before[content], *::after[content] {
        content: none !important;
      }

      /* AGGRESSIVE: Hide JW Player ads */
      .jw-ad-group, .jw-ad-controls, .jw-ad-control,
      .jwplayer.jw-flag-ads .jw-skip:not(.jw-skippable),
      .jwplayer.jw-flag-ads-vpaid,
      .jw-ad-time-remaining {
        display: none !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
      }

      /* Force skip button visible */
      .jw-skip.jw-skippable {
        display: flex !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /* Clean overlays */
      body > div[style*="z-index"]:not(#rp-player):not(.jwplayer):not([id*="player"]) {
        display: none !important;
      }

      /* Hide JW Player ad overlay */
      .jwplayer.jw-flag-ads .jw-media:not(video) {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    log('CSS ultra-injected');
  };

  // ============================================================
  // 🔍 SMART OBSERVER
  // ============================================================
  let observerTimeout = null;
  const setupObserver = () => {
    const observer = new MutationObserver((mutations) => {
      if (observerTimeout) return;
      
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        
        let shouldClean = false;
        let shouldCheck = false;

        try {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== 1) continue;
              
              const el = node;
              const className = el.className || '';
              const id = el.id || '';
              
              // Check for ads
              if (
                /man88|lu88|sspp|catfish|popup|ad-|preroll/i.test(className + id) ||
                (el.matches && CONFIG.adSelectors.some(sel => {
                  try { return el.matches(sel); } catch(e) { return false; }
                }))
              ) {
                shouldClean = true;
              }
              
              // Check for video/iframe
              if (el.tagName === 'VIDEO' || el.tagName === 'IFRAME') {
                shouldCheck = true;
              }
            }
          }

          if (shouldClean) cleanAds();
          if (shouldCheck) {
            checkVideos();
            fixPlayerIframe();
          }
        } catch (e) {}
      }, 150);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    log('Observer active');
    return observer;
  };

  // ============================================================
  // 🔄 NAVIGATION MONITOR
  // ============================================================
  const setupNavigationMonitor = () => {
    let lastUrl = location.href;
    let isNavigating = false;

    const checkNavigation = () => {
      if (isNavigating) return;
      
      const current = location.href;
      if (current !== lastUrl) {
        if (CONFIG.blocked.test(current)) {
          warn('🚫 Blocked navigation to error page');
          isNavigating = true;
          setTimeout(() => {
            history.back();
            isNavigating = false;
          }, 100);
          return;
        }
        
        log('🔄 Navigation detected');
        lastUrl = current;
        isNavigating = true;
        
        setTimeout(() => {
          try {
            fixPlayerIframe();
            cleanAds();
            checkVideos();
          } catch (e) {} finally {
            isNavigating = false;
          }
        }, 500);
      }
    };

    setInterval(checkNavigation, 2000);

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function(...args) {
      if (args[2] && CONFIG.blocked.test(args[2])) {
        warn('🚫 Blocked pushState');
        return;
      }
      return origPush.apply(this, args);
    };

    history.replaceState = function(...args) {
      if (args[2] && CONFIG.blocked.test(args[2])) {
        warn('🚫 Blocked replaceState');
        return;
      }
      return origReplace.apply(this, args);
    };

    log('Navigation monitor active');
  };

  // ============================================================
  // 🚀 INITIALIZATION
  // ============================================================
  const init = () => {
    console.log('🚀 [RoPhim] AdBlock v1.4 - Enhanced Edition');

    // blockServiceWorkerRegistration();
    // killServiceWorkers();
    setupNetworkBlocker();
    injectCSS();
    setupPopupBlocker();

    const onDOMReady = () => {
      cleanAds();
      fixPlayerIframe();
      checkVideos();

      setupObserver();
      setupNavigationMonitor();

      // Periodic checks (more frequent for pre-roll)
      setInterval(() => {
        checkVideos(); // Check skip buttons
      }, 500); // Every 500ms
      
      setInterval(() => {
        fixPlayerIframe();
      }, 3000);

      log('✅ All systems active');
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
      onDOMReady();
    }
  };

  // ============================================================
  // 🎯 EXECUTE
  // ============================================================
  // blockServiceWorkerRegistration();
  // killServiceWorkers();
  setupNetworkBlocker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('✅ [RoPhim] AdBlock v1.2 ready');

  // ============================================================
  // 🎬 JW PLAYER AD BLOCKER
  // ============================================================
  const setupJWPlayerAdBlocker = () => {
    console.log('🚫 JW Player Ad Blocker: Initializing...');
    
    let jwPlayerFound = false;
    let overrideAttempts = 0;
    
    // Override JW Player advertising methods
    const overrideJWPlayerAds = () => {
      console.log('🔍 JW Ad Blocker: Checking for JW Player...');
      console.log('🔍 window.jwplayer exists:', !!window.jwplayer);
      console.log('🔍 window.jwplayer.prototype exists:', !!(window.jwplayer && window.jwplayer.prototype));
      
      if (window.jwplayer && window.jwplayer.prototype) {
        console.log('✅ JW Player found! Setting up ad blocking...');
        jwPlayerFound = true;
        
        const originalSetup = window.jwplayer.prototype.setup;
        
        // Override setup method để disable advertising
        window.jwplayer.prototype.setup = function(config) {
          console.log('🎬 JW Player setup called with config:', config);
          
          // Disable advertising trong config
          if (config) {
            config.advertising = {
              client: 'none',
              skipoffset: 0
            };
            console.log('🚫 JW Ad Blocker: Disabled advertising in config');
          }
          
          const player = originalSetup.call(this, config);
          
          if (player) {
            console.log('🎬 JW Player instance created, setting up ad blocking...');
            
            // Override ad methods
            player.playAd = function() {
              console.log('🚫 JW Ad Blocker: Ad play blocked - playing content');
              return this;
            };
            
            player.pauseAd = function() {
              console.log('🚫 JW Ad Blocker: Ad pause blocked - continuing content');
              return this;
            };
            
            player.skipAd = function() {
              console.log('⏭️ JW Ad Blocker: Ad skipped - playing content');
              return this;
            };
            
            // Auto-skip ads khi chúng bắt đầu
            player.on('adStarted', function() {
              console.log('🚫 JW Ad Blocker: Ad started - auto-skipping');
              setTimeout(() => this.skipAd(), 100);
            });
            
            player.on('adBreakStart', function() {
              console.log('🚫 JW Ad Blocker: Ad break started - auto-skipping');
              setTimeout(() => this.skipAd(), 100);
            });
            
            player.on('adComplete', function() {
              console.log('✅ JW Ad Blocker: Ad complete - continuing to content');
            });
            
            player.on('adError', function() {
              console.log('❌ JW Ad Blocker: Ad error - skipping to content');
              this.skipAd();
            });
            
            console.log('✅ JW Player ad blocking methods overridden for this instance');
          }
          
          return player;
        };
        
        console.log('✅ JW Player ad blocking methods overridden globally');
      } else {
        overrideAttempts++;
        console.log(`⏳ JW Player not found yet (attempt ${overrideAttempts}/50)`);
      }
    };
    
    // Try immediately
    overrideJWPlayerAds();
    
    // Wait for JW Player to load with more aggressive checking
    const checkJWPlayer = setInterval(() => {
      if (jwPlayerFound) {
        clearInterval(checkJWPlayer);
        console.log('✅ JW Player ad blocking activated');
        return;
      }
      
      overrideJWPlayerAds();
      
      if (overrideAttempts >= 50) {
        clearInterval(checkJWPlayer);
        console.log('⚠️ JW Player not found after 50 attempts - trying alternative approach...');
        
        // Alternative approach: Direct DOM manipulation
        const alternativeAdBlocker = () => {
          console.log('🔧 Trying alternative ad blocking approach...');
          
          // Remove any existing ad elements
          const adElements = document.querySelectorAll('.jw-ad-group, .jw-ad-controls, .jw-ad-control, [class*="ad-"], [class*="preroll"]');
          adElements.forEach(el => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
              console.log('🚫 Removed ad element:', el.className);
            }
          });
          
          // Force click any skip buttons
          const skipButtons = document.querySelectorAll('.jw-skip, [class*="skip"], button[class*="skip"]');
          skipButtons.forEach(btn => {
            if (btn.offsetParent) {
              btn.click();
              console.log('⏭️ Clicked skip button:', btn.className);
            }
          });
          
          // Look for video elements and force seek
          const videos = document.querySelectorAll('video');
          videos.forEach(video => {
            if (video.currentTime < 5 && video.duration > 10) {
              video.currentTime = 5;
              console.log('⚡ Force seeked video to 5s');
            }
          });
        };
        
        // Run alternative approach every 500ms
        setInterval(alternativeAdBlocker, 500);
        alternativeAdBlocker(); // Run immediately
      }
    }, 200);
    
    // Also monitor for script loading
    const scriptObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
            const src = node.src || '';
            if (src.includes('jwplayer') || src.includes('stuff.js')) {
              console.log('🎬 JW Player script detected:', src);
              setTimeout(() => {
                overrideJWPlayerAds();
              }, 1000);
            }
          }
        });
      });
    });
    
    scriptObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  // Initialize JW Player Ad Blocker
  setupJWPlayerAdBlocker();
})();