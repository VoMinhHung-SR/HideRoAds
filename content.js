(() => {
    'use strict';
  
    // Site check
    if (!/rophim\./i.test(location.hostname)) return;
  
    const log = (msg) => console.log(`✅ [RoPhim] ${msg}`);
    const warn = (msg) => console.warn(`⚠️ [RoPhim] ${msg}`);
  
    // ============================================================
    // 🔥 SERVICE WORKER KILLER (MANIFEST V3 COMPATIBLE)
    // ============================================================
    const killSW = () => {
      // Method 1: Unregister all service workers
      if (navigator.serviceWorker?.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister());
          log(`Killed ${regs.length} service workers`);
        }).catch(() => {});
      }

      // Method 2: Clear controller
      if (navigator.serviceWorker?.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        } catch (e) {}
      }
    };
  
    // ============================================================
    // 🚫 NETWORK BLOCKER (MANIFEST V3 COMPATIBLE)
    // ============================================================
    const blockRequests = () => {
      // Block patterns
      const blocked = /man88|lu88|crash2\.html|report_issue|\.ads\.|adserver/i;
      const allowed = /goatembed\.com|rophim\.mx|rophim\.com/i;

      // Patch fetch
      const origFetch = window.fetch;
      window.fetch = function(url, ...args) {
        const urlStr = url?.toString() || '';

        if (blocked.test(urlStr) && !allowed.test(urlStr)) {
          log(`Blocked: ${urlStr.substring(0, 50)}`);
          return Promise.resolve(new Response('', { status: 204 }));
        }

        return origFetch.call(this, url, ...args);
      };

      // Patch XHR
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (blocked.test(url) && !allowed.test(url)) {
          this._blocked = true;
          log(`Blocked XHR: ${url.substring(0, 50)}`);
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
    // 🧹 DOM CLEANER (FAST & SIMPLE)
    // ============================================================
    let adCount = 0;
    const cleanDOM = () => {
      // Ad selectors
      const selectors = [
        '[class*="man88"]',
        '[class*="lu88"]',
        '[class*="sspp"]',
        '[class*="catfish"]',
        'a[href*="man88"]',
        'a[href*="lu88"]',
        'a[href*="88."]',
        'img[src*="man88"]',
        'img[src*="lu88"]',
        '.denied-box',
        '.ad-overlay',
        '.ima-ad-container'
      ].join(',');
  
      // Remove ads
      document.querySelectorAll(selectors).forEach(el => {
        try {
          // Skip if it's the player
          if (el.closest('.watch-player, #embed-player, video')) return;
          el.remove();
          adCount++;
        } catch (e) {}
      });
  
      // Remove ad iframes
      document.querySelectorAll('iframe:not(#embed-player)').forEach(el => {
        const src = el.src || '';
        if (/man88|lu88|\.ads\./i.test(src)) {
          try { el.remove(); adCount++; } catch (e) {}
        }
      });
  
      if (adCount > 0 && adCount % 10 === 0) {
        log(`Removed ${adCount} ads`);
      }
    };
  
    // ============================================================
    // 🩹 IFRAME FIXER (CRASH2.HTML PREVENTION)
    // ============================================================
    const fixIframe = () => {
      const iframe = document.querySelector('iframe#embed-player');
      if (!iframe) return;
  
      const src = iframe.src || '';
  
      // Check if infected
      if (/crash2\.html|report_issue/i.test(src)) {
        warn('Iframe infected! Fixing...');
  
        // Extract video ID from URL
        const match = location.pathname.match(/([A-Za-z0-9_-]{8,})/);
        const videoId = match ? match[0] : null;
  
        if (videoId) {
          const params = new URLSearchParams(location.search);
          const cleanUrl = `https://goatembed.com/${videoId}?ver=${params.get('ver')||1}&s=${params.get('s')||1}&ep=${params.get('ep')||1}`;
  
          iframe.src = cleanUrl;
          log(`Fixed iframe: ${videoId}`);
        }
      }
    };
  
    // Block setAttribute hijacking
    const origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (name === 'src' && this.tagName === 'IFRAME' && /crash2\.html/i.test(value)) {
        warn('Blocked iframe hijack');
        return;
      }
      return origSetAttr.call(this, name, value);
    };
  
    // ============================================================
    // 🎬 VIDEO CONTROLLER (SKIP PRE-ROLL)
    // ============================================================
    const patchedVideos = new WeakSet();
  
    const patchVideo = (video) => {
      if (patchedVideos.has(video)) return;
      patchedVideos.add(video);
  
      // Skip pre-roll by jumping to 1s
      video.addEventListener('timeupdate', function() {
        if (this.currentTime < 1 && this.duration > 5) {
          const hasAd = document.querySelector('.ad-overlay, [class*="preroll"]');
          if (hasAd) {
            this.currentTime = 1;
            log('Skipped pre-roll');
          }
        }
      }, { passive: true });
  
      // Clean pause ads
      video.addEventListener('pause', () => {
        setTimeout(cleanDOM, 100);
      }, { passive: true });
  
      log('Video patched');
    };
  
    const checkVideos = () => {
      document.querySelectorAll('video').forEach(patchVideo);
  
      // Auto-click skip button
      const skip = document.querySelector('[class*="skip"], .ad-skip');
      if (skip?.offsetParent) {
        skip.click();
        log('Auto-clicked skip');
      }
    };
  
    // ============================================================
    // 🚫 POPUP BLOCKER (MANIFEST V3 COMPATIBLE)
    // ============================================================
    const blockPopups = () => {
      // Override window.open
      const origOpen = window.open;
      window.open = function() {
        log('Blocked popup');
        return null;
      };

      // Block ad clicks
      window.addEventListener('click', (e) => {
        const bad = e.target.closest('[class*="man88"], [class*="lu88"], [href*="88"]');
        if (bad) {
          e.preventDefault();
          e.stopImmediatePropagation();
          log('Blocked ad click');
        }
      }, { capture: true, passive: false });

      log('Popup blocker active');
    };
  
    // ============================================================
    // 🎨 CSS INJECTION
    // ============================================================
    const injectCSS = () => {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide ads */
        [class*="man88"], [class*="lu88"], [class*="sspp"],
        [class*="catfish"], a[href*="man88"], a[href*="lu88"],
        .denied-box, .ad-overlay, .ima-ad-container,
        [class*="preroll"] {
          display: none !important;
          visibility: hidden !important;
        }
  
        /* Ensure player visible */
        .watch-player, video, #embed-player {
          display: block !important;
          visibility: visible !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
      log('CSS injected');
    };
  
    // ============================================================
    // 🔄 NAVIGATION MONITOR
    // ============================================================
    let lastUrl = location.href;
  
    const watchNavigation = () => {
      setInterval(() => {
        const current = location.href;
  
        if (current !== lastUrl) {
          log('Navigation detected');
  
          // If navigated to error page, go back
          if (/crash2\.html|report_issue/i.test(current)) {
            warn('Error page! Going back...');
            history.back();
          } else {
            lastUrl = current;
  
            // Re-init after navigation
            setTimeout(() => {
              fixIframe();
              cleanDOM();
              checkVideos();
            }, 500);
          }
        }
      }, 500);
    };
  
    // Block history API manipulation
    const origPush = history.pushState;
    const origReplace = history.replaceState;
  
    history.pushState = function(...args) {
      if (args[2] && /crash2\.html/i.test(args[2])) {
        warn('Blocked pushState to error page');
        return;
      }
      return origPush.apply(this, args);
    };
  
    history.replaceState = function(...args) {
      if (args[2] && /crash2\.html/i.test(args[2])) {
        warn('Blocked replaceState to error page');
        return;
      }
      return origReplace.apply(this, args);
    };
  
    // ============================================================
    // 🚀 INITIALIZATION
    // ============================================================
    const init = () => {
      console.log('🚀 [RoPhim] AdBlock v4.0 - Ultra Simple Mode');
  
      // Run immediately
      killSW();
      blockRequests();
      injectCSS();
      blockPopups();
      watchNavigation();
  
      // Run after DOM ready
      const startMonitoring = () => {
        // Continuous cleaning
        setInterval(cleanDOM, 800);
        setInterval(checkVideos, 500);
        setInterval(fixIframe, 2000);
  
        log('All systems active');
      };
  
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
      } else {
        startMonitoring();
      }
  
      console.log('✅ [RoPhim] AdBlock v4.0 ready');
    };
  
    // ============================================================
    // 🎯 RUN
    // ============================================================
  
    // Kill SW immediately
    killSW();
    blockRequests();
  
    // Start everything else
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();