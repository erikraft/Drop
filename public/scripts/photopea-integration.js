(function () {
    // Minimal integration for Photopea and Vectorpea using iframe + postMessage
    function createEditorOverlay(url) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = 99999;
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'stretch';
        overlay.style.justifyContent = 'center';

        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.maxWidth = '1400px';
        container.style.maxHeight = '900px';
        container.style.borderRadius = '6px';
        container.style.overflow = 'hidden';
        container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)';
        container.style.background = '#fff';

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.border = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Fechar editor';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '16px';
        closeBtn.style.top = '16px';
        closeBtn.style.zIndex = 100000;
        closeBtn.style.padding = '8px 12px';

        container.appendChild(iframe);
        overlay.appendChild(container);
        overlay.appendChild(closeBtn);

        closeBtn.addEventListener('click', () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });

        document.body.appendChild(overlay);

        return { overlay, iframe, closeBtn };
    }

    function dataURLToBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = e => reject(e);
            fr.readAsDataURL(file);
        });
    }

    function setupIntegration(urlBase, file) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('PhotopeaIntegration: setupIntegration start', urlBase, file && file.name);
                const { overlay, iframe, closeBtn } = createEditorOverlay(urlBase);

                const onMessage = async (e) => {
                    if (e.source !== iframe.contentWindow) return;
                    const msg = e.data;
                    console.log('PhotopeaIntegration: received message from iframe (full):', msg);
                    // Photopea/Vectorpea may send readiness or export messages; handle export
                    if (msg.type === 'export' && msg.data) {
                        // msg.data expected to be dataURL
                        try {
                            const blob = dataURLToBlob(msg.data);
                            const name = msg.name || file.name || 'edited'
                            downloadBlob(blob, name);
                        }
                        catch (err) {
                            console.error('Could not process exported data', err);
                        }
                    }
                    // Close overlay if editor indicates closing
                    if (msg.type === 'close') {
                        window.removeEventListener('message', onMessage);
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }
                };

                window.addEventListener('message', onMessage);

                // After iframe loads, send the file as DataURL
                iframe.addEventListener('load', async () => {
                    console.log('PhotopeaIntegration: iframe loaded, preparing to send file', file && file.name);
                    try {
                        const dataUrl = await readFileAsDataURL(file);
                        console.log('PhotopeaIntegration: file converted to DataURL, size approx', (dataUrl && dataUrl.length) || 0);
                        // Send an 'open' message. Photopea/Vectorpea accept different message formats,
                        // but they both understand a general {type: 'open', name, data} message when using postMessage.
                        let acknowledged = false;
                        let attempts = 0;
                        const maxAttempts = 5;

                        const sendOpen = () => {
                            try {
                                iframe.contentWindow.postMessage({ type: 'open', name: file.name, data: dataUrl }, '*');
                                attempts++;
                                console.log('PhotopeaIntegration: postMessage open sent, attempt', attempts);
                            }
                            catch (err) {
                                console.error('PhotopeaIntegration: postMessage failed', err);
                            }
                        };

                        // mark acknowledged when any message arrives from iframe
                        const ackListener = (e) => {
                            if (e.source !== iframe.contentWindow) return;
                            if (e.data) {
                                acknowledged = true;
                            }
                        };
                        window.addEventListener('message', ackListener);

                        // send immediately and then retry a few times if no ack
                        sendOpen();
                        const resendInterval = setInterval(() => {
                            if (acknowledged || attempts >= maxAttempts) {
                                clearInterval(resendInterval);
                                window.removeEventListener('message', ackListener);
                                if (!acknowledged) console.warn('PhotopeaIntegration: no acknowledgement from iframe after attempts');
                                return;
                            }
                            sendOpen();
                        }, 1200);

                        // Provide a helper message that parent can ask the editor to export later.
                        resolve({
                            iframe: iframe,
                            close: () => {
                                window.removeEventListener('message', onMessage);
                                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                            }
                        });
                    }
                    catch (err) {
                        console.error('PhotopeaIntegration: error preparing file for editor', err);
                        window.removeEventListener('message', onMessage);
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                        reject(err);
                    }
                });

                // If user closes overlay via button
                closeBtn.addEventListener('click', () => {
                    window.removeEventListener('message', onMessage);
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                });

            }
            catch (err) {
                console.error('PhotopeaIntegration: setupIntegration top-level error', err);
                reject(err);
            }
        });
    }

    window.PhotopeaIntegration = {
        editWithPhotopea: async function (file) {
            console.log('PhotopeaIntegration.editWithPhotopea called', file && file.name);
            if (!file) return;
            const url = 'https://www.photopea.com';
            try {
                await setupIntegration(url, file);
            }
            catch (e) {
                console.error('Photopea integration failed', e);
                alert('Não foi possível abrir o editor Photopea. Você pode baixar o arquivo e abrir manualmente.');
            }
        },
        editWithVectorpea: async function (file) {
            console.log('PhotopeaIntegration.editWithVectorpea called', file && file.name);
            if (!file) return;
            const url = 'https://www.vectorpea.com';
            try {
                await setupIntegration(url, file);
            }
            catch (e) {
                console.error('Vectorpea integration failed', e);
                alert('Não foi possível abrir o editor Vectorpea. Você pode baixar o arquivo e abrir manualmente.');
            }
        }
    };
})();
