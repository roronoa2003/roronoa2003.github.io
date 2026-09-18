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

const GREEN=0x54f58a,PINK=0xff5ac8,YELLOW=0xffe36e,WARM=0xffc77f;
const groundY=-3.2;
const forward=new T.Vector3(1,0,0);
const worldUp=new T.Vector3(0,1,0);
const stops=[
  new T.Vector3(-6.3,-.05,3.05),
  new T.Vector3(-4.15,2.85,-2.05),
  new T.Vector3(-1.5,.65,1.30),
  new T.Vector3(1.0,3.55,-2.6),
  new T.Vector3(3.6,.95,1.72),
  new T.Vector3(6.15,3.05,-.82)
];

const BUILDING_LOTS=[
  {file:'building_A.gltf',height:3.55,x:-10.1,z:-1.3,rot:.10,scale:.94,radius:1.75},
  {file:'building_A.gltf',height:3.45,x:10.0,z:-1.4,rot:-.12,scale:.90,radius:1.70},
  {file:'building_B.gltf',height:3.30,x:-10.2,z:5.2,rot:-.34,scale:.92,radius:1.70},
  {file:'building_B.gltf',height:3.25,x:10.1,z:5.0,rot:.30,scale:.90,radius:1.65},
  {file:'building_C.gltf',height:3.90,x:-4.7,z:8.0,rot:.18,scale:.88,radius:1.85},
  {file:'building_C.gltf',height:3.80,x:4.8,z:8.1,rot:-.20,scale:.86,radius:1.82}
];

const CITY_PROPS=[
  {file:'streetlight.gltf',height:1.55,radius:.22,places:[[-5.6,-4.65,.10,1],[-2.6,-4.65,-.10,1],[.4,-4.65,.06,1],[3.4,-4.65,-.08,1],[6.2,-4.65,.10,1]]},
  {file:'bench.gltf',height:.42,radius:.48,places:[[-6.1,5.2,.25,1],[-2.0,5.9,-.18,1],[2.1,5.8,.14,1],[6.0,5.0,-.28,1]]},
  {file:'bush.gltf',height:.50,radius:.40,places:[[-7.3,6.2,0,1],[-5.8,6.5,0,.85],[-1.1,7.0,0,1.05],[1.3,7.1,0,.92],[5.7,6.4,0,1],[7.2,6.0,0,.88]]},
  {file:'trafficlight_A.gltf',height:1.55,radius:.28,places:[[-6.6,-6.9,.18,1],[6.5,-6.9,-.24,1]]},
  {file:'firehydrant.gltf',height:.32,radius:.22,desktopOnly:true,places:[[-4.8,-4.15,0,1],[2.8,-4.12,0,1],[6.6,-4.12,0,1]]},
  {file:'dumpster.gltf',height:.58,radius:.45,desktopOnly:true,places:[[-9.0,-3.2,.28,1],[9.0,3.5,-.30,1]]},
  {file:'watertower.gltf',height:2.8,radius:1.0,desktopOnly:true,places:[[11.7,-7.4,-.10,1]]},
  {file:'car_taxi.gltf',height:.62,radius:.65,desktopOnly:true,roadAllowed:true,places:[[-4.6,-6.0,Math.PI/2,1],[3.8,-6.0,Math.PI/2,1]]}
];

const occupied=[];
const roadReservations=[
  {x:0,z:-6.0,hx:8.7,hz:1.35},
  {x:-7.8,z:0,hx:1.35,hz:6.4}
];

let renderer,scene,camera,world,curve,vehicle,routeRings=[],stationMeshes=[],labelEls=[],mixer=null;
let selected=0,segment=0,progress=0,paused=reduced,dwell=1.1,endHold=0;
let theta=.52,phi=.96,radius=low?21.2:18.8,targetTheta=theta,targetPhi=phi,targetRadius=radius;
let dragging=false,startX=0,startY=0,startTheta=0,startPhi=0,moved=0;
let stageVisible=true,pageVisible=!document.hidden,lastFrame=performance.now(),firstFrame=false,lastInteraction=performance.now();

function safe(name,fn){
  try{return fn()}
  catch(error){console.warn('[RI 3D] Optional layer failed:',name,error);return null}
}

function distance2D(ax,az,bx,bz){return Math.hypot(ax-bx,az-bz)}

function nearTrack(x,z,radius=0){
  if(!curve)return false;
  const samples=64;
  let min=Infinity;
  for(let i=0;i<=samples;i++){
    const p=curve.getPoint(i/samples);
    const d=distance2D(x,z,p.x,p.z);
    if(d<min)min=d;
  }
  return min<1.18+radius;
}

function nearStation(x,z,radius=0){
  return stops.some(p=>distance2D(x,z,p.x,p.z)<1.30+radius);
}

