(function(){
'use strict';

const stage=document.getElementById('projectTransitStage');
const canvas=document.getElementById('projectTransitCanvas');
const status=document.getElementById('transitStatus');
const labelsRoot=document.getElementById('stationLabels');
const mobileCard=document.getElementById('transitMobileCard');
const pauseBtn=document.getElementById('transitPause');
const replayBtn=document.getElementById('transitReplay');
const nextBtn=document.getElementById('transitNext');

if(!stage||!canvas)return;

const setStatus=text=>{if(status)status.textContent=text};
const T=window.THREE;
if(!T){setStatus('LOCAL 3D ENGINE UNAVAILABLE · STATIC MAP ACTIVE');stage.classList.add('three-error');return}

const mobile=()=>window.innerWidth<=780;
const saveData=!!(navigator.connection&&navigator.connection.saveData);
const weak=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
const low=mobile()||saveData||weak;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

const projects=[
  {name:'Kubera',full:'Kubera — AI Finance Manager',year:'2024',target:'project-kubera',repo:'https://github.com/roronoa2003/Kubera'},
  {name:'Paytm CV',full:'Paytm Logo Detection in Cricket',year:'2025',target:'project-paytm',repo:'https://github.com/roronoa2003/paytm-logo-detection'},
  {name:'ResMatch',full:'ResMatch – AI Resume Matching Platform',year:'2025',target:'project-resmatch',repo:'https://github.com/roronoa2003/ResMatch_Deployed'},
  {name:'Setu',full:'Setu – AI Project Allocation Platform',year:'2026',target:'project-setu',repo:''},
  {name:'UC Ops',full:'Upper Celestials Ops Dashboard',year:'2026',target:'project-uc-ops',repo:'https://github.com/roronoa2003/uc-dashboard'},
  {name:'Agentic Twin',full:'Organisation-as-a-Service – Agentic Digital Twin',year:'2026',target:'project-digital-twin',repo:'https://github.com/roronoa2003/directors'}
];

let renderer,scene,camera,world,curve,vehicle,routeRings=[],stationMeshes=[],labelEls=[],mixer=null;
let selected=0,segment=0,progress=0,paused=reduced,dwell=1.1,endHold=0;
let theta=.48,phi=.92,radius=low?18.8:16.4,targetTheta=theta,targetPhi=phi,targetRadius=radius;
let dragging=false,startX=0,startY=0,startTheta=0,startPhi=0,moved=0;
let stageVisible=true,pageVisible=!document.hidden,lastFrame=performance.now(),firstFrame=false;
const GREEN=0x54f58a,PINK=0xff5ac8,YELLOW=0xffe36e;
const groundY=-2.9;
const forward=new T.Vector3(1,0,0);
const stops=[
  new T.Vector3(-6.2,-1.35,3.0),
  new T.Vector3(-4.0,.55,-2.0),
  new T.Vector3(-1.45,-.20,1.35),
  new T.Vector3(1.0,1.15,-2.55),
  new T.Vector3(3.55,-.10,1.65),
  new T.Vector3(6.0,1.10,-.85)
];

function safe(name,fn){
  try{return fn()}
  catch(error){console.warn('[RI 3D] Optional layer failed:',name,error);return null}
}

function bootCore(){
  renderer=new T.WebGLRenderer({
    canvas,
    alpha:false,
    antialias:!low,
    powerPreference:low?'default':'high-performance',
    preserveDrawingBuffer:false
  });
  renderer.setClearColor(0x060807,1);
  if('outputColorSpace'in renderer&&T.SRGBColorSpace)renderer.outputColorSpace=T.SRGBColorSpace;
  if(T.ACESFilmicToneMapping!==undefined){
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
  }
  renderer.shadowMap.enabled=!low;
  if(renderer.shadowMap.enabled&&T.PCFSoftShadowMap!==undefined)renderer.shadowMap.type=T.PCFSoftShadowMap;

  scene=new T.Scene();
  scene.background=new T.Color(0x060807);
  scene.fog=new T.FogExp2(0x060807,low?.037:.030);

  camera=new T.PerspectiveCamera(43,1,.1,120);

  world=new T.Group();
  scene.add(world);

  scene.add(new T.HemisphereLight(0xbfffd1,0x050705,low?1.2:1.45));

  const sun=new T.DirectionalLight(0xfff3db,low?1.45:2.0);
  sun.position.set(-6,11,8);
  if(renderer.shadowMap.enabled){
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.near=.5;
    sun.shadow.camera.far=35;
    sun.shadow.camera.left=-12;
    sun.shadow.camera.right=12;
    sun.shadow.camera.top=11;
    sun.shadow.camera.bottom=-11;
    sun.shadow.bias=-.0005;
  }
  scene.add(sun);

  const pink=new T.PointLight(PINK,low?.55:1.05,22,2);
  pink.position.set(-6,3,4);
  scene.add(pink);

  const green=new T.PointLight(GREEN,low?.55:1.05,22,2);
  green.position.set(6,4,-4);
  scene.add(green);

  const ground=new T.Mesh(
    new T.PlaneGeometry(36,26),
    new T.MeshStandardMaterial({color:0x101410,roughness:.96,metalness:.02})
  );
  ground.rotation.x=-Math.PI/2;
  ground.position.y=groundY;
  ground.receiveShadow=renderer.shadowMap.enabled;
  world.add(ground);

  const grid=new T.GridHelper(32,32,0x315f3d,0x17251b);
  grid.position.y=groundY+.01;
  grid.material.transparent=true;
  grid.material.opacity=.36;
  world.add(grid);

  curve=new T.CatmullRomCurve3(stops,false,'catmullrom',.18);

  const roadGlow=new T.Mesh(
    new T.TubeGeometry(curve,low?96:150,.13,8,false),
    new T.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.12,depthWrite:false})
  );
  world.add(roadGlow);

  const road=new T.Mesh(
    new T.TubeGeometry(curve,low?96:150,.075,8,false),
    new T.MeshStandardMaterial({color:0x263129,emissive:0x0b351a,emissiveIntensity:.45,roughness:.45,metalness:.35})
  );
  road.castShadow=renderer.shadowMap.enabled;
  road.receiveShadow=renderer.shadowMap.enabled;
  world.add(road);

  const dashMat=new T.MeshBasicMaterial({color:YELLOW,transparent:true,opacity:.72});
  for(let i=2;i<54;i+=3){
    const u=i/56;
    const p=curve.getPoint(u);
    const tangent=curve.getTangent(u).normalize();
    const dash=new T.Mesh(new T.BoxGeometry(.24,.022,.045),dashMat);
    dash.position.copy(p).add(new T.Vector3(0,.03,0));
    dash.quaternion.setFromUnitVectors(forward,tangent);
    world.add(dash);
  }

  if(labelsRoot)labelsRoot.innerHTML='';

  stops.forEach((p,i)=>{
    const accent=[YELLOW,PINK,GREEN][i%3];
    const hub=new T.Group();
    hub.position.copy(p);
    world.add(hub);

    const platform=new T.Mesh(
      new T.CylinderGeometry(.70,.82,.18,24),
      new T.MeshStandardMaterial({color:0x141814,roughness:.62,metalness:.28})
    );
    platform.position.y=-.17;
    platform.castShadow=renderer.shadowMap.enabled;
    platform.receiveShadow=renderer.shadowMap.enabled;
    hub.add(platform);

    const ring=new T.Mesh(
      new T.TorusGeometry(.78,.038,8,44),
      new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.88})
    );
    ring.rotation.x=Math.PI/2;
    ring.position.y=-.06;
    hub.add(ring);
    routeRings.push(ring);

    const core=new T.Mesh(
      new T.CylinderGeometry(.22,.22,.16,20),
      new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.32,roughness:.34,metalness:.18})
    );
    core.userData.index=i;
    core.position.y=-.01;
    hub.add(core);
    stationMeshes.push(core);

    const poleMat=new T.MeshStandardMaterial({color:0x333a34,roughness:.4,metalness:.65});
    const pole=new T.Mesh(new T.CylinderGeometry(.025,.035,1.4,8),poleMat);
    pole.position.set(-.53,.60,-.38);
    hub.add(pole);
    const pole2=pole.clone();
    pole2.position.x=.53;
    hub.add(pole2);

    const canopy=new T.Mesh(
      new T.BoxGeometry(1.45,.08,.68),
      new T.MeshStandardMaterial({color:0x202520,roughness:.45,metalness:.45})
    );
    canopy.position.set(0,1.28,-.38);
    canopy.castShadow=renderer.shadowMap.enabled;
    hub.add(canopy);

    if(labelsRoot){
      const label=document.createElement('button');
      label.type='button';
      label.className='station-label';
      label.innerHTML='<i>STOP '+String(i+1).padStart(2,'0')+' · '+projects[i].year+'</i><strong>'+projects[i].name+'</strong>';
      label.setAttribute('aria-label',projects[i].full+', '+projects[i].year);
      label.addEventListener('click',()=>selectStop(i,true));
      labelsRoot.appendChild(label);
      labelEls.push(label);
    }
  });

  vehicle=new T.Group();
  world.add(vehicle);

  const fallbackBus=new T.Group();
  fallbackBus.name='proceduralVehicle';
  const bodyMat=new T.MeshStandardMaterial({color:PINK,emissive:0x260219,emissiveIntensity:.22,metalness:.35,roughness:.28});
  const cabMat=new T.MeshStandardMaterial({color:YELLOW,emissive:0x352900,emissiveIntensity:.16,metalness:.22,roughness:.34});
  const body=new T.Mesh(new T.BoxGeometry(1.28,.50,.62),bodyMat);
  body.position.y=.28;
  body.castShadow=renderer.shadowMap.enabled;
  fallbackBus.add(body);
  const cab=new T.Mesh(new T.BoxGeometry(.45,.43,.58),cabMat);
  cab.position.set(.47,.55,0);
  cab.castShadow=renderer.shadowMap.enabled;
  fallbackBus.add(cab);

  const glassMat=new T.MeshStandardMaterial({color:GREEN,emissive:0x073c21,emissiveIntensity:.45,roughness:.18});
  [-.36,-.08,.20].forEach(x=>{
    const w=new T.Mesh(new T.BoxGeometry(.18,.14,.02),glassMat);
    w.position.set(x,.34,.321);
    fallbackBus.add(w);
  });

  const wheelMat=new T.MeshStandardMaterial({color:0x070807,roughness:.95});
  [[-.38,.08,.34],[.38,.08,.34],[-.38,.08,-.34],[.38,.08,-.34]].forEach(v=>{
    const wheel=new T.Mesh(new T.CylinderGeometry(.13,.13,.08,16),wheelMat);
    wheel.rotation.x=Math.PI/2;
    wheel.position.set(v[0],v[1],v[2]);
    fallbackBus.add(wheel);
  });
  vehicle.add(fallbackBus);

  const headlight=new T.PointLight(YELLOW,low?1.0:1.8,4,2);
  headlight.position.set(.78,.40,.18);
  vehicle.add(headlight);

  vehicle.userData.headlight=headlight;
  vehicle.userData.fallback=fallbackBus;

  addEnvironment();
  loadRealAssets();

  resize();
  resetJourney();
  updateCamera();
}

