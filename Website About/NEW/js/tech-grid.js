/**
 * Tech Grid Layer - Futuristic Blueprint Grid Background Effect
 * High-performance, GPU-accelerated grid with randomization and parallax
 */

class TechGridLayer {
   constructor(options = {}) {
      // Configuration
      this.config = {
         // Randomization settings
         randomizationChance: options.randomizationChance || 0.4, // 40% chance per section
         seed: options.seed || Date.now(),

         // Performance settings
         parallaxSpeed: options.parallaxSpeed || 0.3,
         debounceDelay: options.debounceDelay || 16, // ~60fps
         reducedMotionMultiplier: options.reducedMotionMultiplier || 0.1,

         // Visual settings
         minOpacity: options.minOpacity || 0.05,
         maxOpacity: options.maxOpacity || 0.12,
         cellSizeVariation: options.cellSizeVariation || 8, // px variation

         // Responsive breakpoints
         mobileBreakpoint: options.mobileBreakpoint || 768,

         // Selectors
         sectionSelector: options.sectionSelector || 'section',
         gridClass: options.gridClass || 'tech-grid-layer',

         ...options
      };

      // State
      this.isInitialized = false;
      this.isMobile = false;
      this.prefersReducedMotion = false;
      this.gridInstances = new Map();
      this.scrollY = 0;
      this.rafId = null;

      // Performance tracking
      this.lastFrameTime = 0;
      this.frameCount = 0;
      this.fps = 60;

      // Bind methods
      this.handleScroll = this.handleScroll.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.checkPerformance = this.checkPerformance.bind(this);

      // Initialize
      this.init();
   }

   /**
    * Initialize the tech grid system
    */
   init() {
      // Early exit on mobile or reduced motion
      if (this.shouldDisable()) {
         return;
      }

      // Check environment
      this.checkEnvironment();

      // Find and process sections
      this.processSections();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
   }

   /**
    * Check if the grid should be disabled
    */
   shouldDisable() {
      // Check mobile breakpoint
      if (window.innerWidth < this.config.mobileBreakpoint) {
         return true;
      }

      // Check reduced motion preference
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
         return true;
      }