function inRoad(x,z,radius=0){
  return roadReservations.some(r=>
    Math.abs(x-r.x)<r.hx+radius&&Math.abs(z-r.z)<r.hz+radius
  );
}

function collidesOccupied(x,z,radius=0,margin=.14){
  return occupied.some(o=>distance2D(x,z,o.x,o.z)<radius+o.radius+margin);
}

function reserve(x,z,radius,tag){
  occupied.push({x,z,radius,tag});
}

function canPlace(x,z,radius,opts={}){
  if(!opts.allowTrack&&nearTrack(x,z,radius))return false;
  if(!opts.allowStation&&nearStation(x,z,radius))return false;
  if(!opts.allowRoad&&inRoad(x,z,radius))return false;
  if(collidesOccupied(x,z,radius,opts.margin??.14))return false;
  return true;
}

function seedReservations(){
  occupied.length=0;
  BUILDING_LOTS.forEach(b=>reserve(b.x,b.z,b.radius,'building-lot'));
  CITY_PROPS.forEach(spec=>{
    if(spec.desktopOnly&&low)return;
    spec.places.forEach(p=>{
      if(spec.roadAllowed)return;
      reserve(p[0],p[1],spec.radius,'prop-lot');
    });
  });
}

function trackBank(u){
  return Math.sin(u*Math.PI*4.2)*.15+Math.sin(u*Math.PI*1.45)*.075;
}

function trackFrame(u){
  const point=curve.getPoint(u);
  const tangent=curve.getTangent(u).normalize();
  let side=new T.Vector3().crossVectors(worldUp,tangent).normalize();
  if(side.lengthSq()<.0001)side.set(1,0,0);
  const up=worldUp.clone();
  const bank=trackBank(u);
  side.applyAxisAngle(tangent,bank).normalize();
  up.applyAxisAngle(tangent,bank).normalize();
  const depth=new T.Vector3().crossVectors(tangent,up).normalize();
  return {point,tangent,side,up,depth,bank};
}

function orientObjectToTrack(object,u){
  const f=trackFrame(u);
  const m=new T.Matrix4().makeBasis(f.tangent,f.up,f.depth);
  object.quaternion.setFromRotationMatrix(m);
  return f;
}

function addCoasterTrack(){
  const segments=low?100:180;
  const left=[],right=[];
  for(let i=0;i<=segments;i++){
    const u=i/segments,f=trackFrame(u);
    left.push(f.point.clone().addScaledVector(f.side,.56));
    right.push(f.point.clone().addScaledVector(f.side,-.56));
  }

  const leftCurve=new T.CatmullRomCurve3(left,false,'catmullrom',.16);
  const rightCurve=new T.CatmullRomCurve3(right,false,'catmullrom',.16);
  const railMat=new T.MeshStandardMaterial({color:0x68736b,metalness:.84,roughness:.24,emissive:0x07140b,emissiveIntensity:.16});
  const railGlow=new T.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.22,depthWrite:false});
  const spineMat=new T.MeshStandardMaterial({color:0x2b302c,metalness:.62,roughness:.40});
  const sleeperMat=new T.MeshStandardMaterial({color:0x453425,metalness:.14,roughness:.80});
  const supportMat=new T.MeshStandardMaterial({color:0x343b36,metalness:.74,roughness:.32});

  const leftRail=new T.Mesh(new T.TubeGeometry(leftCurve,segments,low?.045:.055,8,false),railMat);
  const rightRail=new T.Mesh(new T.TubeGeometry(rightCurve,segments,low?.045:.055,8,false),railMat);
  leftRail.castShadow=rightRail.castShadow=renderer.shadowMap.enabled;
  world.add(leftRail,rightRail);

  const spine=new T.Mesh(new T.TubeGeometry(curve,segments,.035,7,false),spineMat);
  spine.castShadow=renderer.shadowMap.enabled;
  world.add(spine);
  world.add(new T.Mesh(new T.TubeGeometry(curve,segments,.012,5,false),railGlow));

  const sleeperGeo=new T.BoxGeometry(1.34,.075,.13);
  const sleeperCount=low?31:47;
  for(let i=0;i<sleeperCount;i++){
    const u=.01+(i/(sleeperCount-1))*.98,f=trackFrame(u);
    const sleeper=new T.Mesh(sleeperGeo,sleeperMat);
    sleeper.position.copy(f.point).addScaledVector(f.up,-.09);
    sleeper.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(f.side,f.up,f.tangent));
    sleeper.castShadow=renderer.shadowMap.enabled;
    sleeper.receiveShadow=renderer.shadowMap.enabled;
    world.add(sleeper);
  }

  const supportCount=low?11:17;
  const columnGeo=new T.CylinderGeometry(.055,.075,1,8);
  const beamGeo=new T.BoxGeometry(1.18,.09,.11);
  for(let i=0;i<supportCount;i++){
    const u=.035+(i/(supportCount-1))*.93,f=trackFrame(u);
    const horizontalSide=new T.Vector3(f.side.x,0,f.side.z).normalize();
    const topY=f.point.y-.18,height=Math.max(.7,topY-groundY);
    [-1,1].forEach(sign=>{
      const column=new T.Mesh(columnGeo,supportMat);
      column.scale.y=height;
      column.position.set(f.point.x+horizontalSide.x*.43*sign,groundY+height*.5,f.point.z+horizontalSide.z*.43*sign);
      column.castShadow=renderer.shadowMap.enabled;
      column.receiveShadow=renderer.shadowMap.enabled;
      world.add(column);
    });
    const beam=new T.Mesh(beamGeo,supportMat);
    beam.position.set(f.point.x,topY,f.point.z);
    const flatSide=horizontalSide.lengthSq()>.1?horizontalSide:new T.Vector3(1,0,0);
    beam.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(flatSide,worldUp,new T.Vector3(-flatSide.z,0,flatSide.x).normalize()));
    beam.castShadow=renderer.shadowMap.enabled;
    world.add(beam);
  }
}

