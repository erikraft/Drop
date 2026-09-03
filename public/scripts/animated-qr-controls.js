(function setupAnimatedQRRuntimeControls() {
    'use strict';

    const IDS = { activeButtons:'qr-send-active-buttons', pause:'qr-send-pause-btn', initialize:'qr-send-initialize-btn', previous:'qr-send-previous-btn', next:'qr-send-next-btn', seek:'qr-send-frame-seek', frameInput:'qr-send-frame-input', frameGo:'qr-send-frame-go-btn', frameGroup:'qr-send-frame-input-group', seekWrapper:'qr-send-frame-seek-wrapper' };
    const getTransmitter = () => window.erikrafTdrop?.animatedQRSendDialog?.transmitter || null;
    const stopTimer = tx => { if (tx?.timer) clearTimeout(tx.timer); if (tx) tx.timer = null; };
    const clamp = (tx, index) => { const total = tx?.frames?.length || 0; if (!total) return 0; const n = Number(index); return Math.max(0, Math.min(Number.isFinite(n) ? Math.trunc(n) : 0, total - 1)); };
    const render = tx => {
        if (!tx?.initialized || !tx.frames?.length || !tx.containerEl) return false;
        const qr = window.ErikrafTDropQR;
        if (!qr || typeof qr.render !== 'function') return false;
        tx.currentIndex = clamp(tx, tx.currentIndex);
        qr.render(tx.containerEl, tx.frames[tx.currentIndex], { width:300, height:300, animatedTransfer:true });
        if (typeof tx.onProgress === 'function') tx.onProgress({ currentIndex:tx.currentIndex, totalFrames:tx.frames.length, numBaseChunks:tx.numBaseChunks, fps:tx.fps, totalSize:tx.totalSize, fileName:tx.metadata?.name || 'Data', progressPct:Math.min(100, Math.round(((tx.currentIndex+1)/tx.frames.length)*100)) });
        return true;
    };
    const sync = tx => {
        if (!tx?.frames?.length) return;
        tx.currentIndex = clamp(tx, tx.currentIndex);
        const total = tx.frames.length;
        const seek = document.getElementById(IDS.seek);
        if (seek) { seek.min='0'; seek.max=String(total-1); seek.value=String(tx.currentIndex); seek.disabled=!tx.initialized; seek.setAttribute('aria-valuenow',String(tx.currentIndex)); seek.setAttribute('aria-valuetext',`QR ${tx.currentIndex+1} de ${total}`); }
        const input = document.getElementById(IDS.frameInput);
        if (input) { input.min='1'; input.max=String(total); input.value=String(tx.currentIndex+1); input.disabled=!tx.initialized; }
        const init = document.getElementById(IDS.initialize); if (init) init.hidden=!!tx.initialized;
        const pause = document.getElementById(IDS.pause);
        if (pause) { pause.textContent=tx.paused?'Play':'Pausar'; pause.removeAttribute('data-i18n-key'); pause.setAttribute('aria-label',tx.paused?'Reproduzir QR animado':'Pausar QR animado'); pause.title=tx.paused?'Play':'Pausar'; }
    };
    const select = (tx,index) => { if (!tx?.initialized || !tx.frames?.length) return; stopTimer(tx); tx.running=true; tx.paused=true; tx.currentIndex=clamp(tx,index); render(tx); sync(tx); };
    const install = tx => {
        if (!tx || tx.__erikraftRuntimeControlsInstalled) return;
        tx.__erikraftRuntimeControlsInstalled=true;
        tx.initialized=false;
        tx.start=function(){ if(!this.frames?.length)return; stopTimer(this); this.running=true; this.paused=true; this.initialized=false; this.currentIndex=0; if(this.containerEl&&window.ErikrafTDropQR?.destroy)window.ErikrafTDropQR.destroy(this.containerEl); sync(this); };
        tx.initialize=function(){ if(!this.frames?.length)return; stopTimer(this); this.running=true; this.paused=true; this.initialized=true; this.currentIndex=clamp(this,this.currentIndex); render(this); sync(this); };
        tx.pause=function(){ stopTimer(this); this.paused=true; sync(this); };
        tx.resume=function(){ if(!this.running||!this.initialized||!this.frames?.length)return; stopTimer(this); this.paused=false; const tick=()=>{ if(!this.running||this.paused||!this.initialized||!this.frames?.length){stopTimer(this);sync(this);return;} render(this); this.currentIndex=(this.currentIndex+1)%this.frames.length; sync(this); this.timer=setTimeout(tick,1000/Math.max(1,Number(this.fps)||6)); }; tick(); };
        tx.previousFrame=function(){select(this,this.currentIndex-1);};
        tx.nextFrame=function(){select(this,this.currentIndex+1);};
        tx.seekFrame=function(index){select(this,index);};
        sync(tx);
    };
    const makeButton=(id,text,label,handler,template)=>{ let b=document.getElementById(id); if(b)return b; b=template.cloneNode(true); b.id=id; b.type='button'; b.removeAttribute('data-i18n-key'); b.textContent=text; b.setAttribute('aria-label',label); b.title=label; b.onclick=handler; return b; };
    const setup=tx=>{
        const buttons=document.getElementById(IDS.activeButtons), pause=document.getElementById(IDS.pause); if(!buttons||!pause||!tx)return false;
        install(tx);
        const init=makeButton(IDS.initialize,'Inicializar','Inicializar QR animado',()=>getTransmitter()?.initialize?.(),pause); if(!init.parentNode)buttons.insertBefore(init,buttons.firstElementChild);
        const prev=makeButton(IDS.previous,'Anterior','Mostrar QR anterior',()=>getTransmitter()?.previousFrame?.(),pause); if(!prev.parentNode)buttons.insertBefore(prev,buttons.firstElementChild);
        const next=makeButton(IDS.next,'Próximo','Mostrar próximo QR',()=>getTransmitter()?.nextFrame?.(),pause); if(!next.parentNode)buttons.insertBefore(next,pause.nextSibling);
        pause.onclick=e=>{e.preventDefault();e.stopPropagation();const t=getTransmitter();if(!t?.initialized)return;t.paused?t.resume():t.pause();sync(t);};
        if(!document.getElementById(IDS.seek)){
            const w=document.createElement('div'); w.id=IDS.seekWrapper; w.className='fw column gap-1'; w.style.cssText='width:100%;margin:8px 0 0;';
            const s=document.createElement('input'); s.type='range'; s.id=IDS.seek; s.className='fw'; s.style.cssText='width:100%;accent-color:#0d6efd;cursor:pointer;'; s.setAttribute('aria-label','Posição do QR animado'); s.addEventListener('input',e=>getTransmitter()?.seekFrame?.(Number(e.target.value))); w.appendChild(s); buttons.parentNode.insertBefore(w,buttons);
        }
        if(!document.getElementById(IDS.frameInput)){
            const g=document.createElement('div'); g.id=IDS.frameGroup; g.className='row center gap-2'; g.style.cssText='width:100%;justify-content:center;margin:8px 0 0;flex-wrap:wrap;';
            const i=document.createElement('input'); i.type='number'; i.id=IDS.frameInput; i.className='btn btn-rounded btn-grey'; i.min='1'; i.step='1'; i.inputMode='numeric'; i.style.cssText='width:90px;text-align:center;'; i.setAttribute('aria-label','Número do QR');
            const go=document.createElement('button'); go.type='button'; go.id=IDS.frameGo; go.className='btn btn-rounded btn-grey'; go.textContent='Ir'; go.setAttribute('aria-label','Ir para o QR informado'); go.title='Ir para o QR informado';
            const goFrame=()=>{const v=Number.parseInt(i.value,10);if(Number.isFinite(v))getTransmitter()?.seekFrame?.(v-1);}; go.onclick=goFrame; i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goFrame();}}); g.append(i,go); buttons.parentNode.insertBefore(g,buttons);
        }
        sync(tx); return true;
    };
    const tryInstall=()=>{const tx=getTransmitter();if(!tx)return false;setup(tx);return !!tx.__erikraftRuntimeControlsInstalled;};
    let attempts=0; const timer=setInterval(()=>{if(tryInstall()||++attempts>=300)clearInterval(timer);},100);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryInstall,{once:true});else tryInstall();
})();