function addEnvironment(){
  safe('environment',()=>{
    let seed=9137;
    const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
    const buildingCount=low?18:42;
    const mats=[
      new T.MeshStandardMaterial({color:0x171c18,roughness:.82,metalness:.10,emissive:0x061009,emissiveIntensity:.25}),
      new T.MeshStandardMaterial({color:0x1a151a,roughness:.80,metalness:.10,emissive:0x150913,emissiveIntensity:.20})
    ];
    for(let i=0;i<buildingCount;i++){
      let x=(rand()-.5)*27,z=(rand()-.5)*18;
      if(Math.abs(x)<8&&Math.abs(z)<5){i--;continue}
      const h=.8+rand()*3.8,w=.5+rand()*1.0,d=.5+rand()*1.0;
      const b=new T.Mesh(new T.BoxGeometry(w,h,d),mats[i%2]);
      b.position.set(x,groundY+h*.5,z);
      b.rotation.y=(rand()-.5)*.35;
      b.castShadow=renderer.shadowMap.enabled;
      b.receiveShadow=renderer.shadowMap.enabled;
      world.add(b);
      if(!low&&i%4===0){
        const light=new T.Mesh(new T.PlaneGeometry(w*.55,.08),new T.MeshBasicMaterial({color:i%8===0?PINK:YELLOW,transparent:true,opacity:.42,side:T.DoubleSide}));
        light.position.set(0,h*.20,d*.505);
        b.add(light);
      }
    }

    const treeCount=low?7:16;
    const trunkMat=new T.MeshStandardMaterial({color:0x3b2b1d,roughness:1});
    const leafMat=new T.MeshStandardMaterial({color:0x16321d,roughness:.9});
    for(let i=0;i<treeCount;i++){
      let x=(rand()-.5)*24,z=(rand()-.5)*16;
      if(Math.abs(x)<7&&Math.abs(z)<4){i--;continue}
      const s=.75+rand()*.5;
      const trunk=new T.Mesh(new T.CylinderGeometry(.06,.08,.8*s,6),trunkMat);
      trunk.position.set(x,groundY+.4*s,z);
      const crown=new T.Mesh(new T.ConeGeometry(.34*s,1.0*s,7),leafMat);
      crown.position.set(x,groundY+1.15*s,z);
      trunk.castShadow=crown.castShadow=renderer.shadowMap.enabled;
      world.add(trunk,crown);
    }

    const streetMat=new T.MeshStandardMaterial({color:0x343b35,roughness:.42,metalness:.65});
    const bulbMat=new T.MeshBasicMaterial({color:YELLOW});
    for(let i=5;i<46;i+=6){
      const u=i/50,p=curve.getPoint(u),tan=curve.getTangent(u),side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),tan).normalize();
      const s=i%12===5?1:-1;
      const base=p.clone().addScaledVector(side,s*1.10);
      const post=new T.Mesh(new T.CylinderGeometry(.022,.032,1.35,7),streetMat);
      post.position.copy(base).add(new T.Vector3(0,.55,0));
      const bulb=new T.Mesh(new T.SphereGeometry(.06,8,6),bulbMat);
      bulb.position.copy(base).add(new T.Vector3(0,1.20,0));
      world.add(post,bulb);
    }

    const count=low?24:72;
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      positions[i*3]=(rand()-.5)*25;
      positions[i*3+1]=groundY+.7+rand()*7;
      positions[i*3+2]=(rand()-.5)*17;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(positions,3));
    const points=new T.Points(geo,new T.PointsMaterial({color:0x8fffb2,size:low?.025:.035,transparent:true,opacity:.26,depthWrite:false}));
    points.name='worldMotes';
    world.add(points);
  });
}

function loadRealAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('GLB vehicle loader',()=>{
    const manager=new T.LoadingManager();
    const Loader=window.RI_GLTFLoader;
    const gltfLoader=new Loader(manager);
    gltfLoader.load(
      'assets/cesium-milk-truck.glb',
      gltf=>{
        safe('GLB vehicle placement',()=>{
          const model=gltf.scene;
          const box=new T.Box3().setFromObject(model);
          const size=box.getSize(new T.Vector3());
          const center=box.getCenter(new T.Vector3());
          const scale=1.65/(Math.max(size.x,size.y,size.z)||1);
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y=.30;
          model.rotation.y=Math.PI/2;
          model.traverse(n=>{
            if(n.isMesh){
              n.castShadow=renderer.shadowMap.enabled;
              n.receiveShadow=renderer.shadowMap.enabled;
            }
          });
          const procedural=vehicle.userData.fallback;
          if(procedural)procedural.visible=false;
          vehicle.add(model);
          if(gltf.animations&&gltf.animations.length){
            mixer=new T.AnimationMixer(model);
            gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
          }
          setJourneyStatus(selected,'REAL GLB VEHICLE ONLINE');
        });
      },
      undefined,
      error=>console.warn('[RI 3D] GLB vehicle unavailable; procedural vehicle remains active.',error)
    );

    if(!low){
      gltfLoader.load(
        '3d_character_young_boy.glb',
        gltf=>{
          safe('character placement',()=>{
            const model=gltf.scene;
            const box=new T.Box3().setFromObject(model);
            const size=box.getSize(new T.Vector3());
            const center=box.getCenter(new T.Vector3());
            const scale=1.45/(Math.max(size.x,size.y,size.z)||1);
            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            model.rotation.y=-1.7;
            model.traverse(n=>{
              if(n.isMesh){
                n.castShadow=true;
                n.receiveShadow=renderer.shadowMap.enabled;
              }
            });
            const root=new T.Group();
            root.position.copy(stops[5]).add(new T.Vector3(1.05,-.08,.35));
            root.add(model);
            world.add(root);
          });
        },
        undefined,
        error=>console.warn('[RI 3D] Character asset skipped.',error)
      );
    }
  });
}

