import * as THREE from 'three';
import {COLORS,MIXES,CHAPTERS,INTRO,ENDING,STORAGE_KEY} from './content.js';
import {createWorld} from './worlds.js';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class ColorAdventure{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight);
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b0b3bb');this.scene.fog=new THREE.Fog('#b0b3bb',35,95);
  this.camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.1,200);
  this.clock=new THREE.Clock();this.time=0;this.state='menu';this.levelId='village';
  this.input=new Set();this.pointerControls=new Set();this.vy=0;this.grounded=true;this.dashCooldown=0;this.gliding=false;
  this.restored=[];this.sigils=[];this.gender='girl';this.world=null;this.player=null;this.pip=null;this.dialogue=[];this.currentMix=null;
  this.setLights();this.bindInput();this.restoreSave();
 }
 setLights(){
  this.scene.add(new THREE.HemisphereLight('#eef6ff','#50635c',2.1));
  const light=new THREE.DirectionalLight('#fff5da',2.7);light.position.set(-15,30,12);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-45;light.shadow.camera.right=45;light.shadow.camera.top=45;light.shadow.camera.bottom=-45;this.scene.add(light);
 }
 bindInput(){
  addEventListener('keydown',ev=>{
   const key=ev.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))ev.preventDefault();
   if((this.state==='dialogue')&&(key==='enter'||key===' ')){this.nextLine();return;}
   if(this.state!=='playing')return;
   if(key==='e'&&!ev.repeat)this.interact();
   if(key==='f'&&!ev.repeat&&this.restored.includes('yellow'))this.showToast('Sunbeam shines! Follow the glowing crystals ✨');
   if(key==='1'&&!ev.repeat)this.useSecondary('purple');
   if(key==='2'&&!ev.repeat)this.useSecondary('orange');
   if(key==='3'&&!ev.repeat)this.useSecondary('green');
   if(key==='m'&&!ev.repeat)this.showMixer();
   if(key==='h'&&!ev.repeat)this.showHelp();
   this.input.add(key);
  });
  addEventListener('keyup',ev=>this.input.delete(ev.key.toLowerCase()));
  addEventListener('blur',()=>{this.input.clear();this.pointerControls.clear();});
  addEventListener('resize',()=>{this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();});
  $('next-dialogue').addEventListener('click',()=>this.nextLine());
  $('help-btn').addEventListener('click',()=>this.showHelp());
  for(const control of document.querySelectorAll('[data-act]')){
   const act=control.dataset.act;
   const down=ev=>{ev.preventDefault(); if(act==='interact')this.interact();else this.pointerControls.add(act);};
   const up=ev=>{ev.preventDefault();this.pointerControls.delete(act)};
   control.addEventListener('pointerdown',down);control.addEventListener('pointerup',up);control.addEventListener('pointercancel',up);control.addEventListener('pointerleave',up);
  }
 }
 boot(){this.showMenu();this.animate();}
 restoreSave(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved&&CHAPTERS.some(c=>c.id===saved.levelId)){
   this.levelId=saved.levelId;this.gender=saved.gender==='boy'?'boy':'girl';this.restored=Array.isArray(saved.restored)?saved.restored.filter(x=>Object.keys(COLORS).includes(x)):[];
   this.sigils=Array.isArray(saved.sigils)?saved.sigils.filter(x=>typeof x==='string'):[];
  }}catch(err){console.warn('Saved game could not be loaded.',err)}}
 save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({levelId:this.levelId,gender:this.gender,restored:this.restored,sigils:this.sigils}))}catch(err){console.warn('Save unavailable:',err)}}
 showMenu(){this.state='menu';$('hud').classList.add('hidden');$('controls').classList.add('hidden');this.modal(`<div class="brand">🎨 ✨ 🌈</div><h1>COLOR ME BACK!</h1><p>A magical adventure where <b>you</b> bring the colors home.</p><div class="actions"><button id="btn-play">${this.sigils.length||this.restored.length?'Continue Adventure':'Start Adventure'}</button><button id="btn-new">New Game</button></div><p class="hint">Explore • Solve puzzles • Rescue colorful friends • Learn color mixing</p>`);
 $('btn-play').onclick=()=>this.chooseHero(false);$('btn-new').onclick=()=>this.chooseHero(true);
 }
 chooseHero(reset){this.resetRequested=reset;this.state='menu';this.modal(`<h2>Choose your Explorer</h2><p>Both explorers have exactly the same adventures and powers.</p><div class="actions hero-choices"><button class="choice" id="girl-choice"><img src="/assets/characters/girl.png" alt="Girl Explorer character reference"/><strong>Girl Explorer</strong></button><button class="choice" id="boy-choice"><img src="/assets/characters/boy.png" alt="Boy Explorer character reference"/><strong>Boy Explorer</strong></button></div><p class="hint">Both heroes are equally strong and adventurous.</p>`);
 $('girl-choice').onclick=()=>this.begin('girl');$('boy-choice').onclick=()=>this.begin('boy');}
 begin(gender){
  this.gender=gender;if(this.resetRequested){this.levelId='village';this.restored=[];this.sigils=[];}this.resetRequested=false;this.save();
  this.makePlayer();this.loadLevel(this.levelId);this.closeModal();
  if(this.levelId==='village'&&!this.sigils.length)this.talk(INTRO);else this.talk([['Pip',`Welcome back, explorer! Let's continue in ${CHAPTERS.find(c=>c.id===this.levelId).label}.`]]);
 }
 makePlayer(){if(this.player)this.scene.remove(this.player);if(this.pip)this.scene.remove(this.pip);
  this.player=new THREE.Group();const gray=new THREE.MeshStandardMaterial({color:'#9daab5',roughness:.8});
  const make=(geo,mat,x,y,z,parent=this.player)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o};
  const skin=new THREE.MeshStandardMaterial({color:'#c19b82'}),hair=new THREE.MeshStandardMaterial({color:'#302b32'}),shoe=new THREE.MeshStandardMaterial({color:'#e5e7ee'});
  const body=make(new THREE.CapsuleGeometry(.6,1.3,5,12),gray,0,1.55,0);body.scale.set(1,1,.78);this.body=body;
  const face=make(new THREE.SphereGeometry(.7,22,16),skin,0,3.05,0);face.scale.set(1,.96,.86);
  if(this.gender==='girl'){
   const back=make(new THREE.SphereGeometry(.77,18,16),hair,0,3.35,-.22);back.scale.set(1,1.35,.65);
   const fringe=make(new THREE.SphereGeometry(.72,18,14),hair,0,3.62,.04);fringe.scale.set(1,.35,.86);
  }else{
   const cap=make(new THREE.SphereGeometry(.77,18,14),hair,0,3.58,0);cap.scale.set(1,.35,.86);
  }
  for(const x of [-.36,.36]){
   make(new THREE.SphereGeometry(.09,10,10),new THREE.MeshStandardMaterial({color:'#222b3e'}),x,3.1,.60);
   make(new THREE.CapsuleGeometry(.18,.65,4,10),gray,x,0.58,0).rotation.z=x>0?-.08:.08;
   make(new THREE.BoxGeometry(.42,.25,.75),shoe,x,.12,.2);
  }
  this.brush=make(new THREE.CylinderGeometry(.09,.09,1.3,9),new THREE.MeshStandardMaterial({color:'#c3a67d'}),.85,1.38,.2);this.brush.rotation.z=-.6;
  make(new THREE.ConeGeometry(.25,.55,8),new THREE.MeshStandardMaterial({color:'#f6cf7c',emissive:'#725c20',emissiveIntensity:.25}),1.18,1.87,.2).rotation.z=-.6;
  this.player.position.set(0,0,20);this.scene.add(this.player);
  this.pip=new THREE.Group();const orb=new THREE.Mesh(new THREE.SphereGeometry(.4,18,18),new THREE.MeshStandardMaterial({color:'#ffeaaa',emissive:'#e7a94a',emissiveIntensity:.75}));this.pip.add(orb);
  for(const x of [-.14,.14]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.05),new THREE.MeshStandardMaterial({color:'#202b4c'}));eye.position.set(x,.06,.37);this.pip.add(eye)}
  const wing=new THREE.Mesh(new THREE.TorusGeometry(.6,.06,7,22),new THREE.MeshBasicMaterial({color:'#fbf6ff'}));wing.rotation.y=.5;this.pip.add(wing);this.scene.add(this.pip);
 }
 loadLevel(id){
  if(this.world)this.scene.remove(this.world.root);
  this.levelId=id;this.world=createWorld(id,this.restored,this.sigils);this.scene.add(this.world.root);
  if(this.player){this.player.position.set(0,0,20);this.player.visible=true;this.vy=0;this.grounded=true;}
  const fogColor=this.restored.length>=3||id==='prism'?'#c6e3ff':'#afb5ba';this.scene.background=new THREE.Color(fogColor);this.scene.fog.color.set(fogColor);
  this.updateHud();this.save();
 }
 updateHud(){if(!this.world)return;const data=this.world.level;
  $('level-name').textContent=data.label;
  const done=this.sigils.filter(x=>x.startsWith(this.levelId+'-')).length;
  $('objective').textContent=done>=data.goal?(this.levelId==='prism'?'All prism stations lit!':'Find the exit arch at the far end of the path.'):`${data.objective} (${done}/${data.goal})`;
  $('palette-progress').innerHTML=Object.entries(COLORS).map(([name,hex])=>`<span class="swatch ${this.restored.includes(name)?'':'locked'}" style="${this.restored.includes(name)?`background:${hex};`:''}" title="${name}">${this.restored.includes(name)?'✓':'◌'} ${name}</span>`).join('');
  const powers=[];
  if(this.restored.includes('red'))powers.push('Shift: Dash');if(this.restored.includes('blue'))powers.push('G: Glide');if(this.restored.includes('yellow'))powers.push('F: Sunbeam');
  if(this.restored.includes('purple'))powers.push('1: Portal');if(this.restored.includes('orange'))powers.push('2: Bounce');if(this.restored.includes('green'))powers.push('3: Grow Vine');
  $('ability-hint').textContent='WASD/Arrows move • Space jump • E interact • M mix'+(powers.length?' • '+powers.join(' • '):'');
 }
 interact(){if(this.state!=='playing'||!this.player||!this.world)return;
  const near=this.world.interables.filter(x=>distance(x,this.player.position)<3.5).sort((a,b)=>distance(a,this.player.position)-distance(b,this.player.position))[0];
  if(!near){this.showToast('Move closer to a glowing crystal or the archway.');return;}
  if(near.exit){const c=this.world.level,done=this.sigils.filter(x=>x.startsWith(this.levelId+'-')).length;
   if(done<c.goal){this.showToast(`Find ${c.goal-done} more glowing stars first!`);return;}
   const i=CHAPTERS.findIndex(x=>x.id===this.levelId);this.loadLevel(CHAPTERS[Math.min(i+1,CHAPTERS.length-1)].id);
   this.talk([CHAPTERS[Math.min(i+1,CHAPTERS.length-1)].lines.entry]);return;
  }
  if(near.active){this.showToast('This crystal is already free! ✨');return;}
  this.sigils.push(near.id);near.active=true;near.object.material.color.set('#ffe792');near.object.material.emissive.set('#f8d34e');near.sigil.scale.set(1.15,1.15,1.15);
  this.playChime();this.save();this.updateHud();
  const c=this.world.level,done=this.sigils.filter(x=>x.startsWith(this.levelId+'-')).length;
  if(done<c.goal){this.showToast(`${done} of ${c.goal} magical seals released!`);return;}
  if(c.id==='village'){this.talk([c.lines.complete]);return;}
  if(c.id==='prism'){this.finishGame();return;}
  this.restorePrimary(c.primary);
 }
 restorePrimary(color){
  if(!this.restored.includes(color))this.restored.push(color);
  for(const item of this.world.paintables){if(item.color===color||item.color==='green'&&color==='yellow')item.mesh.material.color.set(COLORS[item.color]||COLORS[color]);}
  this.world.guardian.traverse(obj=>{if(obj.isMesh&&obj.material&&obj.material.color&&obj.material.color.getHexString()==='99a0aa')obj.material.color.set(COLORS[color]);});
  const previous=this.scene.background.clone();this.scene.background.set(color==='red'?'#f8d6d2':color==='blue'?'#c3e8fc':'#fff0c2');this.scene.fog.color.copy(this.scene.background);
  this.playChime();this.updateHud();this.save();
  const lines=[this.world.level.lines.complete,['Pip',`${color.toUpperCase()} has returned! You have unlocked a new magic power. Let's mix some colors too!`]];
  this.talk(lines,()=>this.showMixer());
 }
 showMixer(){if(this.state==='dialogue')return;this.state='modal';
  const prim=['red','blue','yellow'].filter(x=>this.restored.includes(x));
  const unlocked=this.restored.filter(c=>['purple','orange','green'].includes(c));
  const available=MIXES.filter(m=>prim.includes(m.a)&&prim.includes(m.b));
  this.modal(`<h2>🎨 The Wonderbrush Palette</h2><p>When two primary paint colors meet, they make a brand-new color and power!</p>
    <div class="palette-grid">${prim.map(p=>`<div><span class="color-dot" style="background:${COLORS[p]}"></span><br/><b>${p.toUpperCase()}</b></div>`).join('')}</div>
    ${available.length?'<p><b>Choose a combination:</b></p>':'<p>Rescue another Color Guardian to unlock paint mixing.</p>'}
    <div class="actions">${available.map((m,i)=>`<button data-mix="${i}">${m.a.toUpperCase()} + ${m.b.toUpperCase()}</button>`).join('')}</div>
    <div class="mix-result" id="mix-result">${unlocked.length?`Powers discovered: ${unlocked.join(', ')}`:'Mix your first two colors!'}</div>
    <button id="close-mixer">Back to Adventure</button>`);
  document.querySelectorAll('[data-mix]').forEach(btn=>btn.onclick=()=>this.performMix(available[Number(btn.dataset.mix)]));
  $('close-mixer').onclick=()=>{this.closeModal();this.state='playing';};
 }
 performMix(m){if(!m)return;
  if(!this.restored.includes(m.result)){this.restored.push(m.result);this.save();this.updateHud();this.playChime();}
  $('mix-result').innerHTML=`<span class="color-dot" style="background:${COLORS[m.a]}"></span> + <span class="color-dot" style="background:${COLORS[m.b]}"></span> = <span class="color-dot" style="background:${COLORS[m.result]}"></span><br/><b>${m.result.toUpperCase()} unlocked!</b><br/>${m.name} (${m.key}): ${m.description}`;
 }
 useSecondary(color){if(!this.restored.includes(color))return;
  if(color==='purple'){
   const portals=this.world.portals||[];if(portals.length<2){this.showToast('Search for purple portals in this chapter!');return;}
   const closest=portals.slice().sort((a,b)=>distance(a,this.player.position)-distance(b,this.player.position))[0];
   if(distance(closest,this.player.position)>5){this.showToast('Stand beside a purple portal to hop!');return;}
   const dest=portals.find(p=>p!==closest);this.player.position.set(dest.x,0,dest.z+2);this.showToast('Purple Portal Hop! ✨');
  } else if(color==='orange'){
   const pad=this.world.pads.find(p=>p.type==='bounce');if(!pad||distance(pad,this.player.position)>5){this.showToast('Find the orange launch pad!');return;}
   this.vy=14;this.grounded=false;this.showToast('Orange Super Bounce!');
  }else if(color==='green'){
   const pad=this.world.pads.find(p=>p.type==='vine');if(!pad||distance(pad,this.player.position)>5){this.showToast('Find the green vine!');return;}
   this.player.position.y=5;this.vy=4;this.showToast('Green Vine Grow!');
  }
 }
 showHelp(){this.state='modal';this.modal(`<h2>How to Play</h2><p><span class="control-key">W A S D</span> or <span class="control-key">Arrow Keys</span> Move</p><p><span class="control-key">Space</span> Jump &nbsp; <span class="control-key">E</span> Use Wonderbrush</p><p><span class="control-key">M</span> Mix Colors &nbsp; <span class="control-key">H</span> Help</p><p><span class="control-key">Shift</span> Dash (red) &nbsp; <span class="control-key">G</span> Glide (blue) &nbsp; <span class="control-key">F</span> Sunbeam (yellow)</p><p><span class="control-key">1</span> Purple Portal &nbsp; <span class="control-key">2</span> Orange Bounce &nbsp; <span class="control-key">3</span> Green Vines</p><p>Find all the shining crystals, then walk to the archway to advance. No lives are lost!</p><button id="help-close">Let's Play!</button>`);$('help-close').onclick=()=>{this.closeModal();this.state='playing';};}
 talk(lines,after){this.dialogue=lines.map(l=>[...l]);this.afterDialogue=after;this.state='dialogue';$('dialogue').classList.remove('hidden');this.nextLine();}
 nextLine(){if(!this.dialogue.length){$('dialogue').classList.add('hidden');this.state='playing';const after=this.afterDialogue;this.afterDialogue=null;if(after)after();return;}
  const [speaker,line]=this.dialogue.shift();$('speaker').textContent=speaker;$('dialogue-text').textContent=line;
 }
 finishGame(){this.talk(ENDING,()=>{this.state='modal';this.modal(`<h1>🌈 All Colors Found!</h1><h2>You painted a brighter world!</h2><p>Every color belongs, including white, black and gray.</p><p>Explore again and discover the things you missed. Thank you for playing!</p><div class="actions"><button id="finish-replay">Play Again</button><button id="finish-palette">My Colors</button></div>`);$('finish-replay').onclick=()=>this.chooseHero(true);$('finish-palette').onclick=()=>this.showMixer();});}
 modal(html){$('modal-panel').innerHTML=html;$('modal').classList.remove('hidden');}
 closeModal(){$('modal').classList.add('hidden');$('hud').classList.remove('hidden');$('controls').classList.remove('hidden');}
 showToast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');this.toastDeadline=this.time+2.8;}
 playChime(){try{const ctx=this.soundContext??(this.soundContext=new (window.AudioContext||window.webkitAudioContext)());for(const [i,f] of [523.25,659.25,783.99].entries()){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,ctx.currentTime+i*.08);g.gain.exponentialRampToValueAtTime(.065,ctx.currentTime+i*.08+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+i*.08+.25);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+i*.08);o.stop(ctx.currentTime+i*.08+.27);}}catch(err){/* Browser audio is optional. */}}
 move(dt){if(this.state!=='playing'||!this.player)return;
  let dx=0,dz=0;const has=(...keys)=>keys.some(k=>this.input.has(k)||this.pointerControls.has(k));
  if(has('a','arrowleft','left'))dx-=1;if(has('d','arrowright','right'))dx+=1;
  if(has('w','arrowup','up'))dz-=1;if(has('s','arrowdown','down'))dz+=1;
  const norm=Math.hypot(dx,dz)||1;dx/=norm;dz/=norm;
  const dashing=this.restored.includes('red')&&has('shift')&&this.dashCooldown<=0&&(dx!==0||dz!==0);
  const speed=dashing?19:8;
  if(dashing){this.dashCooldown=1.0;this.showToast('Crimson Dash!');}
  const p=this.player.position;
  p.x=clamp(p.x+dx*speed*dt,-36,36);p.z=clamp(p.z+dz*speed*dt,-29,28);
  if(dx||dz){this.player.rotation.y=Math.atan2(-dx,-dz);}
  if(has(' ','jump')&&this.grounded){this.vy=10;this.grounded=false;}
  this.gliding=has('g')&&this.restored.includes('blue')&&this.vy<0;
  const gravity=this.gliding?7:25;
  this.vy-=gravity*dt;
  if(this.gliding)this.vy=Math.max(this.vy,-2.8);
  p.y+=this.vy*dt;
  if(p.y<=0){p.y=0;this.vy=0;this.grounded=true;}
  // Gameplay is intentionally forgiving: the walkable main route has no bottomless pit.
  this.dashCooldown=Math.max(0,this.dashCooldown-dt);
  const near=this.world.interables.filter(x=>distance(x,p)<3.5).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  let txt='';if(near){const isComplete=this.sigils.filter(x=>x.startsWith(this.levelId+'-')).length>=this.world.level.goal;
   txt=near.exit?(isComplete?'Press E to enter next chapter':'Archway locked: free all magical seals'):(near.active?'Magical seal released ✓':`Press E: ${near.label}`);
  }
  $('interact-hint').textContent=txt;
 }
 animate(){requestAnimationFrame(()=>this.animate());const dt=Math.min(this.clock.getDelta(),.045);this.time+=dt;
  this.move(dt);
  if(this.player){this.pip.position.set(this.player.position.x+1.3,this.player.position.y+2.7+Math.sin(this.time*3)*.18,this.player.position.z+.4);
   const camTarget=new THREE.Vector3(this.player.position.x,this.player.position.y+2.5,this.player.position.z);
   const desired=camTarget.clone().add(new THREE.Vector3(0,10,16));this.camera.position.lerp(desired,clamp(dt*3.0,0,1));this.camera.lookAt(camTarget);
  }else{this.camera.position.set(0,19,39);this.camera.lookAt(0,2,0);}
  if(this.world){for(const o of this.world.interables){if(o.object&&o.object.rotation){o.object.rotation.y+=dt*.8;if(!o.active)o.object.position.y=2.2+Math.sin(this.time*2+o.x)*.22;}}
    if(this.world.guardian)this.world.guardian.rotation.y=Math.sin(this.time*.65)*.09;
  }
  if(this.toastDeadline&&this.time>this.toastDeadline){$('toast').classList.add('hidden');this.toastDeadline=0;}
  this.renderer.render(this.scene,this.camera);
 }
}
