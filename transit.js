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

let renderer,scene,camera,world,curve,vehicle,routeRings=[],stationMeshes=[],labelEls=[],mixer=null;
let selected=0,segment=0,progress=0,paused=reduced,dwell=1.1,endHold=0;
let theta=.52,phi=.96,radius=low?20.8:18.5,targetTheta=theta,targetPhi=phi,targetRadius=radius;
let dragging=false,startX=0,startY=0,startTheta=0,startPhi=0,moved=0;
let stageVisible=true,pageVisible=!document.hidden,lastFrame=performance.now(),firstFrame=false;
let lastInteraction=performance.now();

function safe(name,fn){
  try{return fn()}
  catch(error){console.warn('[RI 3D] Optional layer failed:',name,error);return null}
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

  const railMat=new T.MeshStandardMaterial({
    color:0x68736b,metalness:.83,roughness:.26,
    emissive:0x07140b,emissiveIntensity:.18
  });
  const railGlow=new T.MeshBasicMaterial({color:GREEN,transparent:true,opacity:.26,depthWrite:false});
  const spineMat=new T.MeshStandardMaterial({color:0x2b302c,metalness:.60,roughness:.42});
  const sleeperMat=new T.MeshStandardMaterial({color:0x3b3024,metalness:.18,roughness:.75});
  const supportMat=new T.MeshStandardMaterial({color:0x303632,metalness:.72,roughness:.34});

  const railRadius=low?.045:.055;
  const leftRail=new T.Mesh(new T.TubeGeometry(leftCurve,segments,railRadius,8,false),railMat);
  const rightRail=new T.Mesh(new T.TubeGeometry(rightCurve,segments,railRadius,8,false),railMat);
  leftRail.castShadow=rightRail.castShadow=renderer.shadowMap.enabled;
  world.add(leftRail,rightRail);

  const spine=new T.Mesh(new T.TubeGeometry(curve,segments,.035,7,false),spineMat);
  spine.castShadow=renderer.shadowMap.enabled;
  world.add(spine);

  const glow=new T.Mesh(new T.TubeGeometry(curve,segments,.012,5,false),railGlow);
  world.add(glow);

  const sleeperGeo=new T.BoxGeometry(1.34,.075,.13);
  const sleeperCount=low?31:47;
  for(let i=0;i<sleeperCount;i++){
    const u=.01+(i/(sleeperCount-1))*.98;
    const f=trackFrame(u);
    const sleeper=new T.Mesh(sleeperGeo,sleeperMat);
    sleeper.position.copy(f.point).addScaledVector(f.up,-.09);
    const m=new T.Matrix4().makeBasis(f.side,f.up,f.tangent);
    sleeper.quaternion.setFromRotationMatrix(m);
    sleeper.castShadow=renderer.shadowMap.enabled;
    sleeper.receiveShadow=renderer.shadowMap.enabled;
    world.add(sleeper);
  }

  const supportCount=low?11:17;
  const columnGeo=new T.CylinderGeometry(.055,.075,1,8);
  const beamGeo=new T.BoxGeometry(1.18,.09,.11);
  for(let i=0;i<supportCount;i++){
    const u=.035+(i/(supportCount-1))*.93;
    const f=trackFrame(u);
    const horizontalSide=new T.Vector3(f.side.x,0,f.side.z).normalize();
    const topY=f.point.y-.18;
    const height=Math.max(.7,topY-groundY);
    [-1,1].forEach(sign=>{
      const column=new T.Mesh(columnGeo,supportMat);
      column.scale.y=height;
      column.position.set(
        f.point.x+horizontalSide.x*.43*sign,
        groundY+height*.5,
        f.point.z+horizontalSide.z*.43*sign
      );
      column.castShadow=renderer.shadowMap.enabled;
      column.receiveShadow=renderer.shadowMap.enabled;
      world.add(column);
    });

    const beam=new T.Mesh(beamGeo,supportMat);
    beam.position.set(f.point.x,topY,f.point.z);
    const flatSide=horizontalSide.lengthSq()>.1?horizontalSide:new T.Vector3(1,0,0);
    const flatForward=new T.Vector3(-flatSide.z,0,flatSide.x).normalize();
    const m=new T.Matrix4().makeBasis(flatSide,worldUp,flatForward);
    beam.quaternion.setFromRotationMatrix(m);
    beam.castShadow=renderer.shadowMap.enabled;
    world.add(beam);

    if(!low&&i%3===0){
      const braceMat=supportMat;
      const braceLen=Math.max(.7,height*.55);
      [-1,1].forEach(sign=>{
        const brace=new T.Mesh(new T.CylinderGeometry(.026,.026,braceLen,6),braceMat);
        brace.position.set(
          f.point.x+horizontalSide.x*.22*sign,
          groundY+height*.42,
          f.point.z+horizontalSide.z*.22*sign
        );
        brace.rotation.z=sign*.52;
        brace.castShadow=true;
        world.add(brace);
      });
    }
  }
}

