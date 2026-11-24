/* Udržení spojení se serverem PeerJS (mobil v pozadí, výpadek wifi) + nezhasínání obrazovky */
(function(){
  const NETERR=["network","server-error","socket-error","socket-closed","disconnected"];
  window.isNetErr=e=>NETERR.includes(e&&e.type);
  window.keepAlive=function(peer,onState){
    let t=null;
    const say=s=>{try{onState&&onState(s)}catch(e){}};
    const fix=()=>{if(peer.destroyed)return;if(peer.disconnected){say("reconnect");try{peer.reconnect()}catch(e){}}};
    peer.on("disconnected",()=>{say("reconnect");clearTimeout(t);t=setTimeout(fix,700)});
    peer.on("open",()=>say("ok"));
    const iv=setInterval(()=>{if(peer.destroyed){clearInterval(iv);return}fix()},3000);
    const vis=()=>{if(peer.destroyed)return document.removeEventListener("visibilitychange",vis);if(document.visibilityState==="visible"){fix();if(window._wantWake)wake(true)}};
    document.addEventListener("visibilitychange",vis);
    window.addEventListener("online",fix);window.addEventListener("focus",fix);
  };
  window.wake=async function(on){
    window._wantWake=on;
    try{
      if(on){if(!window._wl&&navigator.wakeLock&&document.visibilityState==="visible"){window._wl=await navigator.wakeLock.request("screen");window._wl.addEventListener("release",()=>{window._wl=null})}}
      else if(window._wl){await window._wl.release();window._wl=null}
    }catch(e){}
  };
})();