function addStationLighting(point,accent,index){
  if(low&&index%2===1)return;
  const spot=new T.SpotLight(accent,low?1.0:1.85,9.5,.70,.56,1.5);
  spot.position.copy(point).add(new T.Vector3(index%2?1.5:-1.5,3.2,1.0));
  spot.target.position.copy(point);
  scene.add(spot,spot.target);
  if(renderer.shadowMap.enabled&&!low&&index%2===0){
    spot.castShadow=true;
    spot.shadow.mapSize.set(512,512);
    spot.shadow.bias=-.00045;
  }
}

function bootCore(){
  renderer=new T.WebGLRenderer({canvas,alpha:false,antialias:!low,powerPreference:low?'default':'high-performance',preserveDrawingBuffer:false});
  renderer.setClearColor(0x07100a,1);
  if('outputColorSpace'in renderer&&T.SRGBColorSpace)renderer.outputColorSpace=T.SRGBColorSpace;
  if(T.ACESFilmicToneMapping!==undefined){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08}
  renderer.shadowMap.enabled=!low;
  if(renderer.shadowMap.enabled&&T.PCFSoftShadowMap!==undefined)renderer.shadowMap.type=T.PCFSoftShadowMap;

  scene=new T.Scene();
  scene.background=new T.Color(0x07100a);
  scene.fog=new T.FogExp2(0x07100a,low?.032:.024);
  camera=new T.PerspectiveCamera(44,1,.1,140);
  world=new T.Group();
  scene.add(world);

  scene.add(new T.AmbientLight(0x263127,low?.22:.28));
  scene.add(new T.HemisphereLight(0xd8ffe3,0x10140f,low?1.05:1.22));
  const sun=new T.DirectionalLight(0xffefd8,low?1.50:2.15);
  sun.position.set(-7.5,14,9);
  if(renderer.shadowMap.enabled){
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.near=.5;sun.shadow.camera.far=45;
    sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;
    sun.shadow.bias=-.00052;
  }
  scene.add(sun);

  const coolFill=new T.DirectionalLight(0x8caaff,low?.20:.36);
  coolFill.position.set(8,7,-10);
  scene.add(coolFill);

  const pink=new T.PointLight(PINK,low?.42:.85,22,2);pink.position.set(-7,4,5);scene.add(pink);
  const green=new T.PointLight(GREEN,low?.40:.82,23,2);green.position.set(7,5,-5);scene.add(green);

  const sky=new T.Mesh(
    new T.SphereGeometry(70,low?16:28,low?9:16),
    new T.ShaderMaterial({
      side:T.BackSide,depthWrite:false,
      uniforms:{top:{value:new T.Color(0x17261b)},horizon:{value:new T.Color(0x102016)},bottom:{value:new T.Color(0x020503)}},
      vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(horizon,top,smoothstep(.0,.75,h));c=mix(bottom,c,smoothstep(-.45,.05,h));gl_FragColor=vec4(c,1.0);}'
    })
  );
  scene.add(sky);

  const ground=new T.Mesh(new T.PlaneGeometry(42,30),new T.MeshStandardMaterial({color:0x1a2819,roughness:.99,metalness:0,emissive:0x071008,emissiveIntensity:.08}));
  ground.rotation.x=-Math.PI/2;ground.position.y=groundY;ground.receiveShadow=renderer.shadowMap.enabled;world.add(ground);

  curve=new T.CatmullRomCurve3(stops,false,'catmullrom',.19);
  seedReservations();
  addCoasterTrack();

  if(labelsRoot)labelsRoot.innerHTML='';
  stops.forEach((p,i)=>{
    const accent=[YELLOW,PINK,GREEN][i%3];
    const hub=new T.Group();hub.position.copy(p);world.add(hub);
    const platform=new T.Mesh(new T.CylinderGeometry(.72,.84,.20,28),new T.MeshStandardMaterial({color:0x171b17,roughness:.58,metalness:.34}));
    platform.position.y=-.23;platform.castShadow=renderer.shadowMap.enabled;platform.receiveShadow=renderer.shadowMap.enabled;hub.add(platform);
    const ring=new T.Mesh(new T.TorusGeometry(.80,.040,8,48),new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.92}));
    ring.rotation.x=Math.PI/2;ring.position.y=-.10;hub.add(ring);routeRings.push(ring);
    const core=new T.Mesh(new T.CylinderGeometry(.22,.22,.17,24),new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.42,roughness:.30,metalness:.24}));
    core.userData.index=i;core.position.y=-.02;hub.add(core);stationMeshes.push(core);
    const canopy=new T.Mesh(new T.BoxGeometry(1.52,.085,.75),new T.MeshStandardMaterial({color:0x242a25,roughness:.42,metalness:.50}));
    canopy.position.set(0,1.22,-.36);canopy.castShadow=renderer.shadowMap.enabled;hub.add(canopy);
    const poleMat=new T.MeshStandardMaterial({color:0x3a413b,roughness:.38,metalness:.72});
    [-.55,.55].forEach(x=>{const pole=new T.Mesh(new T.CylinderGeometry(.025,.033,1.32,8),poleMat);pole.position.set(x,.57,-.36);pole.castShadow=renderer.shadowMap.enabled;hub.add(pole)});
    addStationLighting(p,accent,i);
    if(labelsRoot){
      const label=document.createElement('button');label.type='button';label.className='station-label';
      label.innerHTML='<i>STOP '+String(i+1).padStart(2,'0')+' · '+projects[i].year+'</i><strong>'+projects[i].name+'</strong>';
      label.setAttribute('aria-label',projects[i].full+', '+projects[i].year);label.addEventListener('click',()=>selectStop(i,true));labelsRoot.appendChild(label);labelEls.push(label);
    }
  });

  vehicle=new T.Group();world.add(vehicle);
  const fallbackCar=new T.Group();fallbackCar.name='proceduralVehicle';
  const body=new T.Mesh(new T.BoxGeometry(1.20,.42,.62),new T.MeshStandardMaterial({color:PINK,emissive:0x260219,emissiveIntensity:.28,metalness:.42,roughness:.25}));
  body.position.y=.27;body.castShadow=renderer.shadowMap.enabled;fallbackCar.add(body);
  [-.24,.18].forEach(x=>{const seat=new T.Mesh(new T.BoxGeometry(.26,.32,.50),new T.MeshStandardMaterial({color:YELLOW,emissive:0x302600,emissiveIntensity:.16,metalness:.24,roughness:.32}));seat.position.set(x,.55,0);fallbackCar.add(seat)});
  const wheelMat=new T.MeshStandardMaterial({color:0x070807,roughness:.95});
  [[-.36,.08,.34],[.36,.08,.34],[-.36,.08,-.34],[.36,.08,-.34]].forEach(v=>{const wheel=new T.Mesh(new T.CylinderGeometry(.12,.12,.08,16),wheelMat);wheel.rotation.x=Math.PI/2;wheel.position.set(v[0],v[1],v[2]);fallbackCar.add(wheel)});
  vehicle.add(fallbackCar);

  const headlight=new T.PointLight(YELLOW,low?.75:1.45,4,2);headlight.position.set(.70,.34,.16);vehicle.add(headlight);
  const underglow=new T.PointLight(PINK,low?.38:.75,3.5,2);underglow.position.set(0,-.03,0);vehicle.add(underglow);
  vehicle.userData.headlight=headlight;vehicle.userData.underglow=underglow;vehicle.userData.fallback=fallbackCar;

  addBackgroundEnvironment();
  loadRoadAssets();
  loadCityAssets();
  loadNatureAssets();
  loadRealAssets();
  addPracticalLights();

  resize();resetJourney();updateCamera();
}