function addStationLighting(point,accent,index){
  if(low&&index%2===1)return;
  const spot=new T.SpotLight(accent,low?1.15:2.2,10.5,.72,.52,1.35);
  spot.position.copy(point).add(new T.Vector3(index%2?1.5:-1.5,3.4,1.2));
  spot.target.position.copy(point);
  scene.add(spot,spot.target);
  if(renderer.shadowMap.enabled&&!low&&index%2===0){
    spot.castShadow=true;
    spot.shadow.mapSize.set(512,512);
    spot.shadow.bias=-.0005;
  }
}

function bootCore(){
  renderer=new T.WebGLRenderer({
    canvas,
    alpha:false,
    antialias:!low,
    powerPreference:low?'default':'high-performance',
    preserveDrawingBuffer:false
  });
  renderer.setClearColor(0x07100a,1);
  if('outputColorSpace'in renderer&&T.SRGBColorSpace)renderer.outputColorSpace=T.SRGBColorSpace;
  if(T.ACESFilmicToneMapping!==undefined){
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
  }
  renderer.shadowMap.enabled=!low;
  if(renderer.shadowMap.enabled&&T.PCFSoftShadowMap!==undefined)renderer.shadowMap.type=T.PCFSoftShadowMap;

  scene=new T.Scene();
  scene.background=new T.Color(0x07100a);
  scene.fog=new T.FogExp2(0x07100a,low?.034:.026);

  camera=new T.PerspectiveCamera(44,1,.1,140);
  world=new T.Group();
  scene.add(world);

  scene.add(new T.AmbientLight(0x233027,low?.23:.30));
  scene.add(new T.HemisphereLight(0xcfffe0,0x10140f,low?1.08:1.30));

  const sun=new T.DirectionalLight(0xffecd0,low?1.55:2.35);
  sun.position.set(-7.5,14,9);
  if(renderer.shadowMap.enabled){
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.near=.5;
    sun.shadow.camera.far=45;
    sun.shadow.camera.left=-15;
    sun.shadow.camera.right=15;
    sun.shadow.camera.top=14;
    sun.shadow.camera.bottom=-14;
    sun.shadow.bias=-.00055;
  }
  scene.add(sun);

  const moonFill=new T.DirectionalLight(0x87a6ff,low?.22:.42);
  moonFill.position.set(8,7,-10);
  scene.add(moonFill);

  const pink=new T.PointLight(PINK,low?.48:1.0,24,2);
  pink.position.set(-7,4,5);
  scene.add(pink);

  const green=new T.PointLight(GREEN,low?.45:.95,25,2);
  green.position.set(7,5,-5);
  scene.add(green);

  const sky=new T.Mesh(
    new T.SphereGeometry(70,low?16:28,low?9:16),
    new T.ShaderMaterial({
      side:T.BackSide,
      depthWrite:false,
      uniforms:{
        top:{value:new T.Color(0x17261b)},
        horizon:{value:new T.Color(0x122016)},
        bottom:{value:new T.Color(0x020503)}
      },
      vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(horizon,top,smoothstep(.0,.75,h));c=mix(bottom,c,smoothstep(-.45,.05,h));gl_FragColor=vec4(c,1.0);}'
    })
  );
  scene.add(sky);

  const ground=new T.Mesh(
    new T.PlaneGeometry(42,30),
    new T.MeshStandardMaterial({color:0x182317,roughness:.98,metalness:0,emissive:0x071008,emissiveIntensity:.12})
  );
  ground.rotation.x=-Math.PI/2;
  ground.position.y=groundY;
  ground.receiveShadow=renderer.shadowMap.enabled;
  world.add(ground);

  const grid=new T.GridHelper(36,36,0x23482d,0x162019);
  grid.position.y=groundY+.012;
  grid.material.transparent=true;
  grid.material.opacity=.18;
  world.add(grid);

  curve=new T.CatmullRomCurve3(stops,false,'catmullrom',.19);
  addCoasterTrack();

  if(labelsRoot)labelsRoot.innerHTML='';

  stops.forEach((p,i)=>{
    const accent=[YELLOW,PINK,GREEN][i%3];
    const hub=new T.Group();
    hub.position.copy(p);
    world.add(hub);

    const platform=new T.Mesh(
      new T.CylinderGeometry(.72,.84,.20,28),
      new T.MeshStandardMaterial({color:0x171b17,roughness:.58,metalness:.34})
    );
    platform.position.y=-.23;
    platform.castShadow=renderer.shadowMap.enabled;
    platform.receiveShadow=renderer.shadowMap.enabled;
    hub.add(platform);

    const ring=new T.Mesh(
      new T.TorusGeometry(.80,.040,8,48),
      new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.92})
    );
    ring.rotation.x=Math.PI/2;
    ring.position.y=-.10;
    hub.add(ring);
    routeRings.push(ring);

    const core=new T.Mesh(
      new T.CylinderGeometry(.22,.22,.17,24),
      new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.42,roughness:.30,metalness:.24})
    );
    core.userData.index=i;
    core.position.y=-.02;
    hub.add(core);
    stationMeshes.push(core);

    const canopy=new T.Mesh(
      new T.BoxGeometry(1.52,.085,.75),
      new T.MeshStandardMaterial({color:0x242a25,roughness:.42,metalness:.50})
    );
    canopy.position.set(0,1.22,-.36);
    canopy.castShadow=renderer.shadowMap.enabled;
    hub.add(canopy);

    const poleMat=new T.MeshStandardMaterial({color:0x3a413b,roughness:.38,metalness:.72});
    [-.55,.55].forEach(x=>{
      const pole=new T.Mesh(new T.CylinderGeometry(.025,.033,1.32,8),poleMat);
      pole.position.set(x,.57,-.36);
      pole.castShadow=renderer.shadowMap.enabled;
      hub.add(pole);
    });

    addStationLighting(p,accent,i);

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

  const fallbackCar=new T.Group();
  fallbackCar.name='proceduralVehicle';
  const bodyMat=new T.MeshStandardMaterial({color:PINK,emissive:0x260219,emissiveIntensity:.28,metalness:.42,roughness:.25});
  const body=new T.Mesh(new T.BoxGeometry(1.20,.42,.62),bodyMat);
  body.position.y=.27;
  body.castShadow=renderer.shadowMap.enabled;
  fallbackCar.add(body);
  const seatMat=new T.MeshStandardMaterial({color:YELLOW,emissive:0x302600,emissiveIntensity:.16,metalness:.24,roughness:.32});
  [-.24,.18].forEach(x=>{
    const seat=new T.Mesh(new T.BoxGeometry(.26,.32,.50),seatMat);
    seat.position.set(x,.55,0);
    fallbackCar.add(seat);
  });
  const wheelMat=new T.MeshStandardMaterial({color:0x070807,roughness:.95});
  [[-.36,.08,.34],[.36,.08,.34],[-.36,.08,-.34],[.36,.08,-.34]].forEach(v=>{
    const wheel=new T.Mesh(new T.CylinderGeometry(.12,.12,.08,16),wheelMat);
    wheel.rotation.x=Math.PI/2;
    wheel.position.set(v[0],v[1],v[2]);
    fallbackCar.add(wheel);
  });
  vehicle.add(fallbackCar);

  const headlight=new T.PointLight(YELLOW,low?.8:1.6,4,2);
  headlight.position.set(.70,.34,.16);
  vehicle.add(headlight);
  const underglow=new T.PointLight(PINK,low?.45:.9,3.5,2);
  underglow.position.set(0,-.03,0);
  vehicle.add(underglow);
  vehicle.userData.headlight=headlight;
  vehicle.userData.underglow=underglow;
  vehicle.userData.fallback=fallbackCar;

  addBackgroundEnvironment();
  loadRoadAssets();
  loadNatureAssets();
  loadCityAssets();
  loadRealAssets();
  addPracticalLights();

  resize();
  resetJourney();
  updateCamera();
}

