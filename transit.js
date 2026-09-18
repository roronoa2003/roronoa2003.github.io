(function(){
  'use strict';
  const stage=document.getElementById('projectTransitStage'),canvas=document.getElementById('projectTransitCanvas');
  if(!stage||!canvas)return;
  const fail=(message)=>{if(status)status.textContent=message;stage.classList.add('three-error');};
  if(!window.THREE){fail('3D ENGINE UNAVAILABLE');return;}
  const status=document.getElementById('transitStatus'),labelsRoot=document.getElementById('stationLabels'),mobileCard=document.getElementById('transitMobileCard');
  const pauseBtn=document.getElementById('transitPause'),replayBtn=document.getElementById('transitReplay'),nextBtn=document.getElementById('transitNext');
  const projects=[
    ['Kubera','2024','project-kubera','https://github.com/roronoa2003/Kubera'],
    ['Paytm CV','2025','project-paytm','https://github.com/roronoa2003/paytm-logo-detection'],
    ['ResMatch','2025','project-resmatch','https://github.com/roronoa2003/ResMatch_Deployed'],
    ['Setu','2026','project-setu',''],
    ['UC Ops','2026','project-uc-ops','https://github.com/roronoa2003/uc-dashboard'],
    ['Agentic Twin','2026','project-digital-twin','https://github.com/roronoa2003/directors']
  ];
  const T=THREE,mobile=()=>innerWidth<780;
  let renderer;
  try{
    renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:!mobile(),powerPreference:'high-performance',preserveDrawingBuffer:false});
  }catch(e){fail('WEBGL INITIALISATION FAILED');console.error('[RI 3D] WebGL renderer failed',e);return;}
  renderer.setClearColor(0x000000,0);
  if('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace=T.SRGBColorSpace;
  canvas.style.opacity='1';canvas.style.visibility='visible';
  const scene=new T.Scene();scene.fog=new T.FogExp2(0x030403,.037);
  const camera=new T.PerspectiveCamera(42,1,.1,120);let camTheta=.12,camPhi=.88,camRadius=mobile()?18:15,targetTheta=.12,targetPhi=.88,targetRadius=camRadius;
  scene.add(new T.HemisphereLight(0xcaffda,0x020202,1.15));const key=new T.DirectionalLight(0xffffff,1.5);key.position.set(5,9,8);scene.add(key);const pinkLight=new T.PointLight(0xff5ac8,2,15);pinkLight.position.set(-5,2,3);scene.add(pinkLight);const greenLight=new T.PointLight(0x54f58a,1.4,18);greenLight.position.set(5,4,-3);scene.add(greenLight);
  const world=new T.Group();scene.add(world);
  const GREEN=0x54f58a,PINK=0xff5ac8,YELLOW=0xffe36e,DARK=0x0b0d0b;
  const floor=new T.GridHelper(22,28,0x1e4a2c,0x102116);floor.position.y=-3.05;world.add(floor);
  const base=new T.Mesh(new T.CylinderGeometry(8.8,9.4,.18,6),new T.MeshStandardMaterial({color:0x080a08,metalness:.35,roughness:.7}));base.position.y=-3.18;base.rotation.y=Math.PI/6;world.add(base);
  for(let i=0;i<(mobile()?28:52);i++){
    const h=.35+Math.random()*2.9,w=.22+Math.random()*.48,d=.22+Math.random()*.48,x=(Math.random()-.5)*16,z=(Math.random()-.5)*10;
    const b=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:DARK,emissive:i%3===0?0x082b16:i%3===1?0x25081e:0x332800,emissiveIntensity:.22,roughness:.8}));b.position.set(x,-3+h/2,z);world.add(b);
  }
  const stops=[new T.Vector3(-5.7,-1.75,2.3),new T.Vector3(-3.65,1.0,-1.7),new T.Vector3(-1.35,-.35,1.3),new T.Vector3(.85,1.85,-1.2),new T.Vector3(3.15,-.45,1.7),new T.Vector3(5.55,1.4,-2.0)];
  const curve=new T.CatmullRomCurve3(stops,false,'catmullrom',.25);
  world.add(new T.Mesh(new T.TubeGeometry(curve,180,.08,10,false),new T.MeshStandardMaterial({color:GREEN,emissive:0x0b5527,metalness:.35,roughness:.38})));
  world.add(new T.Mesh(new T.TubeGeometry(curve,180,.18,10,false),new T.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.07,depthWrite:false})));
  const routePts=curve.getSpacedPoints(120);for(let i=0;i<routePts.length;i+=4){const p=routePts[i],tan=curve.getTangent(i/(routePts.length-1)),sleeper=new T.Mesh(new T.BoxGeometry(.5,.025,.09),new T.MeshBasicMaterial({color:i%8===0?YELLOW:0x214e2c,transparent:true,opacity:.85}));sleeper.position.copy(p);sleeper.rotation.y=Math.atan2(tan.x,tan.z);world.add(sleeper)}
  const stationMeshes=[],rings=[],labelEls=[];
  stops.forEach((p,i)=>{
    const c=[YELLOW,PINK,GREEN][i%3],platform=new T.Mesh(new T.CylinderGeometry(.58,.72,.16,24),new T.MeshStandardMaterial({color:0x0d100d,metalness:.45,roughness:.5}));platform.position.copy(p).add(new T.Vector3(0,-.18,0));world.add(platform);
    const disk=new T.Mesh(new T.CylinderGeometry(.36,.36,.08,24),new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.35,metalness:.25,roughness:.35}));disk.position.copy(p);disk.userData.index=i;world.add(disk);stationMeshes.push(disk);
    const ring=new T.Mesh(new T.TorusGeometry(.63,.025,8,50),new T.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;ring.position.copy(p).add(new T.Vector3(0,.08,0));world.add(ring);rings.push(ring);
    const pylonH=Math.max(.4,p.y+3),pylon=new T.Mesh(new T.CylinderGeometry(.025,.04,pylonH,8),new T.MeshBasicMaterial({color:i%2?PINK:YELLOW,transparent:true,opacity:.42}));pylon.position.set(p.x,-3+pylonH/2,p.z);world.add(pylon);
    if(labelsRoot){const el=document.createElement('button');el.type='button';el.className='station-label';el.innerHTML=`<i>STOP ${String(i+1).padStart(2,'0')} · ${projects[i][1]}</i><strong>${projects[i][0]}</strong>`;el.addEventListener('click',()=>select(i,true));labelsRoot.appendChild(el);labelEls.push(el)}
  });
  const bus=new T.Group();world.add(bus);const body=new T.Mesh(new T.BoxGeometry(1.25,.48,.55),new T.MeshStandardMaterial({color:PINK,emissive:0x30041f,metalness:.45,roughness:.25}));body.position.y=.12;bus.add(body);const roof=new T.Mesh(new T.BoxGeometry(.86,.20,.49),new T.MeshStandardMaterial({color:YELLOW,emissive:0x3a2c00,roughness:.35}));roof.position.y=.45;bus.add(roof);const glass=new T.MeshStandardMaterial({color:GREEN,emissive:0x0c4c2b,roughness:.2});[-.34,-.04,.26].forEach(x=>{const w=new T.Mesh(new T.BoxGeometry(.2,.14,.018),glass);w.position.set(x,.18,.284);bus.add(w)});const beacon=new T.PointLight(YELLOW,2.5,4);beacon.position.set(.55,.18,.28);bus.add(beacon);
  let selected=0,segment=0,prog=0,paused=false,dwell=1.2,last=performance.now(),drag=false,sx=0,sy=0,sTheta=0,sPhi=0;
  function setStatus(i,state){const p=projects[i]||projects[0];if(status)status.textContent=`${state} · ${p[0]} · ${p[1]}`}
  function mobileInfo(i){if(!mobileCard)return;const p=projects[i],link=p[3]?`<a href="${p[3]}" target="_blank" rel="noopener">REPO ↗</a>`:`<a href="#${p[2]}">VIEW ↓</a>`;mobileCard.innerHTML=`<span class="tm-index">${String(i+1).padStart(2,'0')}</span><span class="tm-copy"><b>${p[0]}</b><span>${p[1]} · PROJECT STOP</span></span>${link}`}
  function select(i,jump=false){selected=Math.max(0,Math.min(projects.length-1,i));labelEls.forEach((e,n)=>e.classList.toggle('active',n===selected));rings.forEach((r,n)=>{r.material.color.setHex(n===selected?PINK:n<selected?YELLOW:GREEN);r.scale.setScalar(n===selected?1.22:1)});mobileInfo(selected);setStatus(selected,jump?'SELECTED':'ARRIVING');if(jump){segment=Math.min(selected,projects.length-2);prog=selected===projects.length-1?1:0;bus.position.copy(stops[selected]);dwell=1}}
  function restart(){segment=0;prog=0;paused=false;dwell=1.2;bus.position.copy(stops[0]);select(0);if(pauseBtn)pauseBtn.textContent='PAUSE'}function next(){const n=Math.min(projects.length-1,selected+1);if(n===selected)restart();else select(n,true)}
  pauseBtn?.addEventListener('click',()=>{paused=!paused;pauseBtn.textContent=paused?'RESUME':'PAUSE'});replayBtn?.addEventListener('click',restart);nextBtn?.addEventListener('click',next);
  stage.addEventListener('pointerdown',e=>{drag=true;sx=e.clientX;sy=e.clientY;sTheta=targetTheta;sPhi=targetPhi;stage.setPointerCapture?.(e.pointerId)});stage.addEventListener('pointermove',e=>{if(!drag)return;targetTheta=sTheta-(e.clientX-sx)*.006;targetPhi=Math.max(.38,Math.min(1.25,sPhi+(e.clientY-sy)*.004))});stage.addEventListener('pointerup',()=>drag=false);stage.addEventListener('pointercancel',()=>drag=false);stage.addEventListener('wheel',e=>{if(innerWidth<780)return;targetRadius=Math.max(10,Math.min(22,targetRadius+Math.sign(e.deltaY)*.8));e.preventDefault()},{passive:false});
  const ray=new T.Raycaster(),mouse=new T.Vector2();stage.addEventListener('click',e=>{if(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8)return;const r=stage.getBoundingClientRect();mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(stationMeshes)[0];if(hit)select(hit.object.userData.index,true)});
  function resize(){
    const r=stage.getBoundingClientRect(),w=Math.max(320,r.width||stage.clientWidth||900),h=Math.max(420,r.height||stage.clientHeight||560);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile()?1.15:1.6));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    targetRadius=mobile()?18:Math.max(12,Math.min(targetRadius,18));
  }
  if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else addEventListener('resize',resize,{passive:true});
  resize();
  function placeLabels(){const r=stage.getBoundingClientRect();stops.forEach((p,i)=>{const q=p.clone().project(camera),el=labelEls[i];if(!el)return;el.style.left=((q.x*.5+.5)*r.width)+'px';el.style.top=((-q.y*.5+.5)*r.height-18)+'px';el.style.opacity=q.z>1?'0':'1'})}
  function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;camTheta+=(targetTheta-camTheta)*.075;camPhi+=(targetPhi-camPhi)*.075;camRadius+=(targetRadius-camRadius)*.075;camera.position.set(Math.sin(camTheta)*Math.sin(camPhi)*camRadius,Math.cos(camPhi)*camRadius,Math.cos(camTheta)*Math.sin(camPhi)*camRadius);camera.lookAt(0,0,0);
    if(!paused){if(dwell>0)dwell-=dt;else if(segment<projects.length-1){prog+=dt/2.8;const local=Math.min(1,prog),u=(segment+local)/(projects.length-1),pos=curve.getPoint(u),tan=curve.getTangent(u);bus.position.copy(pos);const look=pos.clone().add(tan);bus.lookAt(look);bus.rotateY(Math.PI/2);if(local>=1){segment++;prog=0;select(segment);dwell=segment===projects.length-1?2.8:1.15;if(segment===projects.length-1)setTimeout(()=>{if(!paused)restart()},2900)}else setStatus(segment+1,'EN ROUTE TO')}}
    rings.forEach((r,i)=>r.rotation.z+=(i%2?1:-1)*.005);beacon.intensity=2.2+Math.sin(now*.01)*.5;placeLabels();renderer.render(scene,camera);requestAnimationFrame(animate)}
  restart();
  stage.classList.add('three-live');
  setStatus(0,'3D ENGINE ONLINE');
  requestAnimationFrame(animate);
})();
