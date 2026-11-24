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
/* Záložní cesta: když přímé spojení (WebRTC) neprojde přes síť, posílají se zprávy přes server PeerJS. */
(function(){
  // Veřejný server PeerJS předává jen zprávy ve tvaru ICE kandidáta, proto je tak „oblékáme“.
  const RID="pp_relay";
  const raw=(peer,dst,p)=>{try{peer.socket.send({type:"CANDIDATE",dst,payload:Object.assign({candidate:{candidate:"",sdpMLineIndex:0,sdpMid:"0"},type:"data",connectionId:RID,__r:1},p)})}catch(e){}};
  const tidy=peer=>{try{peer._lostMessages&&peer._lostMessages.delete(RID)}catch(e){}};
  const emitter=()=>{const h={};return{on(ev,fn){(h[ev]=h[ev]||[]).push(fn)},emit(ev,a){(h[ev]||[]).slice().forEach(f=>{try{f(a)}catch(e){console.error(e)}})}}};
  // HOST: přijímá spojení přes server, onConn dostane objekt se stejným rozhraním jako DataConnection
  window.relayListen=function(peer,onConn){
    const conns=new Map();
    const mk=src=>{const E=emitter();const c={peer:src,relay:true,open:true,
      send:d=>raw(peer,src,{k:"d",d}),
      close(){if(!c.open)return;c.open=false;conns.delete(src);raw(peer,src,{k:"bye"});E.emit("close")},
      on(ev,fn){E.on(ev,fn);if(ev==="open"&&c.open)setTimeout(fn,0);return c},_E:E};return c};
    peer.socket.on("message",m=>{
      const p=m&&m.payload;if(!p||!p.__r||!m.src||peer.destroyed)return;tidy(peer);
      let c=conns.get(m.src);
      if(p.k==="hello"){if(!c||!c.open){c=mk(m.src);conns.set(m.src,c);onConn(c)}raw(peer,m.src,{k:"ack"});return}
      if(!c)return;
      if(p.k==="d")c._E.emit("data",p.d);
      else if(p.k==="bye"){c.open=false;conns.delete(m.src);c._E.emit("close")}
    });
  };
  // HRÁČ: zkusí přímé spojení, po rtcWait ms přepne na server; vrací objekt jako DataConnection
  window.connectAny=function(peer,dst,rtcWait){
    const E=emitter();let done=false;
    const w={peer:dst,open:false,via:null,
      send(d){if(!w.open)return;w.via==="rtc"?rtc.send(d):raw(peer,dst,{k:"d",d})},
      close(){if(done)return;done=true;const was=w.open&&w.via==="relay";w.open=false;try{rtc.close()}catch(e){}if(was)raw(peer,dst,{k:"bye"});try{peer.socket.removeListener("message",onMsg)}catch(e){}},
      on(ev,fn){E.on(ev,fn);return w}};
    const win=via=>{if(done||w.open)return;w.open=true;w.via=via;if(via==="relay"){try{rtc.close()}catch(e){}}E.emit("open")};
    const rtc=peer.connect(dst,{reliable:true});
    rtc.on("open",()=>{if(w.via!=="relay")win("rtc")});
    rtc.on("data",d=>{if(!done&&w.via==="rtc")E.emit("data",d)});
    rtc.on("close",()=>{if(!done&&w.via==="rtc"&&w.open){w.open=false;E.emit("close")}});
    const onMsg=m=>{const p=m&&m.payload;if(done||!p||!p.__r||m.src!==dst)return;tidy(peer);
      if(p.k==="ack")win("relay");
      else if(p.k==="d"&&w.via==="relay")E.emit("data",p.d);
      else if(p.k==="bye"&&w.via==="relay"&&w.open){w.open=false;E.emit("close")}};
    peer.socket.on("message",onMsg);
    const hello=()=>{if(!done&&!w.open)raw(peer,dst,{k:"hello"})};
    setTimeout(hello,rtcWait||4000);setTimeout(hello,(rtcWait||4000)+2500);
    return w;
  };
})();