function addBackgroundEnvironment(){
  safe('background environment',()=>{
    let seed=9137;
    const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
    const buildingCount=low?5:10;
    const mats=[
      new T.MeshStandardMaterial({color:0x171c18,roughness:.86,metalness:.08,emissive:0x061009,emissiveIntensity:.18}),
      new T.MeshStandardMaterial({color:0x1a151a,roughness:.83,metalness:.08,emissive:0x120811,emissiveIntensity:.19})
    ];
    for(let i=0;i<buildingCount;i++){
      let x=(rand()-.5)*30,z=(rand()-.5)*21;
      if(Math.abs(x)<8.5&&Math.abs(z)<5.5){i--;continue}
      const h=1+rand()*4.2,w=.65+rand()*1.2,d=.65+rand()*1.2;
      const b=new T.Mesh(new T.BoxGeometry(w,h,d),mats[i%2]);
      b.position.set(x,groundY+h*.5,z);
      b.rotation.y=(rand()-.5)*.35;
      b.receiveShadow=renderer.shadowMap.enabled;
      world.add(b);
    }

    const count=low?22:58;
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      positions[i*3]=(rand()-.5)*25;
      positions[i*3+1]=groundY+.8+rand()*8;
      positions[i*3+2]=(rand()-.5)*18;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(positions,3));
    const points=new T.Points(geo,new T.PointsMaterial({color:0x8fffb2,size:low?.024:.034,transparent:true,opacity:.22,depthWrite:false}));
    points.name='worldMotes';
    world.add(points);
  });
}

