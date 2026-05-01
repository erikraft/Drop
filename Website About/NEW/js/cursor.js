(() => {
   const root = document.documentElement;

   const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
   const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

   if (!supportsFinePointer || isTouchDevice) {
      root.classList.remove('cursor-enhanced');
      return;
   }

   const cursor = document.createElement('div');
   cursor.className = 'site-cursor';
   cursor.setAttribute('aria-hidden', 'true');

   cursor.innerHTML = `
      <svg class="site-cursor-arrow" viewBox="0 0 20 20">
         <path d="M2 2 L16 7 L10 11 L6 18 Z"
            fill="#4A8FE0"
            stroke="#ffffff"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"/>
      </svg>
      <div class="site-cursor-badge">You</div>
   `;

   document.body.appendChild(cursor);
   root.classList.add('cursor-enhanced');

   let mouseX = 0, mouseY = 0;

   const show = () => {
      cursor.classList.add('is-visible');
   };

   const hide = () => {
      cursor.classList.remove('is-visible');
   };

   const update = () => {
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      requestAnimationFrame(update);
   };

   update();

   document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      show();
   }, { passive: true });

   document.addEventListener('mousedown', () => {
      cursor.classList.add('is-clicking');
   });

   document.addEventListener('mouseup', () => {
      cursor.classList.remove('is-clicking');
   });

   document.addEventListener('mouseleave', hide);
   window.addEventListener('blur', hide);
})();