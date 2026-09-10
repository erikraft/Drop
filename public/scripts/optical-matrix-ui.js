/* Minimal, isolated UI for the experimental Optical Matrix sender. */
(function () {
    'use strict';
    function open() {
        let dialog = document.getElementById('optical-matrix-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog'); dialog.id = 'optical-matrix-dialog'; dialog.className = 'optical-matrix-dialog';
            dialog.innerHTML = '<form method="dialog"><h2>ErikrafT Optical Matrix <small>Experimental</small></h2><p>Colour and symbol matrix for local optical experiments. It is not Cimbar or CFC compatible, and camera decoding is not available yet.</p><label for="optical-matrix-text">Text to encode</label><textarea id="optical-matrix-text" rows="4" maxlength="400"></textarea><p id="optical-matrix-status" role="status"></p><canvas id="optical-matrix-canvas" aria-label="Optical Matrix encoded payload"></canvas><menu><button value="cancel" class="btn btn-rounded btn-grey">Close</button><button type="button" id="optical-matrix-generate" class="btn btn-rounded btn-primary">Generate matrix</button></menu></form>';
            document.body.appendChild(dialog);
            dialog.querySelector('#optical-matrix-generate').addEventListener('click', () => {
                const text = dialog.querySelector('#optical-matrix-text').value;
                const status = dialog.querySelector('#optical-matrix-status');
                try { const encoder = new window.ErikrafTOpticalMatrix.OpticalMatrixEncoder(); const encoded = encoder.encode(new TextEncoder().encode(text)); encoder.render(dialog.querySelector('canvas'), encoded); status.textContent = `${text.length} characters encoded (${encoded.capacity} bytes/frame capacity).`; }
                catch (error) { status.textContent = error.message; }
            });
        }
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    }
    document.addEventListener('DOMContentLoaded', () => document.getElementById('optical-matrix-info-btn')?.addEventListener('click', open));
})();
