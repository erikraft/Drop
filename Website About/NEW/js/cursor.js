(() => {
   const root = document.documentElement;
   const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
   const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches;

   if (!supportsFinePointer || isTouchDevice) {
      root.classList.remove('cursor-enhanced');
      return;
   }

   const cursor = document.createElement('div');
   cursor.className = 'site-cursor';
   cursor.setAttribute('aria-hidden', 'true');

   const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
   arrow.setAttribute('class', 'site-cursor-arrow');
   arrow.setAttribute('viewBox', '0 0 20 20');
   arrow.setAttribute('fill', 'none');
   arrow.innerHTML = `
      <path d="M2 2 L16 7 L10 11 L6 18 Z"
            fill="#4A8FE0"
            stroke="#ffffff"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"/>
   `;

   const badge = document.createElement('div');
   badge.className = 'site-cursor-badge';
   badge.textContent = cursor.dataset.label || 'Você';

   cursor.append(arrow, badge);
   document.body.appendChild(cursor);
   root.classList.add('cursor-enhanced');

   let lastX = -9999;
   let lastY = -9999;

   const show = () => cursor.classList.add('is-visible');
   const hide = () => cursor.classList.remove('is-visible', 'is-clicking');

   const render = (x, y) => {
      lastX = x;
      lastY = y;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
   };

   document.addEventListener('mousemove', (e) => {
      show();
      render(e.clientX, e.clientY);
   }, { passive: true });

   document.addEventListener('mousedown', () => {
      cursor.classList.add('is-clicking');
      if (lastX !== -9999) render(lastX, lastY);
   }, { passive: true });

   document.addEventListener('mouseup', () => {
      cursor.classList.remove('is-clicking');
      if (lastX !== -9999) render(lastX, lastY);
   }, { passive: true });

   document.addEventListener('mouseleave', hide, { passive: true });
   window.addEventListener('blur', hide, { passive: true });
   document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
   });
})();