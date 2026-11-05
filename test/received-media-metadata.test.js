import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source=fs.readFileSync(new URL('../public/scripts/received-media-metadata.js',import.meta.url),'utf8');
const localization=fs.readFileSync(new URL('../public/scripts/localization.js',import.meta.url),'utf8');
const localeMatch=localization.match(/Localization\.supportedLocales\s*=\s*\[([\s\S]*?)\];/);
assert.ok(localeMatch, 'supported locale list must be discoverable');
const locales=[...localeMatch[1].matchAll(/"([^"]+)"/g)].map(match=>match[1]);
for(const locale of locales){
    const translations=JSON.parse(fs.readFileSync(new URL('../public/lang/'+locale+'.json',import.meta.url),'utf8'));
    assert.equal(translations.media?.prepare_spin,'RBM Convert',`RBM Convert label missing for ${locale}`);
}
const context={
  console,crypto:{subtle:crypto.webcrypto.subtle,randomUUID:crypto.randomUUID.bind(crypto)},TextEncoder,TextDecoder,File,Blob,URL,
  window:{},document:{readyState:'complete',getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}}},matchMedia:()=>({matches:false}),
  addEventListener(){},setTimeout,performance:{now:()=>0}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'received-media-metadata.js'});
const api=context.window.__erikrafTReceivedMediaTest;
assert.equal(api.metadataProfiles.photo.smartGlassesPhoto3x4.width,3024);
assert.equal(api.metadataProfiles.video.smartGlassesVideo3x4.fps,60);

const atom=(type,body)=>{const b=new TextEncoder().encode(type);const z=new Uint8Array(8+body.length);new DataView(z.buffer).setUint32(0,z.length);z.set(b,4);z.set(body,8);return z};
const concat=(...xs)=>{const z=new Uint8Array(xs.reduce((n,x)=>n+x.length,0));let p=0;for(const x of xs){z.set(x,p);p+=x.length}return z};

const jpeg=concat(new Uint8Array([0xff,0xd8]),new Uint8Array([0xff,0xe1,0,12]),new TextEncoder().encode('Exif\0\0TEST'),new Uint8Array([0xff,0xe2,0,14]),new TextEncoder().encode('ICC_PROFILE\0X'),new Uint8Array([0xff,0xda,0,2,1,2,3,4]));
const jf=new File([jpeg],'photo.jpg',{type:'image/jpeg'});
const privateJ=await api.sanitize(jf,'private');
assert.equal(new Uint8Array(await privateJ.arrayBuffer()).includes(0xff),true);
assert.equal(new TextDecoder().decode(await privateJ.arrayBuffer()).includes('Exif'),false);
const allJ=await api.sanitize(jf,'all');
assert.equal(new TextDecoder().decode(await allJ.arrayBuffer()).includes('ICC_PROFILE'),false);

const png=concat(new Uint8Array([137,80,78,71,13,10,26,10]),new Uint8Array([0,0,0,4,116,69,88,116,84,69,83,84]),new Uint8Array([0,0,0,0]),new Uint8Array([0,0,0,0,73,69,78,68]),new Uint8Array([0,0,0,0]));
const pf=new File([png],'photo.png',{type:'image/png'});
const ps=await api.sanitize(pf,'private');
assert.equal(new TextDecoder().decode(await ps.arrayBuffer()).includes('tEXt'),false);

const trak=atom('trak',new Uint8Array([1,2,3]));
const udta=atom('udta',new TextEncoder().encode('GPS-PRIVATE'));
const moov=atom('moov',concat(trak,udta));
const mp4=new File([moov],'video.mov',{type:'video/quicktime'});
const motionVideo=new File([new TextEncoder().encode('MP4DATA')],'motion.mp4',{type:'video/mp4'});
const motion=await api.createMotionPhoto(jf,motionVideo);
const motionBytes=new Uint8Array(await motion.arrayBuffer());
assert.equal(motion.name,'photo.MP.jpg');
assert.equal(new TextDecoder().decode(motionBytes).includes('MotionPhoto'),true);
assert.equal(new TextDecoder().decode(motionBytes.slice(-7)),'MP4DATA');
const qs=await api.sanitize(mp4,'all');
assert.equal(new TextDecoder().decode(await qs.arrayBuffer()).includes('GPS-PRIVATE'),false);

assert.match(source,/getSupportedVideoMimeType/);
assert.match(source,/const mimeType=preferredMimeType/);
assert.match(source,/injectLivePhotoMakerNote/);
assert.match(source,/com\.apple\.quicktime\.content\.identifier/);
assert.match(source,/video\/quicktime/);
assert.match(source,/Criar Live\/Motion Photo/);
assert.match(source,/id="ek-close"/);
assert.match(source,/id="ek-actions"/);
assert.match(source,/querySelector\('\.btn-row'\)/);
assert.match(source,/data-ek-media-action/);
assert.doesNotMatch(source,/addDialogAction\(tr\('instagram'/, 'Instagram publishing must not be added to the receive dialog.');
assert.doesNotMatch(source,/host\.querySelector\(['"]#ek-actions['"]\)/);
assert.match(source,/RBM Convert/);
assert.doesNotMatch(source,/Spin View/i, 'RBM Convert must replace the former Spin View action wording.');
assert.match(source,/cancelAnimationFrame\(frameId\)/);
assert.match(source,/URL\.revokeObjectURL\(src\);p\.remove\(\)/);
assert.doesNotMatch(source,/requestAnimationFrame\(loop\)/, 'RBM preview must not leave an unbounded animation loop running.');
const simulator=source.slice(source.indexOf('function simulator(file){'),source.indexOf('function addActions(file){'));
assert.doesNotMatch(simulator,/\bclose\(\)/, 'Closing the RBM preview must not attempt to close the browser window.');
const indexHtml=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const dialogStart=indexHtml.indexOf('id="receive-file-dialog"');
const dialogEnd=indexHtml.indexOf('</x-dialog>',dialogStart);
assert.ok(dialogStart>=0&&dialogEnd>dialogStart, 'receive-file-dialog markup must exist');
const dialogHtml=indexHtml.slice(dialogStart,dialogEnd);
assert.match(dialogHtml,/class="row-reverse center btn-row wrap"/);
for(const id of ['share-btn','copy-image-btn','compress-btn','download-btn'])assert.match(dialogHtml,new RegExp('id="'+id+'"'));
assert.match(dialogHtml,/data-i18n-key="dialogs.close"/);
assert.doesNotMatch(dialogHtml,/id="ek-actions"/);
assert.doesNotMatch(dialogHtml,/ai-edit-btn|publish-youtube-btn|publish-instagram-btn/);
assert.doesNotMatch(indexHtml,/id="metadata-btn"/);

console.log('received-media-metadata: PASS');
