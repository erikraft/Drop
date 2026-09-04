(function setupAnimatedQRFileSizeAndUIEnhancements() {
    'use strict';

    const FILE_INFO_ID = 'qr-send-file-info';
    const DISPLAY_SIZE_ID = 'qr-send-display-size';
    const CANVAS_ID = 'qr-send-canvas-container';
    const DEFAULT_FILE_SIZE = 'large';
    const SIZE_PX = { small: 220, medium: 280, large: 320 };

    const getEl = id => document.getElementById(id);

    function isFileTransferActive() {
        const fileInfo = getEl(FILE_INFO_ID);
        return !!fileInfo && !!fileInfo.textContent.trim();
    }

    function getSelectedSize() {
        return SIZE_PX[getEl(DISPLAY_SIZE_ID)?.value] || SIZE_PX[DEFAULT_FILE_SIZE];
    }

    function getResponsiveSize(size) {
        const width = window.innerWidth || document.documentElement.clientWidth || size;
        return Math.max(1, Math.min(size, width - (width <= 360 ? 12 : 24)));
    }

    function syncCanvasSize() {
        const container = getEl(CANVAS_ID);
        if (!container || !isFileTransferActive()) return;
        const requested = getSelectedSize();
        const rendered = getResponsiveSize(requested);
        container.classList.add('erikraft-file-qr-transfer');
        container.style.setProperty('--erikraft-file-qr-size', `${requested}px`);
        container.style.setProperty('--erikraft-file-qr-rendered-size', `${rendered}px`);
        container.style.width = `${rendered}px`;
        container.style.height = `${rendered}px`;
        container.style.maxWidth = `${rendered}px`;
        container.style.maxHeight = `${rendered}px`;
        container.querySelectorAll('svg, canvas').forEach(element => {
            element.style.width = `${rendered}px`;
            element.style.height = `${rendered}px`;
            element.style.maxWidth = `${rendered}px`;
            element.style.maxHeight = `${rendered}px`;
            element.style.minWidth = `${rendered}px`;
            element.style.minHeight = `${rendered}px`;
            element.style.display = 'block';
            element.setAttribute('width', String(rendered));
            element.setAttribute('height', String(rendered));
        });
    }

    function bindSizeControl() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || select.dataset.erikraftFileSizeBound === 'true') return;
        select.dataset.erikraftFileSizeBound = 'true';
        select.addEventListener('change', () => {
            select.dataset.erikraftUserSizeSelection = 'true';
            syncCanvasSize();
        });
    }

    function applyFileDefault() {
        const select = getEl(DISPLAY_SIZE_ID);
        if (!select || !isFileTransferActive()) return;
        if (select.dataset.erikraftUserSizeSelection !== 'true') select.value = DEFAULT_FILE_SIZE;
        syncCanvasSize();
    }

    function observeFileAndCanvas() {
        const fileInfo = getEl(FILE_INFO_ID);
        const container = getEl(CANVAS_ID);
        if (fileInfo && fileInfo.dataset.erikraftFileSizeObserver !== 'true') {
            fileInfo.dataset.erikraftFileSizeObserver = 'true';
            new MutationObserver(() => {
                if (fileInfo.textContent.trim()) applyFileDefault();
                else {
                    const select = getEl(DISPLAY_SIZE_ID);
                    if (select) delete select.dataset.erikraftUserSizeSelection;
                    container?.classList.remove('erikraft-file-qr-transfer');
                    if (container) ['width','height','max-width','max-height'].forEach(p => container.style.removeProperty(p));
                }
            }).observe(fileInfo, { childList: true, characterData: true, subtree: true });
        }
        if (container && container.dataset.erikraftFileCanvasObserver !== 'true') {
            container.dataset.erikraftFileCanvasObserver = 'true';
            new MutationObserver(() => { if (isFileTransferActive()) syncCanvasSize(); }).observe(container, { childList: true, subtree: true });
        }
    }

    function injectStyles() {
        if (getEl('erikraft-animated-qr-file-size-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-animated-qr-file-size-style';
        style.textContent = `
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer{width:var(--erikraft-file-qr-rendered-size,320px)!important;height:var(--erikraft-file-qr-rendered-size,320px)!important;max-width:var(--erikraft-file-qr-rendered-size,320px)!important;max-height:var(--erikraft-file-qr-rendered-size,320px)!important;min-width:0!important;min-height:0!important;margin:4px auto!important;overflow:hidden!important}
#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer>svg,#animated-qr-send-dialog #qr-send-canvas-container.erikraft-file-qr-transfer>canvas{display:block!important;width:var(--erikraft-file-qr-rendered-size,320px)!important;height:var(--erikraft-file-qr-rendered-size,320px)!important;max-width:none!important;max-height:none!important;min-width:var(--erikraft-file-qr-rendered-size,320px)!important;min-height:var(--erikraft-file-qr-rendered-size,320px)!important}
body.light-theme #animated-qr-main-dialog .dialog-title,body.light-theme #animated-qr-send-dialog .dialog-title,body.light-theme #animated-qr-receive-dialog .dialog-title,body.light-theme #qr-scanner-dialog .dialog-title,body.light-theme #qr-scanner-confirm-dialog .dialog-title{color:#fff!important}
#qr-receive-text-preview{width:100%;max-width:100%;max-height:min(42vh,420px);overflow:auto;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;user-select:text;-webkit-user-select:text;padding:12px;margin:10px 0;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 5%,transparent);text-align:left}
#qr-receive-complete-sha{user-select:text;-webkit-user-select:text;overflow-wrap:anywhere;word-break:break-word}
#qr-receive-complete-actions{display:flex;flex-wrap:wrap;gap:8px;width:100%;justify-content:center;box-sizing:border-box}
@media(max-width:600px){#qr-receive-complete-actions>.btn{flex:1 1 100%;min-height:44px}}
/* Close, cancel and back actions use the requested red destructive/navigation treatment. */
x-dialog button[close],x-dialog button[id*="close" i],x-dialog button[id*="cancel" i],x-dialog button[id*="back" i],x-dialog .close-btn,x-dialog .cancel-btn,x-dialog .back-btn,x-dialog [data-action="close"],x-dialog [data-action="cancel"],x-dialog [data-action="back"]{background-color:#dc3545!important;border-color:#dc3545!important;color:#fff!important}
x-dialog button[close]:hover,x-dialog button[id*="close" i]:hover,x-dialog button[id*="cancel" i]:hover,x-dialog button[id*="back" i]:hover,x-dialog .close-btn:hover,x-dialog .cancel-btn:hover,x-dialog .back-btn:hover,x-dialog [data-action="close"]:hover,x-dialog [data-action="cancel"]:hover,x-dialog [data-action="back"]:hover{filter:brightness(.9)}
`;
        document.head.appendChild(style);
    }

    const copyText = text => {
        if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
        return new Promise((resolve, reject) => {
            try {
                const area = document.createElement('textarea');
                area.value = text; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0';
                document.body.appendChild(area); area.select();
                const ok = document.execCommand('copy'); area.remove();
                ok ? resolve() : reject(new Error('copy-failed'));
            } catch (error) { reject(error); }
        });
    };

    const notify = message => { if (typeof Events !== 'undefined') Events.fire('notify-user', message); };
    const tr = (key, fallback) => {
        try { return typeof Localization !== 'undefined' ? (Localization.getTranslation(key) || fallback) : fallback; }
        catch (_) { return fallback; }
    };

    function downloadTxt(text) {
        const blob = new Blob([text], { type:'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const d = new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
        const a = document.createElement('a'); a.href=url; a.download=`ErikrafTDrop_QR_Text_${stamp}.txt`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    }

    function enhanceQrTextResult(dialog, result) {
        if (!dialog || result?.type !== 'text' || typeof result.text !== 'string' || !dialog.$completeContainer) return;
        const container = dialog.$completeContainer;
        let preview = container.querySelector('#qr-receive-text-preview');
        if (!preview) {
            preview = document.createElement('div'); preview.id='qr-receive-text-preview';
            preview.setAttribute('role','textbox'); preview.setAttribute('aria-readonly','true'); preview.tabIndex=0;
            dialog.$completeFilename?.insertAdjacentElement('afterend', preview) || container.appendChild(preview);
        }
        // Security boundary: received QR text is data, never HTML.
        preview.textContent = result.text;

        let actions = container.querySelector('#qr-receive-complete-actions');
        if (!actions) { actions=document.createElement('div'); actions.id='qr-receive-complete-actions'; container.appendChild(actions); }
        const button = (id,label,handler) => {
            let b=actions.querySelector(`#${id}`);
            if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='btn btn-rounded';actions.appendChild(b);}
            b.textContent=label;b.onclick=handler;return b;
        };
        const copy = button('qr-receive-copy-text',tr('dialogs.animated-qr-copy-text','Copiar texto'),async()=>{
            try{await copyText(result.text);notify(tr('notifications.copied-to-clipboard','Texto copiado para a área de transferência.'));}
            catch(e){console.warn('[Animated QR] Text copy failed:',e);notify(tr('notifications.copied-to-clipboard-error','Não foi possível copiar o texto.'));}
        });
        const sha=typeof result.sha==='string'?result.sha.trim():'';
        const copySha=button('qr-receive-copy-sha','Copiar SHA-256',async()=>{
            if(!sha)return;try{await copyText(sha);notify(tr('notifications.copied-to-clipboard','SHA-256 copiado para a área de transferência.'));}
            catch(e){console.warn('[Animated QR] SHA copy failed:',e);notify(tr('notifications.copied-to-clipboard-error','Não foi possível copiar o SHA-256.'));}
        });
        copySha.disabled=!sha;
        button('qr-receive-download-txt',tr('dialogs.download','Baixar .txt'),()=>downloadTxt(result.text));
        if(dialog.$actionBtn){
            dialog.$actionBtn.textContent=tr('dialogs.animated-qr-copy-text','Copiar texto');
            dialog.$actionBtn.onclick=async()=>{try{await copyText(result.text);notify(tr('notifications.copied-to-clipboard','Texto copiado para a área de transferência.'));}catch(e){console.warn('[Animated QR] Text copy failed:',e);notify(tr('notifications.copied-to-clipboard-error','Não foi possível copiar o texto.'));}};
        }
    }

    function patchAnimatedQrReceive() {
        if(typeof AnimatedQRReceiveDialog==='undefined') return;
        const proto=AnimatedQRReceiveDialog.prototype;
        if(proto.__erikrafTQrTextActionsPatched)return;
        const original=proto.openScanner;proto.__erikrafTQrTextActionsPatched=true;
        proto.openScanner=function(...args){
            const out=original.apply(this,args);let tries=0;
            const attach=()=>{tries++;const scanner=this.scanner;
                if(scanner&&typeof scanner.onComplete==='function'&&!scanner.__erikrafTQrTextActionsWrapped){
                    const callback=scanner.onComplete;scanner.__erikrafTQrTextActionsWrapped=true;
                    scanner.onComplete=res=>{callback.call(scanner,res);if(res?.type==='text')enhanceQrTextResult(this,res);};return;
                }
                if(tries<100)setTimeout(attach,10);
            };setTimeout(attach,0);return out;
        };
    }

    const MAX_CHAT_TEXT=100000, MAX_CHAT_ATTACHMENT=8*1024*1024;
    function sanitizeAttachment(a){
        if(!a||typeof a!=='object')return null;
        const type=typeof a.type==='string'?a.type.toLowerCase():'';
        const data=typeof a.dataUrl==='string'?a.dataUrl:'';
        const video=type.startsWith('video/');
        const prefix=video?'video':'image';
        if(!new RegExp(`^data:${prefix}/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$`,'i').test(data))return null;
        const comma=data.indexOf(',');if(comma<0)return null;
        const estimated=Math.floor((data.length-comma-1)*3/4);if(estimated>MAX_CHAT_ATTACHMENT)return null;
        return {name:typeof a.name==='string'?a.name.slice(0,255):'attachment',type:type||`${prefix}/${video?'mp4':'png'}`,size:Math.min(Math.max(Number(a.size)||estimated,0),MAX_CHAT_ATTACHMENT),kind:video?'video':'image',dataUrl:data};
    }

    function patchChatAndNetwork(){
        if(typeof ChatUI!=='undefined'&&!ChatUI.prototype.__erikrafTChatHardeningPatched){
            const proto=ChatUI.prototype;proto.__erikrafTChatHardeningPatched=true;
            proto._refreshRoomSelect=function(){
                const rooms=Array.from(this._rooms.values());
                if(!rooms.length){this.$roomSelect.replaceChildren();this.$roomSelect.disabled=true;this._currentRoomKey=null;if(this.$status)this.$status.textContent='';return;}
                this.$roomSelect.disabled=false;this.$roomSelect.replaceChildren();
                rooms.forEach(room=>{const o=document.createElement('option');o.value=room.key;o.textContent=`${this._roomLabel(room.roomType,room.roomId)} (${room.peers.size})`;this.$roomSelect.appendChild(o);});
                if(!this._currentRoomKey||!this._rooms.has(this._currentRoomKey))this._currentRoomKey=rooms[0].key;
                this.$roomSelect.value=this._currentRoomKey;this._renderRoom(this._currentRoomKey);
            };
            const originalReceive=proto._onChatReceived;
            proto._onChatReceived=function(message){
                if(!message||typeof message!=='object')return;
                const text=typeof message.text==='string'?message.text:'';
                if(text.length>MAX_CHAT_TEXT){notify(tr('notifications.text-content-incorrect','Mensagem de chat muito grande.'));return;}
                if(message.attachment){const attachment=sanitizeAttachment(message.attachment);if(!attachment){notify(tr('notifications.files-incorrect','Anexo de chat inválido ou muito grande.'));return;}message={...message,attachment};}
                originalReceive.call(this,{...message,text});
            };
            proto._updateMessageStatus=function(messageId,status){
                if(typeof messageId!=='string')return;
                for(const node of this.$messages.querySelectorAll('[data-message-id]'))if(node.dataset.messageId===messageId){const statusNode=node.querySelector('.chat-status');if(statusNode)statusNode.textContent=this._statusLabel(status);return;}
            };
        }
        if(typeof ServerConnection!=='undefined'&&!ServerConnection.prototype.__erikrafTMessageHardeningPatched){
            const proto=ServerConnection.prototype,original=proto._onMessage;proto.__erikrafTMessageHardeningPatched=true;
            proto._onMessage=function(message){try{return original.call(this,message);}catch(error){console.warn('[Network] Ignored malformed server message.',error);}};
        }
        if(typeof Peer!=='undefined'&&!Peer.prototype.__erikrafTMessageHardeningPatched){
            const proto=Peer.prototype,original=proto._onMessage;proto.__erikrafTMessageHardeningPatched=true;
            proto._onMessage=function(message){try{return original.call(this,message);}catch(error){console.warn('[Peer] Ignored malformed peer message.',error);}};
        }
        if(typeof PeersManager!=='undefined'&&!PeersManager.prototype.__erikrafTRelayHardeningPatched){
            const proto=PeersManager.prototype,original=proto._onWsRelay;proto.__erikrafTRelayHardeningPatched=true;
            proto._onWsRelay=function(message){try{const parsed=typeof message==='string'?JSON.parse(message):message;const senderId=parsed?.sender?.id;if(!senderId||!this.peers[senderId])return;return original.call(this,message);}catch(error){console.warn('[Network] Ignored malformed websocket relay message.',error);}};
        }
    }

    function loadEnhancementAfterUI(){
        if(document.getElementById('erikraft-ui-hardening-bootstrap'))return;
        if(typeof ChatUI==='undefined'||typeof AnimatedQRReceiveDialog==='undefined'||typeof ServerConnection==='undefined'){
            setTimeout(loadEnhancementAfterUI,50);return;
        }
        const script=document.createElement('script');script.id='erikraft-ui-hardening-bootstrap';script.src='scripts/erikraft-ui-hardening-bootstrap.js';script.async=false;
        document.head.appendChild(script);
    }

    function init(){
        injectStyles();bindSizeControl();observeFileAndCanvas();applyFileDefault();
        window.addEventListener('resize',()=>{if(isFileTransferActive())syncCanvasSize();},{passive:true});
        // Bootstrap the more extensive QR/Chat patch only after ui.js has defined its classes.
        loadEnhancementAfterUI();
    }

    init();
})();