function setJourneyStatus(i,state){
  const p=projects[i]||projects[0];
  setStatus(state+' · '+p.name+' · '+p.year);
}

function renderMobileCard(i){
  if(!mobileCard)return;
  const p=projects[i];
  const link=p.repo
    ?'<a href="'+p.repo+'" target="_blank" rel="noopener">REPO ↗</a>'
    :'<a href="#'+p.target+'">VIEW ↓</a>';
  mobileCard.innerHTML='<span class="tm-index">'+String(i+1).padStart(2,'0')+'</span><span class="tm-copy"><b>'+p.name+'</b><span>'+p.year+' · PROJECT STOP</span></span>'+link;
}

function selectStop(i,jump){
  selected=Math.max(0,Math.min(projects.length-1,i));
  labelEls.forEach((el,n)=>el.classList.toggle('active',n===selected));
  routeRings.forEach((ring,n)=>{
    ring.material.color.setHex(n===selected?PINK:n<selected?YELLOW:GREEN);
    ring.scale.setScalar(n===selected?1.18:1);
  });
  renderMobileCard(selected);
  setJourneyStatus(selected,jump?'SELECTED':'ARRIVING');
  if(jump){
    segment=Math.min(selected,projects.length-2);
    progress=selected===projects.length-1?1:0;
    dwell=.8;
    vehicle.position.copy(stops[selected]).add(new T.Vector3(0,.14,0));
  }
}