function addBackgroundEnvironment(){
  safe('background environment',()=>{
    let seed=9137;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
    const count=low?16:42,positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){positions[i*3]=(rand()-.5)*25;positions[i*3+1]=groundY+.8+rand()*8;positions[i*3+2]=(rand()-.5)*18}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));
    const points=new T.Points(geo,new T.PointsMaterial({color:0x8fffb2,size:low?.022:.031,transparent:true,opacity:.18,depthWrite:false}));
    points.name='worldMotes';world.add(points);
  });
}

function addPracticalLights(){
  const lamps=[[-6.6,groundY+1.6,-4.55],[-2.5,groundY+1.6,-4.55],[1.6,groundY+1.6,-4.55],[5.8,groundY+1.6,-4.55]];
  lamps.slice(0,low?2:4).forEach((p,i)=>{const light=new T.PointLight(i%2?WARM:YELLOW,low?.48:.95,5.0,2);light.position.set(p[0],p[1],p[2]);scene.add(light)});
}

function normalizedAsset(root,targetHeight){
  const wrapper=new T.Group();
  root.updateMatrixWorld(true);
  let box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
  const scale=targetHeight/Math.max(.001,size.y);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  box=new T.Box3().setFromObject(root);
  const center=box.getCenter(new T.Vector3());
  root.position.x-=center.x;
  root.position.z-=center.z;
  root.position.y-=box.min.y;
  root.updateMatrixWorld(true);
  wrapper.add(root);
  wrapper.userData.baseRadius=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.5*scale;
  wrapper.traverse(n=>{
    if(n.isMesh){
      n.castShadow=renderer.shadowMap.enabled;
      n.receiveShadow=renderer.shadowMap.enabled;
      const mats=Array.isArray(n.material)?n.material:[n.material];
      mats.filter(Boolean).forEach(m=>{
        if('roughness'in m)m.roughness=Math.max(.34,m.roughness??.5);
        if('metalness'in m)m.metalness=Math.min(.38,m.metalness??0);
      });
    }
  });
  return wrapper;
}