      // Check for low-end devices (basic heuristics)
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
         return true;
      }

      return false;
   }

   /**
    * Check environment and capabilities
    */
   checkEnvironment() {
      this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   }

   /**
    * Process all sections and apply grid randomly
    */
   processSections() {
      const sections = document.querySelectorAll(this.config.sectionSelector);

      sections.forEach((section, index) => {
         // Generate deterministic random based on section index and seed
         const random = this.seededRandom(this.config.seed + index);

         if (random < this.config.randomizationChance) {
            this.applyGridToSection(section, index, random);
         }
      });
   }

   /**
    * Seeded random number generator for consistent randomization
    */
   seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
   }

   /**
    * Apply grid effect to a specific section
    */
   applyGridToSection(section, index, randomValue) {
      // Add grid class
      section.classList.add(this.config.gridClass);

      // Generate unique properties for this instance
      const instanceConfig = {
         opacity: this.config.minOpacity + (randomValue * (this.config.maxOpacity - this.config.minOpacity)),
         cellSize: 48 + Math.floor(randomValue * this.config.cellSizeVariation),
         offsetX: Math.floor(randomValue * 48),
         offsetY: Math.floor(randomValue * 48),
         parallaxSpeed: this.config.parallaxSpeed * (0.5 + randomValue * 0.5),
         id: `tech-grid-${index}`
      };

      // Apply CSS custom properties
      section.style.setProperty('--tech-grid-opacity', instanceConfig.opacity);
      section.style.setProperty('--tech-grid-cell', `${instanceConfig.cellSize}px`);
      section.style.setProperty('--tech-grid-offset-x', `${instanceConfig.offsetX}px`);
      section.style.setProperty('--tech-grid-offset-y', `${instanceConfig.offsetY}px`);
      section.style.setProperty('--tech-grid-parallax-speed', instanceConfig.parallaxSpeed);

      // Store instance data
      this.gridInstances.set(section, instanceConfig);

      // Add entrance animation with delay
      setTimeout(() => {
         section.classList.add('tech-grid-visible');
      }, index * 100);
   }

   /**
    * Set up event listeners
    */
   setupEventListeners() {
      // Scroll listener with passive flag for performance
      window.addEventListener('scroll', this.handleScroll, { passive: true });

      // Resize listener
      window.addEventListener('resize', this.debounce(this.handleResize, 250));

      // Reduced motion change listener
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addListener((e) => {
         if (e.matches) {
            this.destroy();
         } else {
            this.init();
         }
      });

      // Performance monitoring
      if (this.config.enablePerformanceMonitoring) {
         this.startPerformanceMonitoring();
      }
   }

   /**
    * Handle scroll events with parallax
    */
   handleScroll() {
      if (!this.isInitialized || this.gridInstances.size === 0) return;

      this.scrollY = window.scrollY;

      // Use requestAnimationFrame for smooth performance
      if (!this.rafId) {
         this.rafId = requestAnimationFrame(() => {
            this.updateParallax();
            this.rafId = null;
         });
      }
   }

   /**
    * Update parallax positions for all grid instances
    */
   updateParallax() {
      this.gridInstances.forEach((config, section) => {
         const rect = section.getBoundingClientRect();
         const elementTop = rect.top + this.scrollY;
         const elementHeight = rect.height;
         const viewportHeight = window.innerHeight;

         // Calculate parallax offset
         const elementCenter = elementTop + elementHeight / 2;
         const viewportCenter = this.scrollY + viewportHeight / 2;
         const distanceFromCenter = elementCenter - viewportCenter;

         // Apply parallax with reduced motion consideration
         const parallaxMultiplier = this.prefersReducedMotion ?
            this.config.reducedMotionMultiplier :
            config.parallaxSpeed;

         const parallaxY = distanceFromCenter * parallaxMultiplier * 0.1;
         const parallaxX = Math.sin(distanceFromCenter * 0.001) * parallaxMultiplier * 5;

         // Apply transform
         section.style.setProperty('--tech-grid-shift-y', `${parallaxY}px`);
         section.style.setProperty('--tech-grid-shift-x', `${parallaxX}px`);

         // Visibility optimization
         const isVisible = rect.bottom >= 0 && rect.top <= viewportHeight;
         if (isVisible) {
            section.classList.remove('tech-grid-hidden');
            section.classList.add('tech-grid-visible');
         } else {
            section.classList.add('tech-grid-hidden');
            section.classList.remove('tech-grid-visible');
         }
      });
   }

   /**
    * Handle resize events
    */
   handleResize() {
      this.checkEnvironment();

      if (this.shouldDisable()) {
         this.destroy();
         return;
      }

      // Re-process sections if needed
      if (!this.isInitialized) {
         this.init();
      }
   }

   /**
    * Debounce function for performance
    */
   debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
         const later = () => {
            clearTimeout(timeout);
            func(...args);
         };
         clearTimeout(timeout);
         timeout = setTimeout(later, wait);
      };
   }

   /**
    * Performance monitoring (optional)
    */
   startPerformanceMonitoring() {
      const measureFPS = () => {
         const now = performance.now();
         const delta = now - this.lastFrameTime;
         this.lastFrameTime = now;

         this.frameCount++;
         if (this.frameCount % 60 === 0) {
            this.fps = 1000 / delta;

            // Disable on low performance
            if (this.fps < 30) {
               console.warn('Tech Grid: Low FPS detected, disabling parallax');
               this.config.parallaxSpeed = 0.05;
            }
         }

         if (this.isInitialized) {
            requestAnimationFrame(measureFPS);
         }
      };

      requestAnimationFrame(measureFPS);
   }

   /**
    * Check performance and adjust settings
    */
   checkPerformance() {
      // Basic performance check
      const memoryInfo = performance.memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
         // Reduce grid instances on memory pressure
         const instancesToRemove = Math.floor(this.gridInstances.size * 0.3);
         let removed = 0;

         this.gridInstances.forEach((config, section) => {
            if (removed < instancesToRemove) {
               section.classList.remove(this.config.gridClass);
               this.gridInstances.delete(section);
               removed++;
            }
         });
      }
   }

   /**
    * Get statistics about the grid system
    */
   getStats() {
      return {
         isInitialized: this.isInitialized,
         isMobile: this.isMobile,
         prefersReducedMotion: this.prefersReducedMotion,
         gridInstances: this.gridInstances.size,
         fps: this.fps,
         scrollY: this.scrollY
      };
   }

   /**
    * Destroy the tech grid system
    */
   destroy() {
      // Remove event listeners
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);

      // Cancel animation frame
      if (this.rafId) {
         cancelAnimationFrame(this.rafId);
         this.rafId = null;
      }

      // Clean up grid instances
      this.gridInstances.forEach((config, section) => {
         section.classList.remove(this.config.gridClass, 'tech-grid-visible', 'tech-grid-hidden');
         // Remove custom properties
         section.style.removeProperty('--tech-grid-opacity');
         section.style.removeProperty('--tech-grid-cell');
         section.style.removeProperty('--tech-grid-offset-x');
         section.style.removeProperty('--tech-grid-offset-y');
         section.style.removeProperty('--tech-grid-parallax-speed');
         section.style.removeProperty('--tech-grid-shift-y');
         section.style.removeProperty('--tech-grid-shift-x');
      });

      this.gridInstances.clear();
      this.isInitialized = false;
   }

   /**
    * Reinitialize the system
    */
   reinit(options = {}) {
      this.destroy();
      Object.assign(this.config, options);
      this.init();
   }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
         window.TechGridLayer = new TechGridLayer();
      });
   } else {
      window.TechGridLayer = new TechGridLayer();
   }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
   module.exports = TechGridLayer;
} else if (typeof define === 'function' && define.amd) {
   define([], () => TechGridLayer);
}
