(function(){
  'use strict';
  window.__RI_TRANSIT_INIT__ = true;

  const stage = document.getElementById('projectTransitStage');
  const canvas = document.getElementById('projectTransitCanvas');
  if(canvas) canvas.id='projectTransitCanvasActive';

  const safetyStyle=document.createElement('style');
  safetyStyle.textContent=`
    .transit-fallback{position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(57,255,136,.07),transparent 36%),#000;transition:opacity .45s ease,visibility .45s ease;pointer-events:none}
    .transit-fallback svg{width:94%;height:82%;overflow:visible}
    .fallback-route-shadow{fill:none;stroke:rgba(57,255,136,.12);stroke-width:18;stroke-linecap:round;stroke-linejoin:round}
    .fallback-route{fill:none;stroke:#39ff88;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(57,255,136,.5))}
    .fallback-stops circle{fill:#000;stroke:#ffd75f;stroke-width:5;filter:drop-shadow(0 0 5px rgba(255,215,95,.4))}
    .fallback-bus rect:first-child{fill:#ff4fd8;stroke:#ffd75f;stroke-width:2}.fallback-bus rect:not(:first-child){fill:#39ff88}.fallback-bus circle{fill:#050505;stroke:#ffd75f;stroke-width:2}
    .fallback-bus{filter:drop-shadow(0 0 8px rgba(255,79,216,.5));animation:riFallbackBusPulse 1.2s ease-in-out infinite alternate}
    .fallback-note{position:absolute;left:14px;bottom:14px;color:#ffd75f;font:600 7px/1.4 'IBM Plex Mono',monospace;letter-spacing:.12em;background:rgba(0,0,0,.75);padding:5px 7px;border-left:2px solid #ffd75f}
    @keyframes riFallbackBusPulse{to{filter:drop-shadow(0 0 14px rgba(255,79,216,.9))}}
    .transit-stage.three-ready .transit-fallback{opacity:0;visibility:hidden}
    .transit-stage.fallback-only #projectTransitCanvasActive{display:none}
    #projectTransitCanvasActive{position:absolute;inset:0;z-index:3;width:100%;height:100%;display:block;background:transparent}
    @media(max-width:820px){.transit-fallback svg{width:98%;height:74%}.fallback-note{left:10px;bottom:74px;font-size:5.5px}.fallback-route-shadow{stroke-width:22}.fallback-route{stroke-width:7}}
  `;
  document.head.appendChild(safetyStyle);
  const labelsRoot = document.getElementById('stationLabels');
  const status = document.getElementById('transitStatus');
  const mobileCard = document.getElementById('transitMobileCard');
  const pauseBtn = document.getElementById('transitPause');
  const replayBtn = document.getElementById('transitReplay');
  const nextBtn = document.getElementById('transitNext');
  let fallback = document.getElementById('transitFallback');
  if(!fallback && stage && canvas){
    fallback=document.createElement('div');
    fallback.className='transit-fallback';
    fallback.id='transitFallback';
    fallback.setAttribute('aria-hidden','true');
    fallback.innerHTML=`<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet"><path class="fallback-route-shadow" d="M70 310 C170 70 260 90 340 220 S520 80 610 210 S790 330 930 105"/><path class="fallback-route" d="M70 310 C170 70 260 90 340 220 S520 80 610 210 S790 330 930 105"/><g class="fallback-stops"><circle cx="70" cy="310" r="11"/><circle cx="220" cy="105" r="11"/><circle cx="365" cy="220" r="11"/><circle cx="535" cy="105" r="11"/><circle cx="705" cy="265" r="11"/><circle cx="930" cy="105" r="11"/></g><g class="fallback-bus" transform="translate(45 285)"><rect x="0" y="0" rx="6" width="52" height="28"/><rect x="8" y="5" width="11" height="8"/><rect x="23" y="5" width="11" height="8"/><rect x="38" y="5" width="8" height="8"/><circle cx="14" cy="29" r="5"/><circle cx="40" cy="29" r="5"/></g></svg><div class="fallback-note">3D PROJECT TRANSIT INITIALISING // FALLBACK MAP ACTIVE</div>`;
    stage.insertBefore(fallback,canvas);
  }

  const projects = [
    {title:'Kubera — AI Finance Manager',short:'KUBERA',year:'2024',target:'project-kubera',repo:'https://github.com/roronoa2003/Kubera'},
    {title:'Paytm Logo Detection in Cricket',short:'PAYTM CV',year:'2025',target:'project-paytm',repo:'https://github.com/roronoa2003/paytm-logo-detection'},
    {title:'ResMatch - AI-Powered Resume Matching Platform',short:'RESMATCH',year:'2025',target:'project-resmatch',repo:'https://github.com/roronoa2003/ResMatch_Deployed'},
    {title:'Setu — Project Allocation Tool',short:'SETU',year:'2026',target:'project-setu',repo:''},
    {title:'Upper Celestials Ops Dashboard',short:'UC OPS',year:'2026',target:'project-uc-ops',repo:'https://github.com/roronoa2003/uc-dashboard'},
    {title:'Organisational Agentic Digital Twin Platform',short:'AGENTIC TWIN',year:'2026',target:'project-digital-twin',repo:'https://github.com/roronoa2003/directors'}
  ];

  const setStatus = (i,state='ARRIVING') => {
    const p = projects[i] || projects[0];
    if(status) status.innerHTML = `<span>BUS 01 // ${state}</span><b>${p.short}</b><small>${p.year} // PROJECT ${String(i+1).padStart(2,'0')} OF ${String(projects.length).padStart(2,'0')}</small>`;
  };
  const renderMobileCard = i => {
    if(!mobileCard) return;
    const p=projects[i];
    const link=p.repo ? `<a href="${p.repo}" target="_blank" rel="noopener">REPO ↗</a>` : `<a href="#${p.target}">VIEW ↓</a>`;
    mobileCard.innerHTML=`<span class="tm-index">${String(i+1).padStart(2,'0')}</span><span class="tm-copy"><b>${p.title}</b><span>${p.year} // PROJECT STOP</span></span>${link}`;
  };
  renderMobileCard(0);
  setStatus(0,'INITIALISING');

  if(!stage || !canvas || !window.THREE){
    stage?.classList.add('fallback-only');
    setStatus(0,'2D FALLBACK ACTIVE');
    return;
  }

  try{
    const THREE=window.THREE;
    const isMobile=()=>window.innerWidth<=820;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile(),alpha:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);
    if('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace=THREE.SRGBColorSpace;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(40,1,0.1,100);
    camera.position.set(0,1.4,isMobile()?13.7:12.2);
    camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xafffc7,0x020202,1.5));
    const key=new THREE.DirectionalLight(0xffffff,1.35); key.position.set(4,7,9); scene.add(key);
    const fill=new THREE.PointLight(0xff4fd8,0.75,20); fill.position.set(-4,-1,5); scene.add(fill);

    const GREEN=0x39ff88, PINK=0xff4fd8, YELLOW=0xffd75f;
    const mapGroup=new THREE.Group(); mapGroup.rotation.x=-0.15; scene.add(mapGroup);
    const grid = new THREE.GridHelper(13,26,GREEN,0x143322); grid.rotation.x=Math.PI/2; grid.position.z=-0.72; grid.material.transparent=true; grid.material.opacity=0.26; mapGroup.add(grid);
    const stops=[
      new THREE.Vector3(-5.05,-1.35,0.10),new THREE.Vector3(-3.15,1.25,-0.05),new THREE.Vector3(-1.20,-0.30,0.13),
      new THREE.Vector3(0.75,1.30,-0.08),new THREE.Vector3(2.75,-0.78,0.10),new THREE.Vector3(5.00,0.95,-0.04)
    ];
    const curve=new THREE.CatmullRomCurve3(stops,false,'catmullrom',0.16);
    mapGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,isMobile()?90:150,0.055,8,false),new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:0.88})));
    mapGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,isMobile()?90:150,0.12,8,false),new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:0.10,depthWrite:false})));

    const stationMeshes=[],stationRings=[],labelEls=[];
    stops.forEach((position,i)=>{
      const color=[YELLOW,PINK,GREEN][i%3];
      const station=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.12,24),new THREE.MeshStandardMaterial({color,emissive:color,metalness:0.15,roughness:0.35}));
      station.rotation.x=Math.PI/2; station.position.copy(position); station.userData.index=i; mapGroup.add(station); stationMeshes.push(station);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.024,8,48),new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:0.9}));
      ring.rotation.x=Math.PI/2; ring.position.copy(position); mapGroup.add(ring); stationRings.push(ring);
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.60,8),new THREE.MeshBasicMaterial({color:i%2?PINK:YELLOW,transparent:true,opacity:0.65}));
      post.position.copy(position); post.position.y+=0.30; mapGroup.add(post);
      if(labelsRoot){
        const label=document.createElement('button'); label.type='button'; label.className='station-label'; label.dataset.stopIndex=String(i);
        label.innerHTML=`<i>STOP ${String(i+1).padStart(2,'0')} // ${projects[i].year}</i><strong>${projects[i].short}</strong>`;
        label.setAttribute('aria-label',`Project stop ${i+1}: ${projects[i].title}`); labelsRoot.appendChild(label); labelEls.push(label);
      }
    });

    const carrier=new THREE.Group(); mapGroup.add(carrier);
    const bus=new THREE.Group(); carrier.add(bus);
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.10,0.48,0.48),new THREE.MeshStandardMaterial({color:PINK,emissive:0x33051f,metalness:0.35,roughness:0.28})); body.position.y=0.10; bus.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.18,0.42),new THREE.MeshStandardMaterial({color:YELLOW,emissive:0x3c2c00,metalness:0.25,roughness:0.3})); roof.position.set(-0.02,0.41,0); bus.add(roof);
    const glassMat=new THREE.MeshStandardMaterial({color:GREEN,emissive:0x053d21,roughness:0.15});
    [-0.32,-0.05,0.23].forEach(x=>{const w=new THREE.Mesh(new THREE.BoxGeometry(0.19,0.16,0.018),glassMat);w.position.set(x,0.16,0.251);bus.add(w)});
    const wheelMat=new THREE.MeshStandardMaterial({color:0x080808,roughness:0.75});
    [[-0.34,-0.18,0.22],[0.34,-0.18,0.22],[-0.34,-0.18,-0.22],[0.34,-0.18,-0.22]].forEach(([x,y,z])=>{const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.10,0.07,18),wheelMat);wh.rotation.x=Math.PI/2;wh.position.set(x,y,z);bus.add(wh)});
    const beacon=new THREE.Mesh(new THREE.TorusGeometry(0.31,0.022,8,40),new THREE.MeshBasicMaterial({color:YELLOW,transparent:true,opacity:0.9})); beacon.rotation.x=Math.PI/2; beacon.position.y=0.76; carrier.add(beacon);
    const lamp=new THREE.PointLight(YELLOW,1.5,3.5); lamp.position.set(0.54,0.20,0.26); carrier.add(lamp);

    let selected=0,segment=0,progress=0,paused=false,dwell=1.25,endHold=0;
    const segmentDuration=isMobile()?2.6:3.0;
    const selectStop=(i,state='ARRIVING',jump=false)=>{
      selected=Math.max(0,Math.min(projects.length-1,i));
      labelEls.forEach((el,n)=>el.classList.toggle('active',n===selected));
      stationRings.forEach((r,n)=>{r.material.color.setHex(n===selected?PINK:n<selected?YELLOW:GREEN);r.scale.setScalar(n===selected?1.35:1)});
      renderMobileCard(selected); setStatus(selected,state);
      if(jump){segment=Math.min(selected,projects.length-2);progress=selected===projects.length-1?1:0;dwell=1.0;carrier.position.copy(stops[selected]);}
    };
    labelEls.forEach((el,i)=>el.addEventListener('click',e=>{e.stopPropagation();selectStop(i,'SELECTED',true)}));
    const restart=()=>{segment=0;progress=0;dwell=1.25;endHold=0;paused=false;carrier.position.copy(stops[0]);selectStop(0,'DEPARTING');if(pauseBtn){pauseBtn.textContent='[ PAUSE ]';pauseBtn.classList.add('active')}};
    const next=()=>{const i=Math.min(projects.length-1,selected+1);if(i===selected){restart();return}selectStop(i,'SELECTED',true)};
    pauseBtn?.addEventListener('click',()=>{paused=!paused;pauseBtn.textContent=paused?'[ RESUME ]':'[ PAUSE ]';pauseBtn.classList.toggle('active',!paused);setStatus(selected,paused?'PAUSED':'RUNNING')});
    replayBtn?.addEventListener('click',restart); nextBtn?.addEventListener('click',next);

    let dragging=false,startX=0,startY=0,startRY=0,startRX=-0.15,targetRY=0,targetRX=-0.15;
    stage.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;startY=e.clientY;startRY=targetRY;startRX=targetRX;stage.setPointerCapture?.(e.pointerId)});
    stage.addEventListener('pointermove',e=>{if(!dragging)return;const k=isMobile()?0.0016:0.0035;targetRY=Math.max(-0.24,Math.min(0.24,startRY+(e.clientX-startX)*k));targetRX=Math.max(-0.24,Math.min(0.02,startRX+(e.clientY-startY)*k))});
    const endDrag=e=>{dragging=false;stage.releasePointerCapture?.(e.pointerId)}; stage.addEventListener('pointerup',endDrag); stage.addEventListener('pointercancel',endDrag);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    stage.addEventListener('click',e=>{if(Math.abs(e.clientX-startX)>7||Math.abs(e.clientY-startY)>7)return;const r=stage.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(stationMeshes,false)[0];if(hit)selectStop(hit.object.userData.index,'SELECTED',true)});

    const resize=()=>{const r=stage.getBoundingClientRect();const w=Math.max(280,r.width||stage.clientWidth||800),h=Math.max(300,r.height||stage.clientHeight||500);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isMobile()?1.2:1.6));renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=isMobile()?13.7:12.2;camera.updateProjectionMatrix()};
    resize(); if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
    const placeLabel=(world,el)=>{if(!el)return;const r=stage.getBoundingClientRect();const p=world.clone().applyMatrix4(mapGroup.matrixWorld).project(camera);el.style.left=`${Math.max(24,Math.min(r.width-24,(p.x*0.5+0.5)*r.width))}px`;el.style.top=`${Math.max(62,Math.min(r.height-(isMobile()?104:36),(-p.y*0.5+0.5)*r.height-(isMobile()?28:42)))}px`;el.style.opacity=(p.z>1)?'0':'1'};
    carrier.position.copy(stops[0]); selectStop(0,'DEPARTING');
    const clock=new THREE.Clock(); let firstFrame=true;
    const animate=()=>{
      const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime; mapGroup.rotation.y+=(targetRY-mapGroup.rotation.y)*0.07; mapGroup.rotation.x+=(targetRX-mapGroup.rotation.x)*0.07;
      if(!paused){
        if(endHold>0){endHold-=dt;if(endHold<=0)restart();}
        else if(dwell>0){dwell-=dt;}
        else if(segment<projects.length-1){
          progress+=dt/segmentDuration;const local=Math.min(progress,1);const t0=segment/(projects.length-1),t1=(segment+1)/(projects.length-1),ct=THREE.MathUtils.lerp(t0,t1,local);const pos=curve.getPoint(ct),tan=curve.getTangent(ct);carrier.position.copy(pos);carrier.rotation.z=Math.atan2(tan.y,tan.x);
          if(local>=1){segment+=1;progress=0;selectStop(segment,segment===projects.length-1?'LATEST STOP':'ARRIVING');dwell=1.35;if(segment===projects.length-1)endHold=3.0;}else setStatus(segment+1,'EN ROUTE TO');
        }
      }
      beacon.rotation.z+=0.04;beacon.scale.setScalar(1+Math.sin(t*4.8)*0.12);lamp.intensity=1.25+Math.sin(t*7)*0.25;stationRings.forEach((r,i)=>{r.rotation.z+=0.004*(i%2?1:-1)});stops.forEach((p,i)=>placeLabel(p,labelEls[i]));renderer.render(scene,camera);
      if(firstFrame){firstFrame=false;stage.classList.add('three-ready');if(fallback)fallback.setAttribute('aria-hidden','true');setStatus(selected,'3D MAP ONLINE');}
      requestAnimationFrame(animate);
    };
    animate();
  }catch(err){
    console.error('[RI TRANSIT] Three.js scene failed; keeping fallback map visible.',err);
    stage.classList.add('fallback-only');
    setStatus(0,'2D FALLBACK ACTIVE');
  }
})();