function fallbackBuilding(lot,index){
  const colors=[0x27322b,0x2d2a31,0x242e27];
  const body=new T.Mesh(
    new T.BoxGeometry(2.3,lot.height,2.0),
    new T.MeshStandardMaterial({color:colors[index%colors.length],roughness:.78,metalness:.08,emissive:0x071009,emissiveIntensity:.18})
  );
  body.position.set(lot.x,groundY+lot.height*.5,lot.z);body.rotation.y=lot.rot;body.castShadow=renderer.shadowMap.enabled;body.receiveShadow=renderer.shadowMap.enabled;world.add(body);
  const windows=new T.Mesh(new T.PlaneGeometry(1.25,.15),new T.MeshBasicMaterial({color:index%2?PINK:YELLOW,transparent:true,opacity:.30}));
  windows.position.set(0,lot.height*.18,1.01);body.add(windows);
}

function loadRoadAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('real road assets',()=>{
    const loader=new window.RI_GLTFLoader(),base='assets/citybits/';
    const prep=root=>normalizedAsset(root,.13);
    const addTile=(template,x,z,rot=0,scale=1.30)=>{
      const c=template.clone(true);c.position.set(x,groundY+.008,z);c.rotation.y=rot;c.scale.multiplyScalar(scale);world.add(c)
    };
    const horizontal=[-5.2,-2.6,0,2.6,5.2];
    loader.load(base+'road_straight.gltf',gltf=>{
      const t=prep(gltf.scene);
      horizontal.forEach(x=>addTile(t,x,-6.0,Math.PI/2,1.30));
      [-3.2,-.6,2.0,4.6].slice(0,low?2:4).forEach(z=>addTile(t,-7.8,z,0,1.30));
    },undefined,e=>console.warn('[RI 3D] road_straight skipped',e));
    loader.load(base+'road_junction.gltf',gltf=>addTile(prep(gltf.scene),-7.8,-6.0,0,1.30),undefined,e=>console.warn('[RI 3D] road_junction skipped',e));
    loader.load(base+'road_corner_curved.gltf',gltf=>{
      const t=prep(gltf.scene);addTile(t,7.8,-6.0,Math.PI/2,1.30);if(!low)addTile(t,-7.8,6.2,Math.PI,1.30);
    },undefined,e=>console.warn('[RI 3D] road_corner skipped',e));
  });
}

function loadCityAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('asset-backed city environment',()=>{
    const loader=new window.RI_GLTFLoader(),base='assets/citybits/';
    const groups={};
    BUILDING_LOTS.forEach((lot,i)=>{
      (groups[lot.file]??=[]).push({lot,index:i});
    });

    Object.entries(groups).forEach(([file,items])=>{
      loader.load(base+file,gltf=>{
        safe('building '+file,()=>{
          const sourceHeight=Math.max(...items.map(x=>x.lot.height));
          const template=normalizedAsset(gltf.scene,sourceHeight);
          items.forEach(({lot})=>{
            const clone=template.clone(true);
            const ratio=lot.height/sourceHeight;
            clone.position.set(lot.x,groundY,lot.z);
            clone.rotation.y=lot.rot;
            clone.scale.multiplyScalar(ratio*lot.scale);
            world.add(clone);
          });
          stage.dataset.buildingsLoaded=String((Number(stage.dataset.buildingsLoaded)||0)+items.length);
        });
      },undefined,error=>{
        console.warn('[RI 3D] Building asset failed; using visible fallback:',file,error);
        items.forEach(({lot,index})=>fallbackBuilding(lot,index));
      });
    });

    CITY_PROPS.forEach(spec=>{
      if(spec.desktopOnly&&low)return;
      loader.load(base+spec.file,gltf=>{
        safe('prop '+spec.file,()=>{
          const template=normalizedAsset(gltf.scene,spec.height);
          spec.places.forEach(p=>{
            const radius=spec.radius*(p[3]||1);
            if(!spec.roadAllowed&&!canPlace(p[0],p[1],radius,{allowRoad:false,allowTrack:false,allowStation:false,margin:.08}))return;
            const clone=template.clone(true);
            clone.position.set(p[0],groundY,p[1]);clone.rotation.y=p[2]||0;clone.scale.multiplyScalar(p[3]||1);world.add(clone);
          });
        });
      },undefined,error=>console.warn('[RI 3D] City prop skipped:',spec.file,error));
    });
  });
}

function loadNatureAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('real forest assets',()=>{
    const loader=new window.RI_GLTFLoader();
    loader.load('assets/nature/forest.glb',gltf=>{
      safe('forest placement',()=>{
        const sources={};gltf.scene.traverse(n=>{if(n.name&&n.isMesh)sources[n.name]=n});
        let seed=67231;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};

        const scatter=(names,total,targetHeight,opts={})=>{
          const usable=names.map(n=>sources[n]).filter(Boolean);if(!usable.length||total<=0)return;
          let remaining=total;
          usable.forEach((src,variant)=>{
            if(remaining<=0)return;
            const capacity=Math.ceil(total/usable.length);
            const desired=Math.min(capacity,remaining);
            src.geometry.computeBoundingBox();
            const box=src.geometry.boundingBox,height=Math.max(.001,box.max.y-box.min.y);
            const inst=new T.InstancedMesh(src.geometry,src.material,desired);
            const dummy=new T.Object3D();
            let placed=0,attempts=0;
            while(placed<desired&&attempts<desired*30){
              attempts++;
              const x=(rand()-.5)*(opts.width||25),z=(rand()-.5)*(opts.depth||17);
              const scale=(targetHeight/height)*((opts.scaleMin||.8)+rand()*((opts.scaleMax||1.2)-(opts.scaleMin||.8)));
              const radius=(opts.radius||.30)*scale;
              const allowRoad=!!opts.allowRoad;
              if(!canPlace(x,z,radius,{allowRoad,allowTrack:false,allowStation:false,margin:opts.margin??.12}))continue;
              if(opts.edgeOnly&&Math.abs(x)<6.4&&Math.abs(z)<4.1)continue;
              dummy.position.set(x,groundY-box.min.y*scale+(opts.y||0),z);
              dummy.scale.setScalar(scale);dummy.rotation.y=rand()*Math.PI*2;dummy.updateMatrix();
              inst.setMatrixAt(placed,dummy.matrix);
              if(opts.reserve!==false)reserve(x,z,radius,opts.tag||'nature');
              placed++;
            }
            inst.count=placed;inst.instanceMatrix.needsUpdate=true;
            inst.castShadow=!!opts.shadows&&renderer.shadowMap.enabled;inst.receiveShadow=renderer.shadowMap.enabled;
            if(placed>0)world.add(inst);
            remaining-=placed;
          });
        };

        scatter(['Grass_2_D_Color1'],low?22:58,.28,{width:25,depth:17,scaleMin:.75,scaleMax:1.35,radius:.08,reserve:false,allowRoad:false,margin:.02});
        scatter(['Tree_1_A_Color1','Tree_1_C_Color1','Tree_3_A_Color1','Tree_3_C_Color1','Tree_4_A_Color1','Tree_4_C_Color1'],low?8:20,2.25,{width:25,depth:17,scaleMin:.78,scaleMax:1.18,radius:.44,edgeOnly:true,shadows:!low,tag:'tree',margin:.22});
        scatter(['Bush_1_E_Color1','Bush_3_B_Color1'],low?5:12,.72,{width:24,depth:16,scaleMin:.8,scaleMax:1.22,radius:.32,edgeOnly:true,shadows:!low,tag:'bush',margin:.14});
        scatter(['Rock_1_D_Color1','Rock_1_J_Color1','Rock_2_C_Color1','Rock_2_G_Color1','Rock_3_E_Color1','Rock_3_L_Color1','Rock_3_Q_Color1'],low?4:10,.62,{width:24,depth:16,scaleMin:.68,scaleMax:1.15,radius:.30,edgeOnly:true,shadows:!low,tag:'rock',margin:.10});
        stage.dataset.natureAssets='ready';setJourneyStatus(selected,'COLLISION-SAFE ENVIRONMENT ONLINE');
      });
    },undefined,e=>console.warn('[RI 3D] forest asset skipped',e));
  });
}

function loadRealAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('GLB vehicle loader',()=>{
    const gltfLoader=new window.RI_GLTFLoader();
    gltfLoader.load('assets/cesium-milk-truck.glb',gltf=>{
      safe('GLB vehicle placement',()=>{
        const model=gltf.scene,box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
        const scale=1.55/(Math.max(size.x,size.y,size.z)||1);
        model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));model.position.y=.28;model.rotation.y=Math.PI/2;
        model.traverse(n=>{if(n.isMesh){n.castShadow=renderer.shadowMap.enabled;n.receiveShadow=renderer.shadowMap.enabled}});
        if(vehicle.userData.fallback)vehicle.userData.fallback.visible=false;vehicle.add(model);
        if(gltf.animations&&gltf.animations.length){mixer=new T.AnimationMixer(model);gltf.animations.forEach(clip=>mixer.clipAction(clip).play())}
        setJourneyStatus(selected,'REAL GLB RIDE VEHICLE ONLINE');
      });
    },undefined,error=>console.warn('[RI 3D] GLB vehicle unavailable; procedural ride car remains active.',error));

    if(!low){
      gltfLoader.load('3d_character_young_boy.glb',gltf=>{
        safe('character placement',()=>{
          const model=gltf.scene,box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
          const scale=1.40/(Math.max(size.x,size.y,size.z)||1);
          model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));model.rotation.y=-1.7;
          model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=renderer.shadowMap.enabled}});
          const final=trackFrame(1),root=new T.Group();
          root.position.copy(stops[5]).addScaledVector(final.side,1.45).add(new T.Vector3(0,-.08,0));
          root.add(model);world.add(root);
        });
      },undefined,error=>console.warn('[RI 3D] Character asset skipped.',error));
    }
  });
}

function setJourneyStatus(i,state){const p=projects[i]||projects[0];setStatus(state+' · '+p.name+' · '+p.year)}

function renderMobileCard(i){
  if(!mobileCard)return;
  const p=projects[i],link=p.repo?'<a href="'+p.repo+'" target="_blank" rel="noopener">REPO ↗</a>':'<a href="#'+p.target+'">VIEW ↓</a>';
  mobileCard.innerHTML='<span class="tm-index">'+String(i+1).padStart(2,'0')+'</span><span class="tm-copy"><b>'+p.name+'</b><span>'+p.year+' · COASTER STOP</span></span>'+link;
}

function selectStop(i,jump){
  selected=Math.max(0,Math.min(projects.length-1,i));
  labelEls.forEach((el,n)=>el.classList.toggle('active',n===selected));
  routeRings.forEach((ring,n)=>{ring.material.color.setHex(n===selected?PINK:n<selected?YELLOW:GREEN);ring.scale.setScalar(n===selected?1.18:1)});
  renderMobileCard(selected);setJourneyStatus(selected,jump?'SELECTED':'ARRIVING');
  if(jump){
    segment=Math.min(selected,projects.length-2);progress=selected===projects.length-1?1:0;dwell=.75;
    const u=selected/(projects.length-1),f=orientObjectToTrack(vehicle,u);vehicle.position.copy(f.point).addScaledVector(f.up,.18);
  }
}

function resetJourney(){
  selected=0;segment=0;progress=0;dwell=1.0;endHold=0;paused=reduced;
  const f=orientObjectToTrack(vehicle,0);vehicle.position.copy(f.point).addScaledVector(f.up,.18);selectStop(0,false);
  if(pauseBtn)pauseBtn.textContent=paused?'RESUME':'PAUSE';
}

function updateCamera(){
  camera.position.set(Math.sin(theta)*Math.sin(phi)*radius,Math.cos(phi)*radius+1.8,Math.cos(theta)*Math.sin(phi)*radius);
  camera.lookAt(0,.45,0);
}

function resize(){
  const r=stage.getBoundingClientRect(),width=Math.max(320,r.width||stage.clientWidth||900),height=Math.max(mobile()?480:560,r.height||stage.clientHeight||650);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1:1.35));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  targetRadius=low?21.2:Math.max(13.8,Math.min(targetRadius,22));
}

function placeLabels(){
  if(mobile())return;
  const r=stage.getBoundingClientRect();
  stops.forEach((p,i)=>{
    const el=labelEls[i];if(!el)return;
    const q=p.clone().add(new T.Vector3(0,1.45,0)).project(camera);
    el.style.left=Math.max(60,Math.min(r.width-60,(q.x*.5+.5)*r.width))+'px';
    el.style.top=Math.max(72,Math.min(r.height-36,(-q.y*.5+.5)*r.height))+'px';
    el.style.opacity=q.z>1?'0':'1';
  });
}

