(function(){
  'use strict';
  window.__RI_TRANSIT_INIT__ = true;

  const stage = document.getElementById('projectTransitStage');
  const canvas = document.getElementById('projectTransitCanvas') || document.getElementById('projectTransitCanvasActive');
  const labelsRoot = document.getElementById('stationLabels');
  const status = document.getElementById('transitStatus');
  const mobileCard = document.getElementById('transitMobileCard');
  const pauseBtn = document.getElementById('transitPause');
  const replayBtn = document.getElementById('transitReplay');
  const nextBtn = document.getElementById('transitNext');
  if (canvas && canvas.id !== 'projectTransitCanvasActive') canvas.id = 'projectTransitCanvasActive';

  const style=document.createElement('style');
  style.textContent=`
    .transit-stage{min-height:560px;background:#000;overflow:hidden;isolation:isolate;touch-action:pan-y}
    #projectTransitCanvasActive{position:absolute;inset:0;z-index:3;width:100%;height:100%;display:block;background:radial-gradient(circle at 50% 42%,rgba(57,255,136,.035),#000 72%)}
    .transit-stage::after{content:'';position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.015),transparent 18%,transparent 82%,rgba(0,0,0,.45)),repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 4px);mix-blend-mode:screen;opacity:.32}
    .station-label{z-index:8;transform:translate(-50%,-50%);min-width:108px;max-width:152px;padding:6px 8px;background:rgba(0,0,0,.86);border:1px solid rgba(57,255,136,.42);color:#39ff88;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 0 18px rgba(57,255,136,.08);backdrop-filter:blur(5px);transition:.2s ease}
    .station-label strong{display:block;color:#ffd75f;font-size:8px;line-height:1.2}.station-label i{display:block;color:#ff4fd8;font-size:5.5px;font-style:normal;margin-bottom:3px}.station-label.active{border-color:#ff4fd8;box-shadow:0 0 20px rgba(255,79,216,.24);transform:translate(-50%,-50%) scale(1.08)}
    .transit-legend,.transit-status{z-index:9}.transit-mobile-card{z-index:9}
    .transit-depth-hint{position:absolute;right:12px;bottom:12px;z-index:9;color:#39ff88;font:600 6px/1.35 'IBM Plex Mono',monospace;letter-spacing:.11em;background:rgba(0,0,0,.72);border-right:2px solid #ff4fd8;padding:6px 8px;pointer-events:none}
    .transit-fallback{position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:#000}.transit-stage.three-ready .transit-fallback{display:none}
    @media(max-width:820px){.transit-stage{min-height:600px}.station-label{min-width:62px;max-width:78px;padding:4px 5px}.station-label strong{font-size:6px}.station-label i{font-size:4px}.transit-depth-hint{bottom:84px;font-size:5px;max-width:120px}.transit-stage::after{opacity:.22}}
  `;
  document.head.appendChild(style);

  const projects=[
    {title:'Kubera — AI Finance Manager',short:'KUBERA',year:'2024',target:'project-kubera',repo:'https://github.com/roronoa2003/Kubera'},
    {title:'Paytm Logo Detection in Cricket',short:'PAYTM CV',year:'2025',target:'project-paytm',repo:'https://github.com/roronoa2003/paytm-logo-detection'},
    {title:'ResMatch - AI-Powered Resume Matching Platform',short:'RESMATCH',year:'2025',target:'project-resmatch',repo:'https://github.com/roronoa2003/ResMatch_Deployed'},
    {title:'Setu — Project Allocation Tool',short:'SETU',year:'2026',target:'project-setu',repo:''},
    {title:'Upper Celestials Ops Dashboard',short:'UC OPS',year:'2026',target:'project-uc-ops',repo:'https://github.com/roronoa2003/uc-dashboard'},
    {title:'Organisational Agentic Digital Twin Platform',short:'AGENTIC TWIN',year:'2026',target:'project-digital-twin',repo:'https://github.com/roronoa2003/directors'}
  ];

  function setStatus(i,state='ARRIVING'){
    const p=projects[i]||projects[0];
    if(status) status.innerHTML=`<span>BUS 01 // ${state}</span><b>${p.short}</b><small>${p.year} // PROJECT ${String(i+1).padStart(2,'0')} OF ${String(projects.length).padStart(2,'0')}</small>`;
  }
  function renderCard(i){
    if(!mobileCard) return;
    const p=projects[i];
    const link=p.repo?`<a href="${p.repo}" target="_blank" rel="noopener">REPO ↗</a>`:`<a href="#${p.target}">VIEW ↓</a>`;
    mobileCard.innerHTML=`<span class="tm-index">${String(i+1).padStart(2,'0')}</span><span class="tm-copy"><b>${p.title}</b><span>${p.year} // 3D PROJECT STOP</span></span>${link}`;
  }

  if(!stage || !canvas || !window.THREE){ setStatus(0,'WEBGL UNAVAILABLE'); return; }

  try{
    const THREE=window.THREE;
    const mobile=()=>innerWidth<=820;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!mobile(),powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);
    if('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=!mobile();
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x000000,mobile()?0.035:0.026);
    const camera=new THREE.PerspectiveCamera(48,1,0.1,100);
    const target=new THREE.Vector3(0,0.5,0);
    let orbitYaw=0.62, orbitPitch=0.42, orbitRadius=mobile()?17.2:16.2;
    function updateCamera(){
      const cp=Math.cos(orbitPitch),sp=Math.sin(orbitPitch),cy=Math.cos(orbitYaw),sy=Math.sin(orbitYaw);
      camera.position.set(target.x+orbitRadius*cp*sy,target.y+orbitRadius*sp,target.z+orbitRadius*cp*cy);
      camera.lookAt(target);
    }
    updateCamera();

    const ambient=new THREE.HemisphereLight(0x8dffbb,0x020202,1.35);scene.add(ambient);
    const key=new THREE.DirectionalLight(0xffffff,1.55);key.position.set(6,10,8);key.castShadow=!mobile();scene.add(key);
    const magenta=new THREE.PointLight(0xff4fd8,1.25,24);magenta.position.set(-5,2,5);scene.add(magenta);
    const greenLight=new THREE.PointLight(0x39ff88,1.0,22);greenLight.position.set(5,4,-5);scene.add(greenLight);

    const GREEN=0x39ff88,PINK=0xff4fd8,YELLOW=0xffd75f,DARK=0x050806;
    const world=new THREE.Group();scene.add(world);

    const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,22),new THREE.MeshStandardMaterial({color:0x020302,roughness:.9,metalness:.1,transparent:true,opacity:.96}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-2.35;floor.receiveShadow=true;world.add(floor);
    const grid=new THREE.GridHelper(28,40,GREEN,0x17301e);grid.position.y=-2.32;grid.material.transparent=true;grid.material.opacity=.32;world.add(grid);

    function rand(n){const x=Math.sin(n*999.91)*43758.5453;return x-Math.floor(x)}
    const blockMatA=new THREE.MeshStandardMaterial({color:0x07120a,emissive:0x031006,roughness:.72,metalness:.18});
    const blockMatB=new THREE.MeshStandardMaterial({color:0x120612,emissive:0x160415,roughness:.68,metalness:.15});
    for(let i=0;i<(mobile()?34:58);i++){
      const x=-11+rand(i+1)*22,z=-8+rand(i+44)*16;
      if(Math.abs(x)<7.2 && Math.abs(z)<4.4 && rand(i+91)>.42) continue;
      const w=.35+rand(i+130)*.75,d=.35+rand(i+170)*.75,h=.35+rand(i+210)*2.3;
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),i%3?blockMatA:blockMatB);b.position.set(x,-2.35+h/2,z);world.add(b);
      if(!mobile() && i%4===0){const top=new THREE.Mesh(new THREE.BoxGeometry(w*.55,.025,d*.55),new THREE.MeshBasicMaterial({color:i%2?GREEN:PINK,transparent:true,opacity:.5}));top.position.set(x,-2.35+h+.025,z);world.add(top)}
    }

    const stops=[
      new THREE.Vector3(-6.2,-.75,3.1),
      new THREE.Vector3(-4.05,1.45,.55),
      new THREE.Vector3(-1.8,.05,-3.2),
      new THREE.Vector3(.75,2.05,-1.05),
      new THREE.Vector3(3.25,.35,2.75),
      new THREE.Vector3(6.15,2.75,.15)
    ];
    const curve=new THREE.CatmullRomCurve3(stops,false,'catmullrom',.22);

    const railMat=new THREE.MeshStandardMaterial({color:0x182019,emissive:0x071b0d,metalness:.72,roughness:.28});
    const glowMat=new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.72});
    const centerTube=new THREE.Mesh(new THREE.TubeGeometry(curve,mobile()?120:220,.035,8,false),glowMat);world.add(centerTube);
    const outerGlow=new THREE.Mesh(new THREE.TubeGeometry(curve,mobile()?120:220,.115,8,false),new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.065,depthWrite:false}));world.add(outerGlow);

    const sleeperGeo=new THREE.BoxGeometry(.72,.045,.08),sleeperMat=new THREE.MeshStandardMaterial({color:0x2b2f2b,metalness:.7,roughness:.32});
    const railGeo=new THREE.BoxGeometry(.055,.065,.72);
    const railA=new THREE.InstancedMesh(railGeo,railMat,mobile()?54:86),railB=new THREE.InstancedMesh(railGeo,railMat,mobile()?54:86),sleepers=new THREE.InstancedMesh(sleeperGeo,sleeperMat,mobile()?54:86);
    const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3();
    const count=railA.count;
    for(let i=0;i<count;i++){
      const t=i/(count-1),p=curve.getPoint(t),tan=curve.getTangent(t).normalize();
      side.crossVectors(tan,up);if(side.lengthSq()<.001)side.set(0,0,1);side.normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tan);
      const offset=.23;
      dummy.position.copy(p).addScaledVector(side,offset);dummy.quaternion.copy(q);dummy.scale.set(1,1,1);dummy.updateMatrix();railA.setMatrixAt(i,dummy.matrix);
      dummy.position.copy(p).addScaledVector(side,-offset);dummy.updateMatrix();railB.setMatrixAt(i,dummy.matrix);
      const sq=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),side);
      dummy.position.copy(p);dummy.quaternion.copy(sq);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);
    }
    world.add(railA,railB,sleepers);

    const progressPts=curve.getPoints(240);const progressGeom=new THREE.BufferGeometry().setFromPoints(progressPts);progressGeom.setDrawRange(0,1);
    const progressLine=new THREE.Line(progressGeom,new THREE.LineBasicMaterial({color:YELLOW,transparent:true,opacity:.95}));world.add(progressLine);

    const stationMeshes=[],stationRings=[],labelEls=[];
    if(labelsRoot) labelsRoot.innerHTML='';
    stops.forEach((p,i)=>{
      const g=new THREE.Group();g.position.copy(p);world.add(g);
      const platform=new THREE.Mesh(new THREE.BoxGeometry(1.25,.13,.82),new THREE.MeshStandardMaterial({color:DARK,emissive:i%2?0x170513:0x04170a,metalness:.6,roughness:.3}));platform.position.y=-.19;platform.castShadow=!mobile();g.add(platform);
      const pad=new THREE.Mesh(new THREE.BoxGeometry(1.08,.02,.66),new THREE.MeshBasicMaterial({color:i%3===0?YELLOW:i%3===1?PINK:GREEN,transparent:true,opacity:.58}));pad.position.y=-.115;g.add(pad);
      const station=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.18,24),new THREE.MeshStandardMaterial({color:i%3===0?YELLOW:i%3===1?PINK:GREEN,emissive:i%3===0?0x3e2b00:i%3===1?0x310a2b:0x063a1e,metalness:.35,roughness:.2}));station.position.y=.02;station.userData.index=i;g.add(station);stationMeshes.push(station);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.025,8,48),new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.95}));ring.rotation.x=Math.PI/2;ring.position.y=.16;g.add(ring);stationRings.push(ring);
      const mastH=Math.max(.75,p.y+2.4);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,mastH,8),new THREE.MeshBasicMaterial({color:i%2?PINK:YELLOW,transparent:true,opacity:.35}));mast.position.y=-mastH/2-.24;g.add(mast);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.42,.10,24),new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.7,roughness:.35}));base.position.y=-mastH-.27;g.add(base);
      const halo=new THREE.PointLight(i%3===1?PINK:GREEN,.8,3);halo.position.y=.25;g.add(halo);
      if(labelsRoot){const el=document.createElement('button');el.type='button';el.className='station-label';el.innerHTML=`<i>STOP ${String(i+1).padStart(2,'0')} // ${projects[i].year}</i><strong>${projects[i].short}</strong>`;el.setAttribute('aria-label',`Project stop ${i+1}: ${projects[i].title}`);labelsRoot.appendChild(el);labelEls.push(el)}
    });

    const hint=document.createElement('div');hint.className='transit-depth-hint';hint.textContent=mobile()?'DRAG MAP • TAP STATIONS':'DRAG TO ORBIT • SCROLL TO ZOOM • CLICK STATIONS';stage.appendChild(hint);

    const carrier=new THREE.Group();world.add(carrier);
    const bus=new THREE.Group();carrier.add(bus);
    const busBody=new THREE.Mesh(new THREE.BoxGeometry(1.28,.52,.58),new THREE.MeshStandardMaterial({color:PINK,emissive:0x2c051f,metalness:.52,roughness:.24}));busBody.position.y=.15;busBody.castShadow=!mobile();bus.add(busBody);
    const busRoof=new THREE.Mesh(new THREE.BoxGeometry(.94,.22,.52),new THREE.MeshStandardMaterial({color:YELLOW,emissive:0x332600,metalness:.3,roughness:.28}));busRoof.position.set(-.05,.51,0);bus.add(busRoof);
    const glass=new THREE.MeshStandardMaterial({color:GREEN,emissive:0x064322,metalness:.08,roughness:.08});
    [-.38,-.08,.22,.48].forEach(x=>{const w=new THREE.Mesh(new THREE.BoxGeometry(.18,.17,.02),glass);w.position.set(x,.24,.301);bus.add(w)});
    const wheelMat=new THREE.MeshStandardMaterial({color:0x050505,metalness:.15,roughness:.8});
    const wheels=[];[[-.40,-.13,.30],[.40,-.13,.30],[-.40,-.13,-.30],[.40,-.13,-.30]].forEach(([x,y,z])=>{const wh=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.08,20),wheelMat);wh.rotation.x=Math.PI/2;wh.position.set(x,y,z);bus.add(wh);wheels.push(wh)});
    const frontLamp=new THREE.PointLight(YELLOW,2.2,5);frontLamp.position.set(.72,.18,.26);bus.add(frontLamp);
    const underGlow=new THREE.PointLight(PINK,1.15,3.8);underGlow.position.set(0,-.15,0);bus.add(underGlow);
    const beacon=new THREE.Mesh(new THREE.TorusGeometry(.32,.023,8,48),new THREE.MeshBasicMaterial({color:YELLOW,transparent:true,opacity:.95}));beacon.rotation.x=Math.PI/2;beacon.position.y=.86;carrier.add(beacon);

    try{
      if(THREE.GLTFLoader){
        const loader=new THREE.GLTFLoader();
        loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',g=>{
          const model=g.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=1.35/(Math.max(size.x,size.y,size.z)||1);
          model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));model.rotation.y=Math.PI/2;model.position.y=-.12;bus.visible=false;carrier.add(model);setStatus(selected,'GLB VEHICLE ONLINE');
        },undefined,()=>{});
        loader.load('3d_character_young_boy.glb',g=>{
          const model=g.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=1.3/(Math.max(size.x,size.y,size.z)||1);
          model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));model.position.copy(stops[5]).add(new THREE.Vector3(.6,.1,.55));world.add(model);
        },undefined,()=>{});
      }
    }catch(_e){}

    let selected=0,segment=0,localProgress=0,paused=false,dwell=1.1,endHold=0;
    const duration=mobile()?2.8:3.25;
    function selectStop(i,state='ARRIVING',jump=false){
      selected=Math.max(0,Math.min(projects.length-1,i));
      labelEls.forEach((el,n)=>el.classList.toggle('active',n===selected));
      stationRings.forEach((r,n)=>{r.material.color.setHex(n===selected?PINK:n<selected?YELLOW:GREEN);r.scale.setScalar(n===selected?1.32:1)});
      renderCard(selected);setStatus(selected,state);
      if(jump){segment=Math.min(selected,projects.length-2);localProgress=selected===projects.length-1?1:0;dwell=.85;carrier.position.copy(stops[selected]);}
    }
    labelEls.forEach((el,i)=>el.addEventListener('click',e=>{e.stopPropagation();selectStop(i,'SELECTED',true)}));
    function restart(){segment=0;localProgress=0;dwell=1.1;endHold=0;paused=false;carrier.position.copy(stops[0]);progressGeom.setDrawRange(0,1);if(pauseBtn){pauseBtn.textContent='[ PAUSE ]';pauseBtn.classList.add('active')}selectStop(0,'DEPARTING')}
    function next(){const n=Math.min(projects.length-1,selected+1);if(n===selected)restart();else selectStop(n,'SELECTED',true)}
    pauseBtn?.addEventListener('click',()=>{paused=!paused;pauseBtn.textContent=paused?'[ RESUME ]':'[ PAUSE ]';pauseBtn.classList.toggle('active',!paused);setStatus(selected,paused?'PAUSED':'RUNNING')});
    replayBtn?.addEventListener('click',restart);nextBtn?.addEventListener('click',next);

    let dragging=false,startX=0,startY=0,baseYaw=orbitYaw,basePitch=orbitPitch,moved=0;
    stage.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;startY=e.clientY;baseYaw=orbitYaw;basePitch=orbitPitch;moved=0;stage.setPointerCapture?.(e.pointerId)});
    stage.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));orbitYaw=baseYaw-dx*(mobile()?.0032:.0045);orbitPitch=Math.max(.12,Math.min(.95,basePitch+dy*(mobile()?.0024:.0032)));updateCamera()});
    const release=e=>{dragging=false;stage.releasePointerCapture?.(e.pointerId)};stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
    stage.addEventListener('wheel',e=>{if(mobile())return;e.preventDefault();orbitRadius=Math.max(10.5,Math.min(22,orbitRadius+e.deltaY*.009));updateCamera()},{passive:false});

    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    stage.addEventListener('click',e=>{if(moved>8)return;const r=stage.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(stationMeshes,true);if(hits.length){let obj=hits[0].object;while(obj && obj.userData.index==null)obj=obj.parent;if(obj&&obj.userData.index!=null)selectStop(obj.userData.index,'SELECTED',true)}});

    function resize(){const r=stage.getBoundingClientRect();const w=Math.max(300,r.width||800),h=Math.max(420,r.height||560);renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile()?1.25:1.7));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
    resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else addEventListener('resize',resize);
    function labelPosition(worldPoint,el){if(!el)return;const r=stage.getBoundingClientRect(),p=worldPoint.clone().project(camera);const x=(p.x*.5+.5)*r.width,y=(-p.y*.5+.5)*r.height;el.style.left=`${Math.max(36,Math.min(r.width-36,x))}px`;el.style.top=`${Math.max(72,Math.min(r.height-(mobile()?130:46),y-42))}px`;el.style.opacity=(p.z>1||p.z<-1)?'0':'1'}

    const clock=new THREE.Clock();let first=true;
    function animate(){
      const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
      if(!paused){
        if(endHold>0){endHold-=dt;if(endHold<=0)restart()}
        else if(dwell>0)dwell-=dt;
        else if(segment<projects.length-1){
          localProgress+=dt/duration;const lp=Math.min(localProgress,1),t0=segment/(projects.length-1),t1=(segment+1)/(projects.length-1),t=THREE.MathUtils.lerp(t0,t1,lp),pos=curve.getPoint(t),tan=curve.getTangent(t).normalize();
          carrier.position.copy(pos);carrier.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),tan);
          wheels.forEach(w=>w.rotation.z-=dt*7.5);
          progressGeom.setDrawRange(0,Math.max(2,Math.floor(t*(progressPts.length-1))));
          if(lp>=1){segment++;localProgress=0;selectStop(segment,segment===projects.length-1?'LATEST STOP':'ARRIVING');dwell=1.2;if(segment===projects.length-1)endHold=3.0}else setStatus(segment+1,'CLIMBING TO');
        }
      }
      beacon.rotation.z+=dt*1.8;beacon.scale.setScalar(1+Math.sin(time*5)*.08);frontLamp.intensity=1.8+Math.sin(time*7)*.35;underGlow.intensity=.9+Math.sin(time*4.3)*.2;
      stationRings.forEach((r,i)=>{r.rotation.z+=dt*(i%2?1:-1)*.35});
      stops.forEach((p,i)=>labelPosition(p.clone().add(new THREE.Vector3(0,.62,0)),labelEls[i]));
      renderer.render(scene,camera);
      if(first){first=false;stage.classList.add('three-ready');setStatus(selected,'3D WORLD ONLINE')}
      requestAnimationFrame(animate);
    }
    carrier.position.copy(stops[0]);selectStop(0,'DEPARTING');animate();
  }catch(err){console.error('[RI TRANSIT 3D]',err);setStatus(0,'3D INITIALISATION ERROR')}
})();
