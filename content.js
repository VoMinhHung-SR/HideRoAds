(() => {
  'use strict';

  // Site check
  if (!/rophim\./i.test(location.hostname)) return;

  const log = msg => console.log(`✅ [RoPhim] ${msg}`);
  const warn = msg => console.warn(`⚠️ [RoPhim] ${msg}`);

  // ============================================================
  // 🎯 CONFIG
  // ============================================================
  const CONFIG = {
    blocked: /man88|lu88|crash2\.html|report_issue|\.ads\.|adserver|catfish|sspp/i,
    allowed: /goatembed\.com|rophim\.mx|rophim\.com/i,
    adSelectors: [
      '[class*="man88"]', '[class*="lu88"]', '[class*="sspp"]',
      '[class*="catfish"]', '[href*="man88"]', '[href*="lu88"]',
      '[href*="88."]', '[src*="man88"]', '[src*="lu88"]',
      '.denied-box', '.ad-overlay', '.ima-ad-container',
      '[class*="preroll"]', '[class*="ads"]',
      // Goatembed specific selectors
      '.jw-skip', '.jw-skippable', '.skip-buttons',
      '.jwplayer.jw-flag-ads', '.jw-ads', '.jw-ad-display',
      '.sspp-area', '.sspp-area.is-player'
    ],
    // Pre-roll detection patterns
    prerollPatterns: [
      '.jw-skip', '.jw-skippable', '.skip-buttons .sb-button',
      '.jwplayer.jw-flag-ads', '.jw-ads', '.jw-ad-display',
      '[class*="preroll"]', '[class*="ad-"]', '.ad-overlay'
    ]
  };

  // ============================================================
  // 🔥 SERVICE WORKER KILLER
  // ============================================================
  const killServiceWorkers = async () => {
    if (!navigator.serviceWorker) return;
    
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if (regs.length > 0) log(`Killed ${regs.length} service workers`);
    } catch (e) {
      warn('SW kill failed');
    }
  };

  // ============================================================
  // 🚫 NETWORK BLOCKER
  // ============================================================
  const setupNetworkBlocker = () => {
    // Patch fetch
    const origFetch = window.fetch;
    window.fetch = function(url, ...args) {
      const urlStr = url?.toString() || '';
      if (CONFIG.blocked.test(urlStr) && !CONFIG.allowed.test(urlStr)) {
        log(`🚫 Fetch: ${urlStr.slice(0, 40)}...`);
        return Promise.resolve(new Response('', { status: 204 }));
      }
      return origFetch.call(this, url, ...args);
    };

    // Patch XHR
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
  // 🧹 DOM CLEANER (Safe MutationObserver-based)
  // ============================================================
  let adCount = 0;
  let isCleaning = false;
  
  const cleanAds = (root = document) => {
    if (!root || !root.querySelectorAll || isCleaning) return;
    
    isCleaning = true;
    const selector = CONFIG.adSelectors.join(',');
    
    try {
      // Convert to array to avoid live NodeList issues
      const elements = Array.from(root.querySelectorAll(selector));
      
      elements.forEach(el => {
        // Enhanced safety checks
        if (!el || !el.parentNode || !el.isConnected) return;
        if (el.closest('.watch-player, #embed-player, video, [id*="player"]')) return;
        
        // Additional safety: check if element is still in DOM
        if (!document.contains(el)) return;
        
        try {
          // Triple check before removal with timeout
          const parent = el.parentNode;
          if (parent && parent.contains(el) && document.contains(el)) {
            // Use requestAnimationFrame to ensure DOM is stable
            requestAnimationFrame(() => {
              try {
                if (parent && parent.contains(el) && document.contains(el)) {
                  parent.removeChild(el);
                  adCount++;
                }
              } catch (e) {
                // Node was removed by another process
              }
            });
          }
        } catch (e) {
          // Silently fail - node might be removed by another process
        }
      });

      // Clean bad iframes with enhanced safety
      const iframes = Array.from(root.querySelectorAll('iframe:not(#embed-player):not([id*="player"])'));
      
      iframes.forEach(iframe => {
        if (!iframe || !iframe.parentNode || !iframe.isConnected) return;
        if (!document.contains(iframe)) return;
        
        const src = iframe.src || '';
        if (CONFIG.blocked.test(src)) {
          try {
            const parent = iframe.parentNode;
            if (parent && parent.contains(iframe) && document.contains(iframe)) {
              requestAnimationFrame(() => {
                try {
                  if (parent && parent.contains(iframe) && document.contains(iframe)) {
                    parent.removeChild(iframe);
                    adCount++;
                  }
                } catch (e) {
                  // Node was removed by another process
                }
              });
            }
          } catch (e) {
            // Silently fail
          }
        }
      });
    } catch (e) {
      warn('cleanAds error: ' + e.message);
    } finally {
      // Reset cleaning flag after a short delay
      setTimeout(() => { isCleaning = false; }, 50);
    }

    if (adCount > 0 && adCount % 10 === 0) {
      log(`Removed ${adCount} ads`);
    }
  };

  // ============================================================
  // 🩹 IFRAME FIXER
  // ============================================================
  let lastIframeFix = 0;
  const fixPlayerIframe = () => {
    // Debounce to prevent spam
    const now = Date.now();
    if (now - lastIframeFix < 2000) return;
    lastIframeFix = now;

    try {
      const iframe = document.querySelector('iframe#embed-player, iframe[id*="player"]');
      if (!iframe || !iframe.src) return;

      const src = iframe.src;
      
      // Check if infected
      if (CONFIG.blocked.test(src)) {
        warn('🔧 Fixing infected iframe...');
        
        // Extract video ID from URL
        const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
        if (!match) return;
        
        const videoId = match[0];
        const params = new URLSearchParams(location.search);
        const cleanUrl = `https://goatembed.com/${videoId}?ver=${params.get('ver')||1}&s=${params.get('s')||1}&ep=${params.get('ep')||1}`;
        
        iframe.src = cleanUrl;
        log(`✅ Fixed iframe: ${videoId}`);
      }
    } catch (e) {
      warn('fixPlayerIframe error: ' + e.message);
    }
  };

  // Block iframe hijacking
  const origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'src' && this.tagName === 'IFRAME' && CONFIG.blocked.test(value)) {
      warn('🛡️ Blocked iframe hijack');
      return;
    }
    return origSetAttr.call(this, name, value);
  };

  // ============================================================
  // 🎬 VIDEO CONTROLLER (Enhanced Safety)
  // ============================================================
  const patchedVideos = new WeakSet();
  let isCheckingVideos = false;
  
  const patchVideo = (video) => {
    if (!video || !video.isConnected || patchedVideos.has(video)) return;
    patchedVideos.add(video);

    // Enhanced pre-roll detection and skipping
    const skipPreroll = () => {
      try {
        if (!video || !video.isConnected) return;
        
        // Check if it's likely a pre-roll (short duration, early in video)
        const isPreroll = video.currentTime < 3 && video.duration > 10;
        
        if (isPreroll) {
          // Enhanced ad detection using Goatembed patterns
          const adSelectors = CONFIG.prerollPatterns.join(',');
          const hasAd = document.querySelector(adSelectors);
          
          // Check JW Player ad state
          const jwPlayer = video.closest('.jwplayer');
          const isAdState = jwPlayer && jwPlayer.classList.contains('jw-flag-ads');
          
          if (hasAd || isAdState) {
            // Try multiple skip methods
            const skipButton = document.querySelector('.jw-skip, .skip-buttons .sb-button, [class*="skip"]');
            if (skipButton && skipButton.offsetParent) {
              skipButton.click();
              log('⏭️ Clicked skip button');
            } else {
              // Force skip by jumping to content
              video.currentTime = Math.min(3, video.duration - 1);
              log('⏭️ Force skipped pre-roll');
            }
          }
        }
      } catch (e) {
        // Silently fail
      }
    };

    // Enhanced event listeners with cleanup
    const timeUpdateHandler = () => {
      requestAnimationFrame(skipPreroll);
    };
    
    const pauseHandler = () => {
      setTimeout(() => {
        if (!isCleaning) cleanAds();
      }, 100);
    };

    video.addEventListener('timeupdate', timeUpdateHandler, { passive: true });
    video.addEventListener('pause', pauseHandler, { passive: true });
    
    // Store handlers for cleanup
    video._adblockHandlers = { timeUpdateHandler, pauseHandler };
    
    log('🎬 Video patched');
  };

  const checkVideos = () => {
    if (isCheckingVideos) return;
    isCheckingVideos = true;
    
    try {
      const videos = Array.from(document.querySelectorAll('video'));
      videos.forEach(video => {
        if (video && video.isConnected) {
          patchVideo(video);
        }
      });
      
      // Enhanced skip button detection for Goatembed
      const skipSelectors = [
        '.jw-skip', '.jw-skippable', '.skip-buttons .sb-button',
        '[class*="skip"]:not([style*="none"])', '.ad-skip:not([style*="none"])'
      ];
      
      for (const selector of skipSelectors) {
        const skip = document.querySelector(selector);
        if (skip?.offsetParent && skip.isConnected && document.contains(skip)) {
          try {
            skip.click();
            log(`⏭️ Auto-clicked skip: ${selector}`);
            break; // Only click one skip button
          } catch (e) {
            // Skip button might be removed
          }
        }
      }
      
      // Force remove JW Player ad state
      const jwPlayers = document.querySelectorAll('.jwplayer.jw-flag-ads');
      jwPlayers.forEach(player => {
        try {
          player.classList.remove('jw-flag-ads');
          log('🚫 Removed JW Player ad flag');
        } catch (e) {
          // Silently fail
        }
      });
      
    } catch (e) {
      warn('checkVideos error: ' + e.message);
    } finally {
      setTimeout(() => { isCheckingVideos = false; }, 100);
    }
  };

  // ============================================================
  // 🚫 POPUP & CLICK BLOCKER
  // ============================================================
  const setupPopupBlocker = () => {
    // Override window.open
    window.open = function() {
      log('🚫 Blocked popup');
      return null;
    };

    // Block ad clicks
    document.addEventListener('click', (e) => {
      const bad = e.target.closest('[class*="man88"], [class*="lu88"], [href*="88."], [class*="ads"]');
      if (bad && !bad.closest('video, #embed-player')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        log('🚫 Blocked ad click');
      }
    }, { capture: true });

    // Block context menu on ads
    document.addEventListener('contextmenu', (e) => {
      const bad = e.target.closest('[class*="man88"], [class*="lu88"]');
      if (bad) e.preventDefault();
    }, { capture: true });

    log('Popup blocker active');
  };

  // ============================================================
  // 🎨 CSS INJECTION
  // ============================================================
  const injectCSS = () => {
    const style = document.createElement('style');
    style.id = 'rophim-adblock-css';
    style.textContent = `
      /* Hide ads */
      [class*="man88"], [class*="lu88"], [class*="sspp"],
      [class*="catfish"], [href*="man88"], [href*="lu88"],
      .denied-box, .ad-overlay, .ima-ad-container,
      [class*="preroll"], [class*="ads"]:not(.watch-player):not(#embed-player) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      /* Goatembed specific ad blocking */
      .jw-skip, .jw-skippable, .skip-buttons,
      .jwplayer.jw-flag-ads, .jw-ads, .jw-ad-display,
      .sspp-area.is-player, .sspp-area .display-single,
      .jwplayer.jw-flag-ads .jw-controlbar,
      .jwplayer.jw-flag-ads .jw-display {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Ensure player visible */
      .watch-player, video, #embed-player, [id*="player"],
      #rp-player, #rp-player .main-player, #player {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        z-index: 1 !important;
      }

      /* Hide ad overlays */
      body > div[style*="position: fixed"],
      body > div[style*="z-index: 999"],
      body > div[style*="z-index: 9999"] {
        display: none !important;
      }

      /* Force video to play content */
      .jwplayer:not(.jw-flag-ads) video {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Hide pre-roll indicators */
      .jw-skip, .jw-skippable, .skip-buttons .sb-button {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    log('CSS injected');
  };

  // ============================================================
  // 🔍 MUTATION OBSERVER (Enhanced Safety)
  // ============================================================
  let observerTimeout = null;
  let observerQueue = [];
  
  const setupObserver = () => {
    const observer = new MutationObserver((mutations) => {
      // Enhanced debounce with queue management
      if (observerTimeout) return;
      
      // Add mutations to queue
      observerQueue.push(...mutations);
      
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        
        let shouldClean = false;
        let shouldCheckVideo = false;
        let shouldFixIframe = false;

        try {
          // Process queued mutations
          for (const mutation of observerQueue) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== 1) continue;
              
              const el = node;
              
              // Enhanced safety check
              if (!el || !el.isConnected) continue;
              
              // Check if it's an ad
              if (el.matches && CONFIG.adSelectors.some(sel => {
                try { return el.matches(sel); } catch(e) { return false; }
              })) {
                shouldClean = true;
              }
              
              // Check if it's a video
              if (el.tagName === 'VIDEO' || el.querySelector?.('video')) {
                shouldCheckVideo = true;
              }
              
              // Check if it's an iframe
              if (el.tagName === 'IFRAME' || el.querySelector?.('iframe')) {
                shouldFixIframe = true;
              }
            }
          }

          // Clear queue
          observerQueue = [];

          // Execute actions with safety delays
          if (shouldClean) {
            setTimeout(() => cleanAds(), 50);
          }
          if (shouldCheckVideo) {
            setTimeout(() => checkVideos(), 100);
          }
          if (shouldFixIframe) {
            setTimeout(() => fixPlayerIframe(), 150);
          }
        } catch (e) {
          warn('Observer error: ' + e.message);
          observerQueue = []; // Clear queue on error
        }
      }, 150); // Increased debounce time
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

    // Check for navigation (reduced frequency)
    const checkNavigation = () => {
      if (isNavigating) return;
      
      const current = location.href;
      
      if (current !== lastUrl) {
        // Block error pages
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
        
        // Re-init after navigation
        setTimeout(() => {
          try {
            fixPlayerIframe();
            cleanAds();
            checkVideos();
          } catch (e) {
            warn('Re-init error: ' + e.message);
          } finally {
            isNavigating = false;
          }
        }, 500);
      }
    };

    // Monitor URL changes (reduced frequency)
    setInterval(checkNavigation, 2000);

    // Block history manipulation
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
  // 🛡️ ERROR RECOVERY SYSTEM
  // ============================================================
  const setupErrorRecovery = () => {
    // Global error handler
    window.addEventListener('error', (e) => {
      if (e.message.includes('removeChild') || e.message.includes('NotFoundError')) {
        warn('🛡️ DOM error detected, resetting state...');
        isCleaning = false;
        isCheckingVideos = false;
        observerQueue = [];
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.message && e.reason.message.includes('removeChild')) {
        warn('🛡️ Promise rejection handled');
        e.preventDefault();
      }
    });

    log('Error recovery system active');
  };

  // ============================================================
  // 🚀 INITIALIZATION (Enhanced)
  // ============================================================
  const init = () => {
    console.log('🚀 [RoPhim] AdBlock v1.1 - Enhanced Safety Edition');

    // Phase 1: Immediate (before DOM)
    killServiceWorkers();
    setupNetworkBlocker();
    injectCSS();
    setupPopupBlocker();
    setupErrorRecovery();

    // Phase 2: DOM ready
    const onDOMReady = () => {
      try {
        // Initial cleanup with safety delays
        setTimeout(() => cleanAds(), 100);
        setTimeout(() => fixPlayerIframe(), 200);
        setTimeout(() => checkVideos(), 300);

        // Setup observer
        setupObserver();
        
        // Setup navigation monitor
        setupNavigationMonitor();

        // Periodic checks (reduced frequency with safety)
        setInterval(() => {
          if (!isCleaning) fixPlayerIframe();
        }, 3000);
        
        setInterval(() => {
          if (!isCheckingVideos) checkVideos();
        }, 2000);

        log('✅ All systems active');
      } catch (e) {
        warn('Init error: ' + e.message);
      }
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
  
  // Run immediately
  killServiceWorkers();
  setupNetworkBlocker();

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('✅ [RoPhim] AdBlock v1.0 ready');
})();