function addPracticalLights(){
  const lamps=[
    [-6.8,groundY+1.55,-5.4],
    [-2.2,groundY+1.55,-5.4],
    [2.4,groundY+1.55,-5.4],
    [6.7,groundY+1.55,-5.4]
  ];
  lamps.slice(0,low?2:4).forEach((p,i)=>{
    const light=new T.PointLight(i%2?WARM:YELLOW,low?.55:1.15,5.5,2);
    light.position.set(p[0],p[1],p[2]);
    scene.add(light);
  });
}

function loadRoadAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('real road assets',()=>{
    const Loader=window.RI_GLTFLoader;
    const loader=new Loader();
    const base='assets/citybits/';

    const prep=root=>{
      root.updateMatrixWorld(true);
      const box=new T.Box3().setFromObject(root);
      root.position.y-=box.min.y;
      root.traverse(n=>{
        if(n.isMesh){
          n.castShadow=false;
          n.receiveShadow=renderer.shadowMap.enabled;
          const mats=Array.isArray(n.material)?n.material:[n.material];
          mats.filter(Boolean).forEach(m=>{if('roughness'in m)m.roughness=Math.max(.55,m.roughness||.55);});
        }
      });
      return root;
    };

    const addTile=(template,x,z,rot=0,scale=1.30)=>{
      const c=template.clone(true);
      c.position.set(x,groundY+.012,z);
      c.rotation.y=rot;
      c.scale.multiplyScalar(scale);
      world.add(c);
    };

    const horizontal=[-5.2,-2.6,0,2.6,5.2];
    loader.load(base+'road_straight.gltf',gltf=>{
      safe('road straight placement',()=>{
        const t=prep(gltf.scene);
        horizontal.forEach(x=>addTile(t,x,-6.0,Math.PI/2,1.30));
        [-3.4,-.8,1.8,4.4].slice(0,low?2:4).forEach(z=>addTile(t,-7.8,z,0,1.30));
      });
    },undefined,e=>console.warn('[RI 3D] road_straight skipped',e));

    loader.load(base+'road_junction.gltf',gltf=>{
      safe('road junction placement',()=>addTile(prep(gltf.scene),-7.8,-6.0,0,1.30));
    },undefined,e=>console.warn('[RI 3D] road_junction skipped',e));

    loader.load(base+'road_corner_curved.gltf',gltf=>{
      safe('road curve placement',()=>{
        const t=prep(gltf.scene);
        addTile(t,7.8,-6.0,Math.PI/2,1.30);
        if(!low)addTile(t,-7.8,6.2,Math.PI,1.30);
      });
    },undefined,e=>console.warn('[RI 3D] road_corner skipped',e));
  });
}

function loadNatureAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('real forest assets',()=>{
    const Loader=window.RI_GLTFLoader;
    const loader=new Loader();
    loader.load('assets/nature/forest.glb',gltf=>{
      safe('forest placement',()=>{
        const sources={};
        gltf.scene.traverse(n=>{if(n.name&&n.isMesh)sources[n.name]=n;});
        let seed=67231;
        const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};

        const scatter=(names,total,targetHeight,opts={})=>{
          const usable=names.map(n=>sources[n]).filter(Boolean);
          if(!usable.length||total<=0)return;
          const per=Math.ceil(total/usable.length);
          usable.forEach((src,variant)=>{
            const count=Math.max(0,Math.min(per,total-variant*per));
            if(!count)return;
            src.geometry.computeBoundingBox();
            const box=src.geometry.boundingBox;
            const height=Math.max(.001,box.max.y-box.min.y);
            const inst=new T.InstancedMesh(src.geometry,src.material,count);
            const dummy=new T.Object3D();
            for(let i=0;i<count;i++){
              let x,z,tries=0;
              do{
                x=(rand()-.5)*(opts.width||24);
                z=(rand()-.5)*(opts.depth||16);
                tries++;
              }while(tries<18&&opts.edgeOnly&&Math.abs(x)<6.2&&Math.abs(z)<3.8);
              const scale=(targetHeight/height)*((opts.scaleMin||.8)+rand()*((opts.scaleMax||1.2)-(opts.scaleMin||.8)));
              dummy.position.set(x,groundY-box.min.y*scale+(opts.y||0),z);
              dummy.scale.setScalar(scale);
              dummy.rotation.y=rand()*Math.PI*2;
              dummy.updateMatrix();
              inst.setMatrixAt(i,dummy.matrix);
            }
            inst.instanceMatrix.needsUpdate=true;
            inst.castShadow=!!opts.shadows&&renderer.shadowMap.enabled;
            inst.receiveShadow=renderer.shadowMap.enabled;
            world.add(inst);
          });
        };

        scatter(['Grass_2_D_Color1'],low?22:62,.28,{width:25,depth:17,scaleMin:.7,scaleMax:1.35,shadows:false});
        scatter(['Tree_1_A_Color1','Tree_1_C_Color1','Tree_3_A_Color1','Tree_3_C_Color1','Tree_4_A_Color1','Tree_4_C_Color1'],low?8:22,2.25,{width:25,depth:17,scaleMin:.75,scaleMax:1.25,edgeOnly:true,shadows:!low});
        scatter(['Bush_1_E_Color1','Bush_3_B_Color1'],low?5:13,.72,{width:24,depth:16,scaleMin:.75,scaleMax:1.3,edgeOnly:true,shadows:!low});
        scatter(['Rock_1_D_Color1','Rock_1_J_Color1','Rock_2_C_Color1','Rock_2_G_Color1','Rock_3_E_Color1','Rock_3_L_Color1','Rock_3_Q_Color1'],low?4:12,.62,{width:24,depth:16,scaleMin:.65,scaleMax:1.25,edgeOnly:true,shadows:!low});
        stage.dataset.natureAssets='ready';
        setJourneyStatus(selected,'FOREST + GRASS ASSETS ONLINE');
      });
    },undefined,e=>console.warn('[RI 3D] forest asset skipped',e));
  });
}

function loadCityAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('asset-backed city environment',()=>{
    const Loader=window.RI_GLTFLoader;
    const loader=new Loader();
    const base='assets/citybits/';

    const prepare=(root,height)=>{
      root.updateMatrixWorld(true);
      let box=new T.Box3().setFromObject(root);
      const size=box.getSize(new T.Vector3());
      const s=height/Math.max(.001,size.y);
      root.scale.multiplyScalar(s);
      root.updateMatrixWorld(true);
      box=new T.Box3().setFromObject(root);
      const center=box.getCenter(new T.Vector3());
      root.position.x-=center.x;
      root.position.z-=center.z;
      root.position.y-=box.min.y;
      root.updateMatrixWorld(true);
      root.traverse(n=>{
        if(n.isMesh){
          n.castShadow=renderer.shadowMap.enabled;
          n.receiveShadow=renderer.shadowMap.enabled;
          const materials=Array.isArray(n.material)?n.material:[n.material];
          materials.filter(Boolean).forEach(m=>{
            if('roughness'in m)m.roughness=Math.max(.38,m.roughness||.5);
            if('metalness'in m)m.metalness=Math.min(.35,m.metalness||0);
          });
        }
      });
      return root;
    };

    const addClone=(template,p)=>{
      const clone=template.clone(true);
      clone.position.set(p[0],groundY+(p[4]||0),p[1]);
      clone.rotation.y=p[2]||0;
      clone.scale.multiplyScalar(p[3]||1);
      world.add(clone);
      return clone;
    };

    const specs=[
      {file:'building_A.gltf',height:3.5,places:low?[[-7.6,-4.4,.18,.92]]:[[-7.8,-4.4,.18,.95],[7.7,-4.6,-.28,.90]]},
      {file:'building_B.gltf',height:3.15,places:low?[[7.5,4.6,.38,.92]]:[[-8.0,4.6,-.46,.92],[7.6,4.7,.40,.95]]},
      {file:'building_C.gltf',height:3.85,places:low?[]:[[-3.9,7.1,.24,.86],[3.8,7.1,-.26,.84]]},
      {file:'streetlight.gltf',height:1.55,places:low?[[-5.7,-4.9,.25,1],[-1.5,-4.9,-.2,1],[3.0,-4.9,.16,1]]:[[-6.2,-4.9,.2,1],[-4.0,-4.9,-.1,1],[-1.7,-4.9,.1,1],[.8,-4.9,-.2,1],[3.1,-4.9,.18,1],[5.5,-4.9,-.16,1]]},
      {file:'bench.gltf',height:.42,places:low?[[-5.1,3.3,.35,1],[4.1,3.2,-.55,1]]:[[-5.2,3.4,.35,1],[-1.8,4.0,-.18,1],[2.5,3.8,.12,1],[4.7,3.0,-.55,1]]},
      {file:'bush.gltf',height:.50,places:low?[[-6.6,4.8,0,1],[6.2,4.2,0,1]]:[[-7.0,5.0,0,1],[-5.9,5.5,0,.8],[-1.0,6.2,0,1.1],[1.2,6.0,0,.9],[5.5,5.0,0,1],[6.7,4.3,0,.85]]},
      {file:'trafficlight_A.gltf',height:1.55,places:[[-5.4,-6.0,.2,1],[5.4,-6.0,-.3,1]]},
      {file:'firehydrant.gltf',height:.32,places:low?[]:[[-5.8,-4.3,0,1],[2.9,-4.2,0,1],[5.8,-4.1,0,1]]},
      {file:'dumpster.gltf',height:.58,places:low?[]:[[-7.0,-3.4,.35,1],[6.6,5.1,-.4,1]]},
      {file:'watertower.gltf',height:2.8,places:low?[]:[[8.5,-7.4,-.15,1]]},
      {file:'car_taxi.gltf',height:.62,places:low?[]:[[-4.8,-6.1,Math.PI/2,1],[3.9,-6.1,Math.PI/2,1]]}
    ];

    let loaded=0,requested=0;
    specs.forEach(spec=>{
      if(!spec.places.length)return;
      requested++;
      loader.load(base+spec.file,gltf=>{
        safe('city asset '+spec.file,()=>{
          const template=prepare(gltf.scene,spec.height);
          spec.places.forEach(p=>addClone(template,p));
          loaded++;
          stage.dataset.cityAssets=String(loaded);
          if(loaded===requested)setJourneyStatus(selected,'CITY PROPS ONLINE');
        });
      },undefined,error=>console.warn('[RI 3D] City asset skipped:',spec.file,error));
    });
  });
}

