/* ErikrafT Drop™ — WebTorrent browser transfer mode (Beta) */
(function () {
    'use strict';

    var TRACKERS = [
        'wss://tracker.btorrent.xyz',
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.fastcast.nz'
    ];
    var CLIENT_SRC = 'https://cdn.jsdelivr.net/npm/webtorrent@3.0.11/webtorrent.min.js';
    var clientPromise = null;

    function loadClient() {
        if (clientPromise) return clientPromise;
        clientPromise = new Promise(function (resolve, reject) {
            if (window.WebTorrent) return resolve(window.WebTorrent);
            var script = document.createElement('script');
            script.src = CLIENT_SRC;
            script.async = true;
            script.onload = function () {
                if (window.WebTorrent) resolve(window.WebTorrent);
                else reject(new Error('WebTorrent não foi carregado.'));
            };
            script.onerror = function () { reject(new Error('Não foi possível carregar o WebTorrent.')); };
            document.head.appendChild(script);
        });
        return clientPromise;
    }

    function status(text, error) {
        var el = document.getElementById('webtorrent-status');
        if (el) {
            el.textContent = text;
            el.classList.toggle('text-danger', !!error);
        }
    }

    function progress(value) {
        var el = document.getElementById('webtorrent-progress');
        if (el) el.value = Math.max(0, Math.min(100, value || 0));
    }

    function getClient() {
        return loadClient().then(function (Ctor) {
            if (!window.__erikraftWebTorrentClient) {
                window.__erikraftWebTorrentClient = new Ctor();
            }
            return window.__erikraftWebTorrentClient;
        });
    }

    function closeDialog() {
        var dialog = document.getElementById('webtorrent-dialog');
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.setAttribute('hidden', '');
    }

    function seed() {
        var input = document.getElementById('webtorrent-file');
        var file = input && input.files && input.files[0];
        if (!file) return status('Selecione um arquivo primeiro.', true);

        status('Criando transferência WebTorrent…');
        progress(0);

        getClient().then(function (client) {
            return new Promise(function (resolve, reject) {
                var done = false;
                client.seed(file, { announce: TRACKERS }, function (torrent) {
                    if (!done) {
                        done = true;
                        resolve(torrent);
                    }
                });
                client.on('error', function (error) {
                    if (!done) {
                        done = true;
                        reject(error);
                    }
                });
            });
        }).then(function (torrent) {
            document.getElementById('webtorrent-magnet').value = torrent.magnetURI;
            status('Transferência criada. Compartilhe o magnet URI com o receptor.');
            torrent.on('download', function () {
                progress(torrent.progress * 100);
            });
        }).catch(function (error) {
            status(error && error.message ? error.message : 'Falha ao criar a transferência.', true);
        });
    }

    function receive() {
        var input = document.getElementById('webtorrent-magnet');
        var magnet = input && input.value.trim();
        if (!magnet || !/^magnet:/i.test(magnet)) {
            return status('Cole um magnet URI válido.', true);
        }

        status('Conectando aos peers…');
        progress(0);

        getClient().then(function (client) {
            client.add(magnet, { announce: TRACKERS }, function (torrent) {
                status('Recebendo arquivo…');
                torrent.on('download', function () {
                    progress(torrent.progress * 100);
                });
                torrent.on('done', function () {
                    progress(100);
                    status('Transferência concluída.');
                    var file = torrent.files && torrent.files[0];
                    if (!file) return;
                    file.getBlobURL(function (error, url) {
                        if (error) {
                            return status(error.message || 'Não foi possível preparar o download.', true);
                        }
                        var result = document.getElementById('webtorrent-result');
                        result.textContent = '';
                        var link = document.createElement('a');
                        link.href = url;
                        link.download = file.name;
                        link.textContent = 'Baixar ' + file.name;
                        link.className = 'btn btn-rounded btn-primary';
                        result.appendChild(link);
                    });
                });
            });
        }).catch(function (error) {
            status(error && error.message ? error.message : 'Falha ao receber a transferência.', true);
        });
    }

    function copyMagnet() {
        var input = document.getElementById('webtorrent-magnet');
        if (!input || !input.value) return status('Nenhum magnet URI para copiar.', true);
        var copy = navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject();
        copy.then(function () {
            status('Magnet URI copiado.');
        }).catch(function () {
            input.select();
            document.execCommand('copy');
            status('Magnet URI copiado.');
        });
    }

    function createUI() {
        if (document.getElementById('webtorrent-btn')) return;
        var header = document.querySelector('header');
        if (!header) return;

        var button = document.createElement('div');
        button.id = 'webtorrent-btn';
        button.className = 'icon-button';
        button.title = 'WebTorrent (Beta)';
        button.setAttribute('aria-label', 'WebTorrent (Beta)');
        button.innerHTML = '<i class="fa-solid fa-network-wired" aria-hidden="true"></i>';
        header.insertBefore(button, header.firstElementChild);

        var dialog = document.createElement('x-dialog');
        dialog.id = 'webtorrent-dialog';
        dialog.className = 'erikraft-qr-dialog';
        dialog.innerHTML = '<x-background class="full center"><x-paper shadow="2" style="max-width:650px;width:92%;"><div class="row center p-2"><h2 class="dialog-title">WebTorrent (Beta)</h2></div><div class="column gap-2 p-3"><div class="font-body2 text-secondary">Transferência P2P entre navegadores compatíveis. Nenhum arquivo é armazenado como um upload central.</div><label class="font-caption">Enviar arquivo</label><input id="webtorrent-file" type="file" class="fw"><button id="webtorrent-seed" type="button" class="btn btn-rounded btn-primary">Criar transferência</button><label class="font-caption">Magnet URI</label><textarea id="webtorrent-magnet" class="fw textarea" rows="4" placeholder="Cole o magnet URI aqui"></textarea><div class="row gap-2 wrap"><button id="webtorrent-copy" type="button" class="btn btn-rounded btn-grey">Copiar magnet</button><button id="webtorrent-receive" type="button" class="btn btn-rounded btn-primary">Receber</button></div><progress id="webtorrent-progress" class="fw" value="0" max="100"></progress><div id="webtorrent-status" class="font-caption text-secondary">Pronto.</div><div id="webtorrent-result" class="font-caption word-break"></div></div><div class="btn-row row-reverse wrap p-2"><button id="webtorrent-close" class="btn btn-rounded btn-grey" type="button">Fechar</button></div></x-paper></x-background>';
        document.body.appendChild(dialog);

        button.addEventListener('click', function () {
            if (typeof dialog.open === 'function') dialog.open();
            else dialog.removeAttribute('hidden');
        });
        document.getElementById('webtorrent-close').addEventListener('click', closeDialog);
        document.getElementById('webtorrent-seed').addEventListener('click', seed);
        document.getElementById('webtorrent-receive').addEventListener('click', receive);
        document.getElementById('webtorrent-copy').addEventListener('click', copyMagnet);
    }

    document.addEventListener('DOMContentLoaded', createUI);
}());