function wireInteraction(){
  pauseBtn?.addEventListener('click',()=>{paused=!paused;pauseBtn.textContent=paused?'RESUME':'PAUSE';setJourneyStatus(selected,paused?'PAUSED':'RUNNING')});
  replayBtn?.addEventListener('click',resetJourney);
  nextBtn?.addEventListener('click',()=>{const next=Math.min(projects.length-1,selected+1);if(next===selected)resetJourney();else selectStop(next,true)});

  stage.addEventListener('pointerdown',e=>{dragging=true;moved=0;startX=e.clientX;startY=e.clientY;startTheta=targetTheta;startPhi=targetPhi;lastInteraction=performance.now();try{stage.setPointerCapture?.(e.pointerId)}catch(_){}});
  stage.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));targetTheta=startTheta-dx*(low?.0044:.0057);targetPhi=Math.max(.43,Math.min(1.30,startPhi+dy*(low?.0033:.0045)))});
  const release=e=>{dragging=false;try{stage.releasePointerCapture?.(e.pointerId)}catch(_){}};
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  stage.addEventListener('wheel',e=>{if(mobile())return;targetRadius=Math.max(13.5,Math.min(24,targetRadius+Math.sign(e.deltaY)*.75));lastInteraction=performance.now();e.preventDefault()},{passive:false});

  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  stage.addEventListener('click',e=>{
    if(moved>9)return;const r=stage.getBoundingClientRect();
    pointer.set(((e.clientX-r.left)/r.width)*2-1,-(((e.clientY-r.top)/r.height)*2-1));raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(stationMeshes,false)[0];if(hit)selectStop(hit.object.userData.index,true);
  });
}

function animate(now){
  requestAnimationFrame(animate);
  if(!stageVisible||!pageVisible){lastFrame=now;return}
  const minFrame=1000/(low?38:60);if(now-lastFrame<minFrame)return;
  const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;

  try{
    if(!dragging&&!mobile()&&now-lastInteraction>6000)targetTheta+=.00042;
    theta+=(targetTheta-theta)*.072;phi+=(targetPhi-phi)*.072;radius+=(targetRadius-radius)*.072;updateCamera();

    if(!paused){
      if(endHold>0){endHold-=dt;if(endHold<=0)resetJourney()}
      else if(dwell>0)dwell-=dt;
      else if(segment<projects.length-1){
        progress+=dt/(low?3.3:2.9);
        const local=Math.min(1,progress),u=(segment+local)/(projects.length-1),f=orientObjectToTrack(vehicle,u);
        vehicle.position.copy(f.point).addScaledVector(f.up,.18);
        if(local>=1){
          segment++;progress=0;selectStop(segment,false);dwell=segment===projects.length-1?1.8:.9;if(segment===projects.length-1)endHold=3.0;
        }else setJourneyStatus(segment+1,'CLIMBING TO');
      }
    }

    if(mixer)mixer.update(dt);
    routeRings.forEach((ring,i)=>ring.rotation.z+=(i%2?1:-1)*(low?.0024:.004));
    if(vehicle.userData.headlight)vehicle.userData.headlight.intensity=(low?.75:1.4)+Math.sin(now*.009)*.16;
    if(vehicle.userData.underglow)vehicle.userData.underglow.intensity=(low?.36:.70)+Math.sin(now*.006)*.10;
    const motes=world.getObjectByName('worldMotes');if(motes)motes.rotation.y+=low?.00010:.00020;
    placeLabels();renderer.render(scene,camera);

    if(!firstFrame){
      firstFrame=true;stage.classList.remove('three-error');stage.classList.add('three-live');canvas.style.opacity='1';setJourneyStatus(selected,'COASTER WORLD ONLINE');
    }
  }catch(error){
    console.error('[RI 3D] Render loop failed; restoring static project map.',error);
    stage.classList.remove('three-live');stage.classList.add('three-error');setStatus('3D RENDER INTERRUPTED · STATIC MAP ACTIVE');paused=true;
  }
}

try{
  setStatus('STARTING COLLISION-SAFE COASTER WORLD');
  bootCore();wireInteraction();
  if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize,{passive:true});
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{stageVisible=!!entries[0]&&entries[0].isIntersecting;lastFrame=performance.now()},{rootMargin:'180px 0px',threshold:.01}).observe(stage);
  document.addEventListener('visibilitychange',()=>{pageVisible=!document.hidden;lastFrame=performance.now()});
  requestAnimationFrame(animate);
}catch(error){
  console.error('[RI 3D] Core initialization failed.',error);
  stage.classList.remove('three-live');stage.classList.add('three-error');setStatus('3D CORE ERROR · STATIC MAP ACTIVE');
}
})();