import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const status=document.getElementById('transitStatus');
const stage=document.getElementById('projectTransitStage');
const setState=text=>{if(status)status.textContent=text;};

try{
  setState('3D ENGINE READY · LOCAL RUNTIME');
  window.THREE=THREE;
  window.RI_GLTFLoader=GLTFLoader;
  document.documentElement.dataset.three='local';
  await import('./transit.js?v=20260918i');
}catch(error){
  setState('3D WORLD FAILED · STATIC MAP ACTIVE');
  stage?.classList.add('three-error');
  console.error('[RI 3D] Local world boot failed',error);
}
try{
  await import('./app.js?v=20260918i');
}catch(error){
  console.error('[RI] Portfolio interactions failed',error);
}
