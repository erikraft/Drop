(() => {
'use strict';
const bridge=()=>window.ErikrafTdropAndroid||null;
const isApp=()=>{const b=bridge();return !!b&&typeof b.openOnionTransfer==='function'&&typeof b.openFtpSettings==='function'&&typeof b.openSftpSettings==='function';};
const T={
en:['Tor Network (Onion Service)','Open FTP/FTPS and SFTP transfers','FTP/FTPS','SFTP','Open local Android transfer services.'],
'pt-BR':['Transferência via Onion','Abrir transferências FTP/FTPS e SFTP','FTP/FTPS','SFTP','Abra os serviços de transferência locais do Android.'],
'es':['Red Tor (servicio Onion)','Abrir transferencias FTP/FTPS y SFTP','FTP/FTPS','SFTP','Abrir los servicios de transferencia locales de Android.'],
'fr':['Réseau Tor (service Onion)','Ouvrir les transferts FTP/FTPS et SFTP','FTP/FTPS','SFTP','Ouvrir les services de transfert locaux Android.'],
'de':['Tor-Netzwerk (Onion-Dienst)','FTP/FTPS- und SFTP-Übertragungen öffnen','FTP/FTPS','SFTP','Lokale Android-Übertragungsdienste öffnen.'],
'it':['Rete Tor (servizio Onion)','Apri trasferimenti FTP/FTPS e SFTP','FTP/FTPS','SFTP','Apri i servizi di trasferimento locali di Android.'],
'pt-PT':['Rede Tor (serviço Onion)','Abrir transferências FTP/FTPS e SFTP','FTP/FTPS','SFTP','Abrir os serviços de transferência locais do Android.'],
'ru':['Сеть Tor (Onion-сервис)','Открыть передачи FTP/FTPS и SFTP','FTP/FTPS','SFTP','Открыть локальные службы передачи Android.'],
'uk':['Мережа Tor (Onion-сервіс)','Відкрити передачі FTP/FTPS і SFTP','FTP/FTPS','SFTP','Відкрити локальні служби передачі Android.'],
'pl':['Sieć Tor (usługa Onion)','Otwórz transfery FTP/FTPS i SFTP','FTP/FTPS','SFTP','Otwórz lokalne usługi transferu Androida.'],
'nl':['Tor-netwerk (Onion-service)','FTP/FTPS- en SFTP-overdrachten openen','FTP/FTPS','SFTP','Open lokale Android-overdrachtservices.'],
'sv':['Tor-nätverket (Onion-tjänst)','Öppna FTP/FTPS- och SFTP-överföringar','FTP/FTPS','SFTP','Öppna Androids lokala överföringstjänster.'],
'da':['Tor-netværk (Onion-tjeneste)','Åbn FTP/FTPS- og SFTP-overførsler','FTP/FTPS','SFTP','Åbn Androids lokale overførselstjenester.'],
'no':['Tor-nettverk (Onion-tjeneste)','Åpne FTP/FTPS- og SFTP-overføringer','FTP/FTPS','SFTP','Åpne lokale Android-overføringstjenester.'],
'nb':['Tor-nettverk (Onion-tjeneste)','Åpne FTP/FTPS- og SFTP-overføringer','FTP/FTPS','SFTP','Åpne lokale Android-overføringstjenester.'],
'nn':['Tor-nettverk (Onion-teneste)','Opne FTP/FTPS- og SFTP-overføringar','FTP/FTPS','SFTP','Opne lokale Android-overføringstenester.'],
'fi':['Tor-verkko (Onion-palvelu)','Avaa FTP/FTPS- ja SFTP-siirrot','FTP/FTPS','SFTP','Avaa Androidin paikalliset siirtopalvelut.'],
'cs':['Síť Tor (služba Onion)','Otevřít přenosy FTP/FTPS a SFTP','FTP/FTPS','SFTP','Otevřít místní přenosové služby Androidu.'],
'sk':['Sieť Tor (služba Onion)','Otvoriť prenosy FTP/FTPS a SFTP','FTP/FTPS','SFTP','Otvoriť miestne prenosové služby Androidu.'],
'hu':['Tor-hálózat (Onion-szolgáltatás)','FTP/FTPS- és SFTP-átvitelek megnyitása','FTP/FTPS','SFTP','Android helyi átviteli szolgáltatásainak megnyitása.'],
'ro':['Rețeaua Tor (serviciu Onion)','Deschide transferurile FTP/FTPS și SFTP','FTP/FTPS','SFTP','Deschide serviciile locale de transfer Android.'],
'tr':['Tor Ağı (Onion Hizmeti)','FTP/FTPS ve SFTP aktarımlarını aç','FTP/FTPS','SFTP','Android yerel aktarım hizmetlerini açın.'],
'el':['Δίκτυο Tor (υπηρεσία Onion)','Άνοιγμα μεταφορών FTP/FTPS και SFTP','FTP/FTPS','SFTP','Άνοιγμα τοπικών υπηρεσιών μεταφοράς Android.'],
'bg':['Tor мрежа (Onion услуга)','Отваряне на FTP/FTPS и SFTP трансфери','FTP/FTPS','SFTP','Отваряне на локалните Android услуги за прехвърляне.'],
'ca':['Xarxa Tor (servei Onion)','Obre transferències FTP/FTPS i SFTP','FTP/FTPS','SFTP','Obre els serveis de transferència locals d’Android.'],
'be':['Сетка Tor (служба Onion)','Адкрыць перадачы FTP/FTPS і SFTP','FTP/FTPS','SFTP','Адкрыць лакальныя службы перадачы Android.'],
'uk':['Мережа Tor (Onion-сервіс)','Відкрити передачі FTP/FTPS і SFTP','FTP/FTPS','SFTP','Відкрити локальні служби передачі Android.'],
'ar':['شبكة Tor (خدمة Onion)','فتح نقل FTP/FTPS وSFTP','FTP/FTPS','SFTP','افتح خدمات نقل Android المحلية.'],
'he':['רשת Tor (שירות Onion)','פתיחת העברות FTP/FTPS ו-SFTP','FTP/FTPS','SFTP','פתיחת שירותי ההעברה המקומיים של Android.'],
'fa':['شبکه Tor (سرویس Onion)','باز کردن انتقال‌های FTP/FTPS و SFTP','FTP/FTPS','SFTP','سرویس‌های انتقال محلی Android را باز کنید.'],
'ja':['Torネットワーク（Onionサービス）','FTP/FTPS・SFTP転送を開く','FTP/FTPS','SFTP','Androidのローカル転送サービスを開きます。'],
'ko':['Tor 네트워크(Onion 서비스)','FTP/FTPS 및 SFTP 전송 열기','FTP/FTPS','SFTP','Android 로컬 전송 서비스를 엽니다.'],
'zh-CN':['Tor 网络（Onion 服务）','打开 FTP/FTPS 和 SFTP 传输','FTP/FTPS','SFTP','打开 Android 本地传输服务。'],
'zh-HK':['Tor 網絡（Onion 服務）','開啟 FTP/FTPS 和 SFTP 傳輸','FTP/FTPS','SFTP','開啟 Android 本地傳輸服務。'],
'zh-TW':['Tor 網路（Onion 服務）','開啟 FTP/FTPS 與 SFTP 傳輸','FTP/FTPS','SFTP','開啟 Android 本機傳輸服務。'],
'id':['Jaringan Tor (Layanan Onion)','Buka transfer FTP/FTPS dan SFTP','FTP/FTPS','SFTP','Buka layanan transfer lokal Android.'],
'th':['เครือข่าย Tor (บริการ Onion)','เปิดการถ่ายโอน FTP/FTPS และ SFTP','FTP/FTPS','SFTP','เปิดบริการถ่ายโอนภายในเครื่องของ Android'],
'vi':['Mạng Tor (dịch vụ Onion)','Mở truyền tệp FTP/FTPS và SFTP','FTP/FTPS','SFTP','Mở các dịch vụ truyền tệp cục bộ của Android.'],
'hi':['Tor नेटवर्क (Onion सेवा)','FTP/FTPS और SFTP ट्रांसफ़र खोलें','FTP/FTPS','SFTP','Android की स्थानीय ट्रांसफ़र सेवाएँ खोलें.'],
'bn':['Tor নেটওয়ার্ক (Onion পরিষেবা)','FTP/FTPS ও SFTP স্থানান্তর খুলুন','FTP/FTPS','SFTP','Android-এর স্থানীয় স্থানান্তর পরিষেবা খুলুন।'],
'ta':['Tor பிணையம் (Onion சேவை)','FTP/FTPS மற்றும் SFTP பரிமாற்றங்களைத் திறக்கவும்','FTP/FTPS','SFTP','Android உள்ளூர் பரிமாற்ற சேவைகளைத் திறக்கவும்.'],
'kn':['Tor ನೆಟ್‌ವರ್ಕ್ (Onion ಸೇವೆ)','FTP/FTPS ಮತ್ತು SFTP ವರ್ಗಾವಣೆಗಳನ್ನು ತೆರೆಯಿರಿ','FTP/FTPS','SFTP','Android ಸ್ಥಳೀಯ ವರ್ಗಾವಣೆ ಸೇವೆಗಳನ್ನು ತೆರೆಯಿರಿ.'],
'sr':['Tor mreža (Onion usluga)','Otvori FTP/FTPS i SFTP prenose','FTP/FTPS','SFTP','Otvori lokalne Android usluge za prenos.'],
'sl':['Omrežje Tor (storitev Onion)','Odpri prenose FTP/FTPS in SFTP','FTP/FTPS','SFTP','Odpri lokalne Android storitve za prenose.'],
'hr':['Tor mreža (Onion usluga)','Otvori FTP/FTPS i SFTP prijenose','FTP/FTPS','SFTP','Otvori lokalne Android usluge za prijenos.'],
'ms':['Rangkaian Tor (Perkhidmatan Onion)','Buka pemindahan FTP/FTPS dan SFTP','FTP/FTPS','SFTP','Buka perkhidmatan pemindahan tempatan Android.'],
'af':['Tor-netwerk (Onion-diens)','Maak FTP/FTPS- en SFTP-oordragte oop','FTP/FTPS','SFTP','Maak plaaslike Android-oordragdienste oop.'],
'eu':['Tor sarea (Onion zerbitzua)','Ireki FTP/FTPS eta SFTP transferentziak','FTP/FTPS','SFTP','Ireki Androiden tokiko transferentzia-zerbitzuak.'],
'et':['Tor-võrk (Onioni teenus)','Ava FTP/FTPS- ja SFTP-edastused','FTP/FTPS','SFTP','Ava Androidi kohalikud edastusteenused.'],
'kab':['Aẓeṭṭa Tor (Ameẓlu Onion)','Ldi iseqdacen n usiweḍ FTP/FTPS d SFTP','FTP/FTPS','SFTP','Ldi imeẓla n usiweḍ adigan n Android.']
};
function tr(){const l=(document.documentElement.lang||navigator.language||'en').replace('_','-');return T[l]||T[l.split('-')[0]]||T.en;}
function text(){const x=tr();const ids=[['tor-config-btn',0],['android-protocols-shortcut',1],['android-protocols-title',1],['android-protocols-description',4],['android-ftp-shortcut',2],['android-sftp-shortcut',3]];ids.forEach(([id,n])=>{const e=document.getElementById(id);if(!e)return;if(e.matches('button'))e.textContent=x[n];e.title=x[n];if(id==='android-protocols-description')e.textContent=x[n];if(id==='android-protocols-title')e.textContent=x[n];});}
function open(){const d=document.getElementById('android-protocols-dialog');if(!d)return;d.hidden=false;if(typeof d.show==='function')d.show();text();}
function close(){const d=document.getElementById('android-protocols-dialog');if(!d)return;if(typeof d.close==='function')d.close();d.hidden=true;}
function bind(){if(!isApp())return;const p=document.getElementById('android-protocols-shortcut');if(!p)return;const tor=document.getElementById('tor-config-btn');if(!tor)return;p.hidden=false;p.removeAttribute('aria-hidden');p.removeAttribute('tabindex');tor.title=tr()[0];tor.setAttribute('aria-label',tr()[0]);tor.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();bridge().openOnionTransfer();},true);p.onclick=open;document.getElementById('android-protocols-close')?.addEventListener('click',close);document.getElementById('android-ftp-shortcut')?.addEventListener('click',()=>bridge().openFtpSettings());document.getElementById('android-sftp-shortcut')?.addEventListener('click',()=>bridge().openSftpSettings());text();new MutationObserver(text).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();