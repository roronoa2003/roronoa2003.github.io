(async function(){
  'use strict';
  const status=document.getElementById('transitStatus');
  const stage=document.getElementById('projectTransitStage');
  const setState=text=>{if(status)status.textContent=text;};
  setState('LOADING 3D ENGINE');

  const threeSources=[
    'https://esm.sh/three@0.166.1',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.166.1/three.module.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js',
    'https://unpkg.com/three@0.166.1/build/three.module.js?module'
  ];

  let THREE=null,lastError=null;
  for(const source of threeSources){
    try{
      const mod=await import(source);
      if(mod&&mod.WebGLRenderer){THREE=mod;break;}
    }catch(error){lastError=error;console.warn('[RI 3D] Three.js source failed:',source,error);}
  }

  if(!THREE){
    setState('3D ENGINE LOAD FAILED');
    stage?.classList.add('three-error');
    console.error('[RI 3D] All Three.js sources failed.',lastError);
    await import('./app.js?v=20260918d').catch(()=>{});
    return;
  }

  window.THREE=THREE;
  document.documentElement.dataset.three='ready';
  setState('LOADING 3D ASSET PIPELINE');

  const loaderSources=[
    'https://esm.sh/three@0.166.1/examples/jsm/loaders/GLTFLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/GLTFLoader.js/+esm'
  ];
  window.RI_GLTFLoader=null;
  for(const source of loaderSources){
    try{
      const mod=await import(source);
      if(mod&&mod.GLTFLoader){window.RI_GLTFLoader=mod.GLTFLoader;break;}
    }catch(error){console.warn('[RI 3D] GLTFLoader source failed:',source,error);}
  }

  setState(window.RI_GLTFLoader?'3D ASSET PIPELINE READY':'3D ENGINE READY · ASSET FALLBACK');
  try{await import('./transit.js?v=20260918d');}
  catch(error){setState('3D SCENE ERROR');stage?.classList.add('three-error');console.error('[RI 3D] World module failed:',error);}
  try{await import('./app.js?v=20260918d');}
  catch(error){console.error('[RI] Portfolio interaction module failed:',error);}
})();