function loadRealAssets(){
  if(!window.RI_GLTFLoader)return;
  safe('GLB vehicle loader',()=>{
    const Loader=window.RI_GLTFLoader;
    const gltfLoader=new Loader();
    gltfLoader.load('assets/cesium-milk-truck.glb',gltf=>{
      safe('GLB vehicle placement',()=>{
        const model=gltf.scene;
        const box=new T.Box3().setFromObject(model);
        const size=box.getSize(new T.Vector3());
        const center=box.getCenter(new T.Vector3());
        const scale=1.55/(Math.max(size.x,size.y,size.z)||1);
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y=.28;
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
        setJourneyStatus(selected,'REAL GLB RIDE VEHICLE ONLINE');
      });
    },undefined,error=>console.warn('[RI 3D] GLB vehicle unavailable; procedural ride car remains active.',error));

    if(!low){
      gltfLoader.load('3d_character_young_boy.glb',gltf=>{
        safe('character placement',()=>{
          const model=gltf.scene;
          const box=new T.Box3().setFromObject(model);
          const size=box.getSize(new T.Vector3());
          const center=box.getCenter(new T.Vector3());
          const scale=1.40/(Math.max(size.x,size.y,size.z)||1);
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
      },undefined,error=>console.warn('[RI 3D] Character asset skipped.',error));
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
  const link=p.repo?'<a href="'+p.repo+'" target="_blank" rel="noopener">REPO ↗</a>':'<a href="#'+p.target+'">VIEW ↓</a>';
  mobileCard.innerHTML='<span class="tm-index">'+String(i+1).padStart(2,'0')+'</span><span class="tm-copy"><b>'+p.name+'</b><span>'+p.year+' · COASTER STOP</span></span>'+link;
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
    dwell=.75;
    const u=selected/(projects.length-1);
    const f=orientObjectToTrack(vehicle,u);
    vehicle.position.copy(f.point).addScaledVector(f.up,.18);
  }
}

function resetJourney(){
  selected=0;
  segment=0;
  progress=0;
  dwell=1.0;
  endHold=0;
  paused=reduced;
  const f=orientObjectToTrack(vehicle,0);
  vehicle.position.copy(f.point).addScaledVector(f.up,.18);
  selectStop(0,false);
  if(pauseBtn)pauseBtn.textContent=paused?'RESUME':'PAUSE';
}

function updateCamera(){
  camera.position.set(
    Math.sin(theta)*Math.sin(phi)*radius,
    Math.cos(phi)*radius+1.8,
    Math.cos(theta)*Math.sin(phi)*radius
  );
  camera.lookAt(0,.45,0);
}

function resize(){
  const r=stage.getBoundingClientRect();
  const width=Math.max(320,r.width||stage.clientWidth||900);
  const height=Math.max(mobile()?480:560,r.height||stage.clientHeight||650);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1:1.38));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
  targetRadius=low?20.8:Math.max(13.5,Math.min(targetRadius,21.5));
}

function placeLabels(){
  if(mobile())return;
  const r=stage.getBoundingClientRect();
  stops.forEach((p,i)=>{
    const el=labelEls[i];
    if(!el)return;
    const q=p.clone().add(new T.Vector3(0,1.45,0)).project(camera);
    el.style.left=Math.max(60,Math.min(r.width-60,(q.x*.5+.5)*r.width))+'px';
    el.style.top=Math.max(72,Math.min(r.height-36,(-q.y*.5+.5)*r.height))+'px';
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
    if(next===selected)resetJourney();else selectStop(next,true);
  });

  stage.addEventListener('pointerdown',e=>{
    dragging=true;moved=0;startX=e.clientX;startY=e.clientY;startTheta=targetTheta;startPhi=targetPhi;lastInteraction=performance.now();
    try{stage.setPointerCapture?.(e.pointerId)}catch(_){}
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));
    targetTheta=startTheta-dx*(low?.0044:.0057);
    targetPhi=Math.max(.43,Math.min(1.30,startPhi+dy*(low?.0033:.0045)));
  });
  const release=e=>{
    dragging=false;
    try{stage.releasePointerCapture?.(e.pointerId)}catch(_){}
  };
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);

  stage.addEventListener('wheel',e=>{
    if(mobile())return;
    targetRadius=Math.max(13.2,Math.min(24,targetRadius+Math.sign(e.deltaY)*.75));
    lastInteraction=performance.now();
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

  const targetFPS=low?38:60;
  const minFrame=1000/targetFPS;
  if(now-lastFrame<minFrame)return;
  const dt=Math.min((now-lastFrame)/1000,.05);
  lastFrame=now;

  try{
    if(!dragging&&!mobile()&&now-lastInteraction>6000)targetTheta+=.00045;
    theta+=(targetTheta-theta)*.072;
    phi+=(targetPhi-phi)*.072;
    radius+=(targetRadius-radius)*.072;
    updateCamera();

    if(!paused){
      if(endHold>0){
        endHold-=dt;
        if(endHold<=0)resetJourney();
      }else if(dwell>0){
        dwell-=dt;
      }else if(segment<projects.length-1){
        progress+=dt/(low?3.3:2.9);
        const local=Math.min(1,progress);
        const u=(segment+local)/(projects.length-1);
        const f=orientObjectToTrack(vehicle,u);
        vehicle.position.copy(f.point).addScaledVector(f.up,.18);

        if(local>=1){
          segment++;
          progress=0;
          selectStop(segment,false);
          dwell=segment===projects.length-1?1.8:.9;
          if(segment===projects.length-1)endHold=3.0;
        }else{
          setJourneyStatus(segment+1,'CLIMBING TO');
        }
      }
    }

    if(mixer)mixer.update(dt);
    routeRings.forEach((ring,i)=>ring.rotation.z+=(i%2?1:-1)*(low?.0024:.004));
    if(vehicle.userData.headlight)vehicle.userData.headlight.intensity=(low?.8:1.5)+Math.sin(now*.009)*.18;
    if(vehicle.userData.underglow)vehicle.userData.underglow.intensity=(low?.42:.82)+Math.sin(now*.006)*.12;
    const motes=world.getObjectByName('worldMotes');
    if(motes)motes.rotation.y+=low?.00010:.00022;

    placeLabels();
    renderer.render(scene,camera);

    if(!firstFrame){
      firstFrame=true;
      stage.classList.remove('three-error');
      stage.classList.add('three-live');
      canvas.style.opacity='1';
      setJourneyStatus(selected,'COASTER WORLD ONLINE');
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
  setStatus('STARTING LOCAL COASTER WORLD');
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