function resetJourney(){
  selected=0;
  segment=0;
  progress=0;
  dwell=1.1;
  endHold=0;
  paused=reduced;
  vehicle.position.copy(stops[0]).add(new T.Vector3(0,.14,0));
  selectStop(0,false);
  if(pauseBtn)pauseBtn.textContent=paused?'RESUME':'PAUSE';
}

function updateCamera(){
  camera.position.set(
    Math.sin(theta)*Math.sin(phi)*radius,
    Math.cos(phi)*radius+1.0,
    Math.cos(theta)*Math.sin(phi)*radius
  );
  camera.lookAt(0,-.25,0);
}

function resize(){
  const r=stage.getBoundingClientRect();
  const width=Math.max(320,r.width||stage.clientWidth||900);
  const height=Math.max(mobile()?450:520,r.height||stage.clientHeight||600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1:1.4));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
  targetRadius=low?18.8:Math.max(12.5,Math.min(targetRadius,19));
}

function placeLabels(){
  if(mobile())return;
  const r=stage.getBoundingClientRect();
  stops.forEach((p,i)=>{
    const el=labelEls[i];
    if(!el)return;
    const q=p.clone().add(new T.Vector3(0,1.55,0)).project(camera);
    el.style.left=Math.max(58,Math.min(r.width-58,(q.x*.5+.5)*r.width))+'px';
    el.style.top=Math.max(70,Math.min(r.height-34,(-q.y*.5+.5)*r.height))+'px';
    el.style.opacity=q.z>1?'0':'1';
  });
}

function wireInteraction(){
  pauseBtn?.addEventListener('click',()=>{
    paused=!paused;
    pauseBtn.textContent=paused?'RESUME':'PAUSE';
    setJourneyStatus(selected,paused?'PAUSED':'RUNNING');
  });
  replayBtn?.addEventListener('click',resetJourney);
  nextBtn?.addEventListener('click',()=>{
    const next=Math.min(projects.length-1,selected+1);
    if(next===selected)resetJourney();
    else selectStop(next,true);
  });

  stage.addEventListener('pointerdown',e=>{
    dragging=true;
    moved=0;
    startX=e.clientX;
    startY=e.clientY;
    startTheta=targetTheta;
    startPhi=targetPhi;
    try{stage.setPointerCapture?.(e.pointerId)}catch(_){}
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));
    targetTheta=startTheta-dx*(low?.0044:.0058);
    targetPhi=Math.max(.48,Math.min(1.28,startPhi+dy*(low?.0034:.0046)));
  });
  const release=e=>{
    dragging=false;
    try{stage.releasePointerCapture?.(e.pointerId)}catch(_){}
  };
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);

  stage.addEventListener('wheel',e=>{
    if(mobile())return;
    targetRadius=Math.max(11.8,Math.min(23,targetRadius+Math.sign(e.deltaY)*.72));
    e.preventDefault();
  },{passive:false});

  const raycaster=new T.Raycaster();
  const pointer=new T.Vector2();
  stage.addEventListener('click',e=>{
    if(moved>9)return;
    const r=stage.getBoundingClientRect();
    pointer.set(((e.clientX-r.left)/r.width)*2-1,-(((e.clientY-r.top)/r.height)*2-1));
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(stationMeshes,false)[0];
    if(hit)selectStop(hit.object.userData.index,true);
  });
}

