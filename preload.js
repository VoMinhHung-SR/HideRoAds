// ============================================================
// 🎯 PRELOAD - CHẠY TRƯỚC stuff.js
// ============================================================
(() => {
  'use strict';

  // Chạy trên cả rophim.li VÀ goatembed.com (nơi player thực sự load)
  const isRophim = /rophim\./i.test(location.hostname);
  const isGoatembed = /goatembed\./i.test(location.hostname);
  
  if (!isRophim && !isGoatembed) return;

  const log = msg => console.log(`✅ [RoPhim${isGoatembed ? ' iframe' : ''}] ${msg}`);

  // ============================================================
  // 🚫 CHẶN IFRAME REDIRECTS - CHỈ CHẤP NHẬN URL PLAYER ĐÚNG
  // ============================================================
  if (isGoatembed) {
    const href = location.href;
    
    // Chặn crash2.html
    if (/crash2\.html/i.test(href)) {
      log('🚫 BLOCKED crash2.html - stopping');
      window.stop();
      return;
    }
    
    // Chặn .jpg redirect
    if (/\.jpg/i.test(href)) {
      log('🚫 BLOCKED .jpg redirect - stopping');
      window.stop();
      return;
    }
    
    // CHỈ CHẤP NHẬN URL có dạng: goatembed.com/[videoId]?params
    const validPattern = /goatembed\.com\/[A-Za-z0-9_-]+\?/i;
    if (!validPattern.test(href)) {
      log(`🚫 BLOCKED invalid URL: ${href}`);
      window.stop();
      return;
    }
    
    log(`✅ Valid player URL: ${href}`);
  }

  // ============================================================
  // 🔥 HOOK JWPLAYER TRƯỚC KHI NÓ ĐƯỢC DEFINE
  // ============================================================
  
  let jwplayerOriginal = null;
  
  // Define getter/setter cho window.jwplayer
  Object.defineProperty(window, 'jwplayer', {
    get() {
      return jwplayerOriginal;
    },
    set(value) {
      log('🎬 JW Player being set - hijacking...');
      
      // Wrap jwplayer function
      jwplayerOriginal = function(id) {
        const player = value(id);
        
        if (!player) return player;
        
        log('🎬 JW Player instance created');
        
        // Hook vào setup method
        const originalSetup = player.setup;
        player.setup = function(config) {
          log('🔧 Setup called - removing ads...');
          
          if (config) {
            // XÓA ADVERTISING
            if (config.advertising) {
              log('🚫 Removed advertising config');
              delete config.advertising;
            }
            
            // XÓA AD SCHEDULE
            if (config.playlist) {
              config.playlist = config.playlist.map(item => {
                if (item.adschedule) {
                  log('🚫 Removed adschedule from playlist item');
                  delete item.adschedule;
                }
                if (item.advertising) {
                  delete item.advertising;
                }
                return item;
              });
            }
          }
          
          const result = originalSetup.call(this, config);
          
          // Override ad methods
          this.playAd = () => {
            log('🚫 playAd() blocked');
            this.play();
            return this;
          };
          
          this.skipAd = () => {
            log('⏭️ skipAd() called');
            this.play();
            return this;
          };
          
          // Auto skip ads on events
          this.on('adStarted', () => {
            log('🚫 Ad started - skipping');
            setTimeout(() => this.skipAd(), 100);
          });
          
          this.on('adBreakStart', () => {
            log('🚫 Ad break - skipping');
            setTimeout(() => this.skipAd(), 100);
          });
          
          log('✅ JW Player hijacked successfully');
          
          return result;
        };
        
        return player;
      };
      
      // Copy all properties
      Object.keys(value).forEach(key => {
        jwplayerOriginal[key] = value[key];
      });
      
      log('✅ JW Player hook installed');
    },
    configurable: true
  });

  log('🎯 Preload ready - waiting for jwplayer...');
  
  // Debug: Check if we're in iframe
  if (window !== window.top) {
    log(`📍 Running in IFRAME: ${location.href}`);
  } else {
    log(`📍 Running in MAIN PAGE: ${location.href}`);
  }
  
  // Monitor when jwplayer is actually set
  setTimeout(() => {
    if (window.jwplayer) {
      log('✅ jwplayer found after timeout');
    } else {
      log('❌ jwplayer NOT found - may be in different context');
    }
  }, 3000);
})();

