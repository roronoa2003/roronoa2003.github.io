(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
  const reveal=$$('.reveal-block');
  if(reduced){reveal.forEach(el=>el.classList.add('in-view'));}
  else{
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');io.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    reveal.forEach(el=>io.observe(el));
  }

  const typed=new WeakSet();
  function runType(el){
    if(!el||typed.has(el)||reduced)return;typed.add(el);
    const text=el.dataset.typeScroll||el.textContent.trim(); if(!text)return;
    el.textContent='';el.classList.add('type-cursor');let i=0;
    const speed=Math.max(18,Math.min(34,720/text.length));
    const tick=()=>{el.textContent=text.slice(0,++i);if(i<text.length)setTimeout(tick,speed);else setTimeout(()=>el.classList.remove('type-cursor'),260)};tick();
  }
  const tio=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){runType(e.target);tio.unobserve(e.target)}}),{threshold:.55});
  $$('[data-type-scroll]').forEach(el=>{if(reduced)el.textContent=el.dataset.typeScroll||el.textContent;else tio.observe(el)});

  const synth=window.speechSynthesis;
  document.getElementById('speakIntro')?.addEventListener('click',()=>{
    if(!synth)return; synth.cancel();
    const u=new SpeechSynthesisUtterance('Rohan Iyer. Master of Computer Science student at UIUC, focused on applied AI, agentic systems, retrieval augmented generation, multi-agent systems, and AI security.');
    const voices=synth.getVoices();u.voice=voices.find(v=>/David|Mark|Daniel|Alex|Male/i.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;u.rate=.82;u.pitch=.55;synth.speak(u);
  });

  const canvas=document.getElementById('ambientCanvas');
  if(canvas && window.THREE && !reduced){
    try{
      const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1,.1,50);camera.position.z=8;
      const count=innerWidth<780?90:220,geo=new THREE.BufferGeometry(),pos=new Float32Array(count*3),col=new Float32Array(count*3),colors=[new THREE.Color(0x54f58a),new THREE.Color(0xff5ac8),new THREE.Color(0xffe36e)];
      for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*20;pos[i*3+1]=(Math.random()-.5)*14;pos[i*3+2]=(Math.random()-.5)*10-3;const c=colors[i%3];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
      const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.22}));scene.add(pts);
      const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()};resize();addEventListener('resize',resize,{passive:true});
      (function loop(){pts.rotation.y+=.00018;pts.rotation.x+=.00004;renderer.render(scene,camera);requestAnimationFrame(loop)})();
    }catch(e){}
  }
})();
