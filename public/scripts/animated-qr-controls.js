(function setupAnimatedQRRuntimeControls() {
    'use strict';

    const IDS = {
        activeButtons: 'qr-send-active-buttons', pause: 'qr-send-pause-btn',
        previous: 'qr-send-previous-btn', next: 'qr-send-next-btn', seek: 'qr-send-frame-seek',
        frameInput: 'qr-send-frame-input', frameGo: 'qr-send-frame-go-btn', frameGroup: 'qr-send-frame-input-group',
        seekWrapper: 'qr-send-frame-seek-wrapper', bytes: 'qr-send-bytes-per-frame', ecc: 'qr-send-ecc-level',
        layout: 'qr-send-layout', displaySize: 'qr-send-display-size', fps: 'qr-send-fps-slider',
        fpsValue: 'qr-send-fps-val', fpsSpeed: 'qr-send-fps-speed'
    };
    const getEl = id => document.getElementById(id);
    const getTransmitter = () => window.erikrafTdrop?.animatedQRSendDialog?.transmitter || null;
    const stopTimer = tx => { if (tx?.timer) clearTimeout(tx.timer); if (tx) tx.timer = null; };
    const clamp = (tx, index) => {
        const total = Array.isArray(tx?.frames) ? tx.frames.length : 0;
        if (!total) return 0;
        const n = Number(index);
        return Math.max(0, Math.min(Number.isFinite(n) ? Math.trunc(n) : 0, total - 1));
    };
    const chunkLimit = ecc => ({ L: 1465, M: 1100, Q: 800, H: 600 }[ecc] || 1465);

    function injectStyles() {
        if (getEl('erikraft-animated-qr-runtime-style')) return;
        const style = document.createElement('style');
        style.id = 'erikraft-animated-qr-runtime-style';
        style.textContent = `
#animated-qr-send-dialog .erikraft-qr-paper{display:flex;flex-direction:column;min-height:0;width:min(720px,calc(100vw - 20px));max-width:720px;max-height:calc(100dvh - 16px);overflow:hidden;box-sizing:border-box}
#animated-qr-send-dialog #qr-send-active-view,#animated-qr-send-dialog #qr-send-compose-view{flex:1 1 auto;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;width:100%;box-sizing:border-box;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-gutter:stable}
#animated-qr-send-dialog #qr-send-active-buttons,#animated-qr-send-dialog #qr-send-compose-buttons{position:relative;flex:0 0 auto;z-index:2;width:100%;box-sizing:border-box;margin:0;padding:10px max(12px,2vw) max(12px,env(safe-area-inset-bottom));background:var(--paper-color,var(--background-color,#fff));border-top:1px solid color-mix(in srgb,currentColor 12%,transparent);overflow:visible;justify-content:center;align-items:center}
#animated-qr-send-dialog #qr-send-active-view>.column{min-width:0;width:100%}
#animated-qr-send-dialog #qr-send-canvas-container{width:min(320px,calc(100vw - 64px));min-height:220px;margin:4px auto;flex:0 0 auto;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box}
#animated-qr-send-dialog #qr-send-canvas-container.layout-1{width:min(300px,calc(100vw - 64px));height:min(300px,calc(100vw - 64px))}
#animated-qr-send-dialog #qr-send-canvas-container.layout-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(340px,calc(100vw - 32px));height:auto}
#animated-qr-send-dialog #qr-send-canvas-container.layout-4{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;width:min(340px,calc(100vw - 32px));height:auto}
#animated-qr-send-dialog .qr-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;width:100%;background:#ffffff;padding:4px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.12)}
#animated-qr-send-dialog .qr-tile svg,#animated-qr-send-dialog .qr-tile canvas,#animated-qr-send-dialog #qr-send-canvas-container>svg,#animated-qr-send-dialog #qr-send-canvas-container>canvas{display:block;width:100%!important;height:100%!important;max-width:100%;max-height:100%}
#animated-qr-send-dialog #qr-send-active-buttons>.btn{flex:0 1 auto;min-width:120px;max-width:220px;margin:0}
#animated-qr-send-dialog #qr-send-frame-seek-wrapper,#animated-qr-send-dialog #qr-send-frame-input-group{width:100%;box-sizing:border-box}
#animated-qr-send-dialog #qr-send-frame-seek{width:100%;min-width:0;height:8px;touch-action:pan-x;accent-color:#0d6efd}
#animated-qr-send-dialog #qr-send-frame-input-group{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
#animated-qr-send-dialog #qr-send-frame-input{width:96px;min-height:40px;box-sizing:border-box;text-align:center}
#animated-qr-send-dialog #qr-send-frame-go-btn{min-height:40px}
#animated-qr-send-dialog #qr-send-bytes-per-frame,#animated-qr-send-dialog #qr-send-ecc-level,#animated-qr-send-dialog #qr-send-layout,#animated-qr-send-dialog #qr-send-display-size{min-width:0;max-width:100%;box-sizing:border-box}
@media(max-width:600px){#animated-qr-send-dialog .erikraft-qr-paper{width:calc(100vw - 12px);max-height:calc(100dvh - 8px)}#animated-qr-send-dialog #qr-send-active-view,#animated-qr-send-dialog #qr-send-compose-view{padding:12px!important}#animated-qr-send-dialog #qr-send-active-buttons,#animated-qr-send-dialog #qr-send-compose-buttons{padding-left:10px;padding-right:10px;gap:8px}#animated-qr-send-dialog #qr-send-active-buttons>.btn,#animated-qr-send-dialog #qr-send-compose-buttons>.btn{flex:1 1 calc(50% - 8px);min-width:0;max-width:none;min-height:44px}#animated-qr-send-dialog #qr-send-canvas-container{width:min(280px,calc(100vw - 48px));height:min(280px,calc(100vw - 48px))}}
@media(max-width:360px){#animated-qr-send-dialog #qr-send-active-buttons>.btn,#animated-qr-send-dialog #qr-send-compose-buttons>.btn{flex-basis:100%}#animated-qr-send-dialog #qr-send-canvas-container{width:min(240px,calc(100vw - 40px));height:min(240px,calc(100vw - 40px))}}
        `;
        document.head.appendChild(style);
    }

    function readSettings() {
        const fps = Math.max(1, Math.min(30, Number.parseInt(getEl(IDS.fps)?.value, 10) || 6));
        const ecc = ['L','M','Q','H'].includes(getEl(IDS.ecc)?.value) ? getEl(IDS.ecc).value : 'L';
        const requested = Number.parseInt(getEl(IDS.bytes)?.value, 10) || 1465;
        return { fps, ecc, requested, bytes: Math.min(Math.max(256, requested), chunkLimit(ecc)) };
    }
    function normalizeSettingsUI() {
        const fpsEl = getEl(IDS.fps);
        if (fpsEl) { fpsEl.min='1'; fpsEl.max='30'; fpsEl.value=String(Math.max(1,Math.min(30,Number.parseInt(fpsEl.value,10)||6))); }
        const {ecc,bytes} = readSettings();
        const bytesEl = getEl(IDS.bytes);
        if (bytesEl) {
            [...bytesEl.options].forEach(o => { const n=Number.parseInt(o.value,10); o.hidden=!Number.isFinite(n)||n>chunkLimit(ecc); });
            bytesEl.value=String(bytes);
            const selected=bytesEl.selectedOptions[0];
            if(selected) selected.textContent=`${bytes} bytes (efetivo)`;
        }
        const fpsValue=getEl(IDS.fpsValue); if(fpsValue) fpsValue.textContent=`${fpsEl?.value||6} FPS`;
    }
    function applySettings(tx) {
        const s=readSettings(); tx.fps=s.fps; tx.eccLevel=s.ecc; tx.chunkSize=s.bytes;
        tx.layout=getEl(IDS.layout)?.value||'1'; tx.displaySize=getEl(IDS.displaySize)?.value||'medium';
        tx.requestedChunkSize=s.requested; tx.effectiveChunkSize=s.bytes;
    }
    function installPreparationBridge() {
        const proto=window.ErikrafTQRTransmitter?.prototype;
        if(!proto||proto.__erikraftSettingsBridgeInstalled||typeof proto.prepareBuffer!=='function') return !!proto;
        const original=proto.prepareBuffer; proto.__erikraftSettingsBridgeInstalled=true;
        proto.prepareBuffer=async function(buffer,metadata){applySettings(this);return original.call(this,buffer,metadata);};
        return true;
    }
    function showActive(){[getEl('qr-send-active-view'),getEl(IDS.activeButtons),getEl('qr-send-canvas-container')].forEach(el=>{if(el){el.hidden=false;el.removeAttribute('hidden');}});}
    function render(tx){
        if(!tx?.initialized||!tx.frames?.length||!tx.containerEl) return false;
        const qr=window.ErikrafTDropQR;
        if(!qr||typeof qr.render!=='function'){console.error('[Animated QR] Renderer indisponível');return false;}
        tx.currentIndex=clamp(tx,tx.currentIndex); showActive();
        const layout=String(tx.layout||'1');
        tx.containerEl.classList.remove('layout-1','layout-2','layout-4');
        tx.containerEl.classList.add(`layout-${layout}`);

        try{
            if(layout==='1'){
                const size={small:220,medium:280,large:320,fullscreen:480}[tx.displaySize]||280;
                const instance=qr.render(tx.containerEl,tx.frames[tx.currentIndex],{width:size,height:size,animatedTransfer:true,eccLevel:tx.eccLevel||'L'});
                if(!instance||!tx.containerEl.querySelector('svg,canvas')) throw new Error('O encoder não inseriu SVG/canvas no container.');
            }else{
                const count=layout==='2'?2:4;
                const tileSize=layout==='2'?150:130;
                tx.containerEl.innerHTML='';
                for(let i=0;i<count;i++){
                    const frameIdx=(tx.currentIndex+i)%tx.frames.length;
                    const tileEl=document.createElement('div');
                    tileEl.className='qr-tile';
                    tx.containerEl.appendChild(tileEl);
                    qr.render(tileEl,tx.frames[frameIdx],{width:tileSize,height:tileSize,animatedTransfer:true,eccLevel:tx.eccLevel||'L'});
                }
            }
        }catch(error){console.error('[Animated QR] Falha ao renderizar frame',tx.currentIndex,error);return false;}
        if(typeof tx.onProgress==='function') tx.onProgress({currentIndex:tx.currentIndex,totalFrames:tx.frames.length,numBaseChunks:tx.numBaseChunks,fps:tx.fps,totalSize:tx.totalSize,fileName:tx.metadata?.name||'Data',progressPct:Math.min(100,Math.round(((tx.currentIndex+1)/tx.frames.length)*100))});
        return true;
    }
    function sync(tx){
        if(!tx?.frames?.length)return; tx.currentIndex=clamp(tx,tx.currentIndex); const total=tx.frames.length;
        const seek=getEl(IDS.seek); if(seek){seek.min='0';seek.max=String(total-1);seek.value=String(tx.currentIndex);seek.disabled=!tx.initialized;seek.setAttribute('aria-valuenow',String(tx.currentIndex));}
        const input=getEl(IDS.frameInput); if(input){input.min='1';input.max=String(total);input.value=String(tx.currentIndex+1);input.disabled=!tx.initialized;}
        const prev=getEl(IDS.previous);if(prev)prev.disabled=!tx.initialized;const next=getEl(IDS.next);if(next)next.disabled=!tx.initialized;
        const pause=getEl(IDS.pause);if(pause){pause.textContent=tx.paused?'Play':'Pausar';pause.disabled=!tx.initialized;pause.setAttribute('aria-label',tx.paused?'Reproduzir QR animado':'Pausar QR animado');}
        const go=getEl(IDS.frameGo);if(go)go.disabled=!tx.initialized; const count=getEl('qr-send-frames-count');if(count)count.textContent=`Frames: ${tx.currentIndex+1}/${total}`; const speed=getEl(IDS.fpsSpeed);if(speed)speed.textContent=`Velocidade: ${tx.fps} FPS`;
    }
    function schedule(tx){
        stopTimer(tx); if(!tx?.running||tx.paused||!tx.initialized||!tx.frames?.length)return;
        tx.timer=setTimeout(()=>{if(!tx.running||tx.paused||!tx.initialized)return;tx.currentIndex=(tx.currentIndex+1)%tx.frames.length;if(!render(tx)){tx.paused=true;sync(tx);return;}sync(tx);schedule(tx);},1000/Math.max(1,Number(tx.fps)||6));
    }
    function selectFrame(tx,index,preservePlayback){
        if(!tx?.initialized||!tx.frames?.length)return; const wasPlaying=preservePlayback&&!tx.paused; stopTimer(tx); tx.currentIndex=clamp(tx,index); tx.running=true; tx.paused=!wasPlaying;
        if(!render(tx)){tx.paused=true;sync(tx);return;} sync(tx); if(wasPlaying)schedule(tx);
    }
    function install(tx){
        if(!tx||!Array.isArray(tx.frames))return;
        tx.__erikraftAnimatedControlsOwned=true; tx.__erikraftPlaybackControlsInstalled=true; tx.initialized=true;tx.paused=true;applySettings(tx);
        tx.start=function(){if(!this.frames?.length)return;stopTimer(this);this.running=true;this.paused=true;this.initialized=true;this.currentIndex=0;render(this);sync(this);};
        tx.pause=function(){stopTimer(this);this.paused=true;this.running=!!this.frames?.length;sync(this);};
        tx.resume=function(){if(!this.running||!this.initialized||!this.frames?.length)return;this.paused=false;schedule(this);sync(this);};
        tx.previousFrame=function(){selectFrame(this,this.currentIndex-1,true);}; tx.nextFrame=function(){selectFrame(this,this.currentIndex+1,true);}; tx.seekFrame=function(index){selectFrame(this,index,true);}; sync(tx);
    }
    function makeButton(id,text,label,handler,template){let b=getEl(id);if(b)return b;b=template.cloneNode(true);b.id=id;b.type='button';b.removeAttribute('data-i18n-key');b.textContent=text;b.setAttribute('aria-label',label);b.title=label;b.onclick=handler;return b;}
    function setup(tx){
        const buttons=getEl(IDS.activeButtons),pause=getEl(IDS.pause);if(!buttons||!pause||!tx)return false;
        injectStyles();normalizeSettingsUI();installPreparationBridge();install(tx);buttons.hidden=false;buttons.removeAttribute('hidden');
        const nextBtn=getEl(IDS.next); if(nextBtn) nextBtn.onclick=()=>getTransmitter()?.nextFrame?.();
        const prevBtn=getEl(IDS.previous); if(prevBtn) prevBtn.onclick=()=>getTransmitter()?.previousFrame?.();
        const backBtn=getEl('qr-send-back-btn'); if(backBtn && !backBtn.dataset.boundBack){
            backBtn.dataset.boundBack='true';
            backBtn.onclick=(e)=>{
                const t=getTransmitter(); if(t){ t.pause(); }
                const comp=getEl('qr-send-compose-view'), act=getEl('qr-send-active-view'),
                      compBtns=getEl('qr-send-compose-buttons'), actBtns=getEl(IDS.activeButtons);
                if(act) act.hidden=true; if(actBtns) actBtns.hidden=true;
                if(comp) comp.hidden=false; if(compBtns) compBtns.hidden=false;
            };
        }
        if(!pause.dataset.erikraftControlCapture){pause.dataset.erikraftControlCapture='true';pause.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const current=getTransmitter();if(!current?.initialized)return;current.paused?current.resume():current.pause();sync(current);},true);}
        const seekEl=getEl(IDS.seek); if(seekEl&&!seekEl.dataset.boundSeek){seekEl.dataset.boundSeek='true';seekEl.addEventListener('input',e=>getTransmitter()?.seekFrame?.(Number(e.target.value)));}
        const frameInputEl=getEl(IDS.frameInput), frameGoEl=getEl(IDS.frameGo);
        if(frameInputEl&&!frameInputEl.dataset.boundInput){
            frameInputEl.dataset.boundInput='true';
            const runFrameGo=()=>{
                const rawStr=String(frameInputEl.value||'').trim();if(!rawStr)return;
                const v=Number.parseInt(rawStr,10);const t=getTransmitter();if(!t?.frames?.length)return;
                if(!Number.isFinite(v)){frameInputEl.value=String(t.currentIndex+1);return;}
                const target=Math.max(1,Math.min(v,t.frames.length));frameInputEl.value=String(target);t.seekFrame?.(target-1);
            };
            if(frameGoEl) frameGoEl.onclick=runFrameGo;
            frameInputEl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runFrameGo();}});
            frameInputEl.addEventListener('change',runFrameGo);
        }
        getEl(IDS.ecc)?.addEventListener('change',async ()=>{normalizeSettingsUI();const t=getTransmitter();if(t){applySettings(t);if(typeof t.reprepare==='function')await t.reprepare();render(t);sync(t);}});
        getEl(IDS.layout)?.addEventListener('change',()=>{const t=getTransmitter();if(t){t.layout=getEl(IDS.layout).value||'1';render(t);sync(t);}});
        getEl(IDS.bytes)?.addEventListener('change',async ()=>{normalizeSettingsUI();const t=getTransmitter();if(t){applySettings(t);if(typeof t.reprepare==='function')await t.reprepare();render(t);sync(t);}});
        getEl(IDS.fps)?.addEventListener('input',()=>{const t=getTransmitter(),f=Math.max(1,Math.min(30,Number.parseInt(getEl(IDS.fps).value,10)||6));getEl(IDS.fps).value=String(f);if(t){t.setFps(f);sync(t);}normalizeSettingsUI();});
        getEl(IDS.displaySize)?.addEventListener('change',()=>{const t=getTransmitter();if(t?.initialized){t.displaySize=getEl(IDS.displaySize).value;render(t);sync(t);}});
        render(tx);
        sync(tx);return true;
    }
    window.setupAnimatedQRRuntimeControls = function(tx) {
        installPreparationBridge();
        const transmitter = tx || getTransmitter();
        if (transmitter) return setup(transmitter);
        return false;
    };
    const tryInstall=()=>{installPreparationBridge();const tx=getTransmitter();return tx?setup(tx):false;};
    let attempts=0;const watcher=setInterval(()=>{if(tryInstall()||++attempts>=300)clearInterval(watcher);},100);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryInstall,{once:true});else tryInstall();
})();
