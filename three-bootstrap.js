(async function(){
  'use strict';
  const status=document.getElementById('transitStatus');
  const stage=document.getElementById('projectTransitStage');
  const setState=(text)=>{if(status)status.textContent=text;};
  setState('LOADING 3D ENGINE');

  const moduleSources=[
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.166.1/three.module.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js',
    'https://unpkg.com/three@0.166.1/build/three.module.js?module',
    'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'
  ];

  let THREE=null,lastError=null;
  for(const source of moduleSources){
    try{
      THREE=await import(source);
      if(THREE && THREE.WebGLRenderer)break;
    }catch(error){
      lastError=error;
      console.warn('[RI 3D] Three.js source failed:',source,error);
    }
  }

  if(!THREE){
    setState('3D ENGINE LOAD FAILED');
    stage?.classList.add('three-error');
    console.error('[RI 3D] Unable to load Three.js from all configured sources.',lastError);
    await import('./app.js?v=20260918b').catch(()=>{});
    return;
  }

  window.THREE=THREE;
  document.documentElement.dataset.three='ready';
  setState('3D ENGINE READY');

  try{
    await import('./transit.js?v=20260918b');
  }catch(error){
    setState('3D SCENE ERROR');
    stage?.classList.add('three-error');
    console.error('[RI 3D] Transit module failed:',error);
  }

  try{
    await import('./app.js?v=20260918b');
  }catch(error){
    console.error('[RI] Portfolio interaction module failed:',error);
  }
})();