function animate(now){
  requestAnimationFrame(animate);
  if(!stageVisible||!pageVisible){lastFrame=now;return}

  const targetFPS=low?40:60;
  const minFrame=1000/targetFPS;
  if(now-lastFrame<minFrame)return;
  const dt=Math.min((now-lastFrame)/1000,.05);
  lastFrame=now;

  try{
    theta+=(targetTheta-theta)*.075;
    phi+=(targetPhi-phi)*.075;
    radius+=(targetRadius-radius)*.075;
    updateCamera();

    if(!paused){
      if(endHold>0){
        endHold-=dt;
        if(endHold<=0)resetJourney();
      }else if(dwell>0){
        dwell-=dt;
      }else if(segment<projects.length-1){
        progress+=dt/(low?3.15:2.8);
        const local=Math.min(1,progress);
        const u=(segment+local)/(projects.length-1);
        const pos=curve.getPoint(u);
        const tangent=curve.getTangent(u).normalize();

        vehicle.position.copy(pos).add(new T.Vector3(0,.14,0));
        vehicle.quaternion.setFromUnitVectors(forward,tangent);

        if(local>=1){
          segment++;
          progress=0;
          selectStop(segment,false);
          dwell=segment===projects.length-1?1.7:1.0;
          if(segment===projects.length-1)endHold=2.8;
        }else{
          setJourneyStatus(segment+1,'EN ROUTE TO');
        }
      }
    }

    if(mixer)mixer.update(dt);
    routeRings.forEach((ring,i)=>ring.rotation.z+=(i%2?1:-1)*(low?.0025:.004));
    const headlight=vehicle.userData.headlight;
    if(headlight)headlight.intensity=(low?1.0:1.7)+Math.sin(now*.009)*.20;
    const motes=world.getObjectByName('worldMotes');
    if(motes)motes.rotation.y+=low?.00012:.00025;

    placeLabels();
    renderer.render(scene,camera);

    if(!firstFrame){
      firstFrame=true;
      stage.classList.remove('three-error');
      stage.classList.add('three-live');
      canvas.style.opacity='1';
      setJourneyStatus(selected,window.RI_GLTFLoader?'3D CORE ONLINE · GLB READY':'3D CORE ONLINE');
    }
  }catch(error){
    console.error('[RI 3D] Render loop failed; restoring static project map.',error);
    stage.classList.remove('three-live');
    stage.classList.add('three-error');
    setStatus('3D RENDER INTERRUPTED · STATIC MAP ACTIVE');
    paused=true;
  }
}

try{
  setStatus('STARTING LOCAL 3D CORE');
  bootCore();
  wireInteraction();

  if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize',resize,{passive:true});

  if(window.IntersectionObserver){
    new IntersectionObserver(entries=>{
      stageVisible=!!entries[0]&&entries[0].isIntersecting;
      lastFrame=performance.now();
    },{rootMargin:'180px 0px',threshold:.01}).observe(stage);
  }

  document.addEventListener('visibilitychange',()=>{
    pageVisible=!document.hidden;
    lastFrame=performance.now();
  });

  requestAnimationFrame(animate);
}catch(error){
  console.error('[RI 3D] Core initialization failed.',error);
  stage.classList.remove('three-live');
  stage.classList.add('three-error');
  setStatus('3D CORE ERROR · STATIC MAP ACTIVE');
}
})();