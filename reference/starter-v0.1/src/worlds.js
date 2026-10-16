import * as THREE from 'three';
import {CHAPTERS,COLORS} from './content.js';
const mkMat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.75,metalness:0});
const gray='#99a0aa';
const floorGray='#a1a9ae';
const geometry={sphere:new THREE.SphereGeometry(1,22,16),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,14)};
const box=(w,h,d,c)=>{const mesh=new THREE.Mesh(geometry.box,mkMat(c));mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;return mesh};
const orb=(radius,c)=>{const m=new THREE.Mesh(geometry.sphere,mkMat(c));m.scale.setScalar(radius);m.castShadow=true;return m};
const cylinder=(r1,r2,h,c)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),mkMat(c));m.castShadow=true;return m};
const place=(parent,obj,x,y,z)=>{obj.position.set(x,y,z);parent.add(obj);return obj};
export function createWorld(id,restored,seenSigils){
 const root=new THREE.Group(); const level=CHAPTERS.find(c=>c.id===id);const color = level.primary||'purple';
 const environment={red:'#D98C98',blue:'#77B2CE',yellow:'#F4DA86',prism:'#B5A6D8',village:'#B4BEC9'};
 const skyReady=(id==='prism'||id==='village'&&restored.length>0||level.primary&&restored.includes(level.primary));
 const sceneryTone=skyReady?environment[id]:gray;
 const ground=place(root,box(76,1.5,60,skyReady?'#6D9E85':floorGray),0,-.75,0);
 const colliders=[{x:0,z:0,w:76,d:60,y:0}];
 const paintables=[];const interables=[];const portals=[];const pads=[];
 const addDecor=(obj,colorName)=>{paintables.push({mesh:obj,color:colorName||color});return obj};
 // Tall tree-shaped obstacles and decorative foliage across the level.
 for(let i=0;i<18;i++){
  const angle=i*(Math.PI*2/18), x=27*Math.cos(angle),z=20*Math.sin(angle);
  const trunk=place(root,cylinder(.6,.9,3,'#8B8783'),x,1.5,z);
  const leaf=place(root,orb(2.6,restored.includes(color)?COLORS[color]:gray),x,4.2,z);
  addDecor(leaf,color);
 }
 // Main route leads from starting point (0,0,18) toward the magical guardian at (0,0,-19).
 for(let i=0;i<5;i++){
  const z=12-i*7;
  const stone=place(root,box(7,.3,4,restored.includes(color)?'#FAF6E8':'#e0e2e5'),0,.12,z);
  addDecor(stone,'yellow');
 }
 // Scenery includes plants, a winding path, portal stones and landmarks.
 for(let i=0;i<11;i++){
  const x=i%2===0?-12:12; const z=18-i*3.6;
  const bloom=place(root,orb(.75,restored.includes(color)?COLORS[color]:gray),x,1,z);
  addDecor(bloom,color);
  const stalk=place(root,cylinder(.10,.12,1.4,'#647a6b'),x,.3,z);addDecor(stalk,'green');
 }
 // Distinctive guardian sculptures made from original procedural geometry.
 const guardian=new THREE.Group();guardian.position.set(0,.6,-22);
 if(id==='red'){
  const body=place(guardian,orb(3,restored.includes('red')?COLORS.red:gray),0,3,0);body.scale.set(1.25,.85,.83);addDecor(body,'red');
  for(const x of [-1.2,1.2]){place(guardian,orb(.43,'white'),x,3.4,2.2);place(guardian,orb(.18,'#27354c'),x,3.4,2.58);}
  for(const x of [-3,3]){const wing=place(guardian,orb(1.9,restored.includes('red')?'#F5A07D':gray),x,3.2,-.8);wing.scale.set(1,.3,1.3);addDecor(wing,'red');}
  for(const x of [-1,1]){place(guardian,cylinder(.4,.6,1.7,restored.includes('red')?'#f0af89':gray),x,6,0);}
 }else if(id==='blue'){
  const head=place(guardian,orb(2.7,restored.includes('blue')?COLORS.blue:gray),0,3,0);addDecor(head,'blue');
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const limb=place(guardian,cylinder(.32,.45,4.0,restored.includes('blue')?'#5ca7df':gray),3.4*Math.cos(a),1.3,3.4*Math.sin(a));limb.rotation.z=-Math.cos(a)*.5;addDecor(limb,'blue');}
  for(const x of [-.9,.9]){place(guardian,orb(.4,'white'),x,3.4,2.32);place(guardian,orb(.16,'#1c324c'),x,3.4,2.67);}
 }else if(id==='yellow'){
  const sun=place(guardian,orb(3,restored.includes('yellow')?COLORS.yellow:gray),0,4,0);addDecor(sun,'yellow');
  for(let i=0;i<12;i++){const a=i*Math.PI/6; const beam=place(guardian,box(1.1,2.1,.7,restored.includes('yellow')?'#F5D64A':gray),Math.cos(a)*4,4+Math.sin(a)*4,0);beam.rotation.z=-a;addDecor(beam,'yellow');}
  for(const x of [-1,1]){place(guardian,orb(.26,'#555'),x,4.3,2.78);}
 }else if(id==='prism'){
  const prism=place(guardian,new THREE.Mesh(new THREE.OctahedronGeometry(4),mkMat('#d7d6e2')),0,5,0);prism.castShadow=true;addDecor(prism,'purple');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;place(guardian,orb(.8,['red','blue','yellow','purple','orange','green'].includes(['red','blue','yellow','purple','orange','green'][i])?COLORS[['red','blue','yellow','purple','orange','green'][i]]:gray),Math.cos(a)*8,3,Math.sin(a)*8);}
 }else{
  place(guardian,box(7,5,5,'#b8b8c0'),0,2.5,0);
  const roof=place(guardian,new THREE.Mesh(new THREE.ConeGeometry(5,3,4),mkMat('#889097')),0,6.5,0);roof.rotation.y=Math.PI/4;
 }
 root.add(guardian);
 let n=level.goal;
 for(let i=0;i<n;i++){
  const a=((i+.4)/n)*Math.PI*2;
  let x=Math.sin(a)*9, z=-2-Math.cos(a)*12;
  // Prism 6 stations have unique stable coordinates.
  if(id==='prism'){x=Math.sin(a)*12;z=-4-Math.cos(a)*12;}
  const sigil=new THREE.Group();sigil.position.set(x,.7,z);
  const pedestal=place(sigil,cylinder(1.05,1.2,1.1,'#e8e7de'),0,.4,0);
  const isActive=seenSigils.includes(`${id}-${i}`);
  const sigilColor=id==='prism'?['red','blue','yellow','purple','orange','green'][i]:color;
  const gem=place(sigil,new THREE.Mesh(new THREE.OctahedronGeometry(1.1),mkMat(isActive?COLORS[sigilColor]:'#e9eaf3')),0,2.2,0);
  gem.rotation.y=.3;gem.material.emissive=new THREE.Color(isActive?COLORS[sigilColor]:'#fff2a1');gem.material.emissiveIntensity=.2;
  root.add(sigil);
  interables.push({id:`${id}-${i}`,x,z,object:gem,sigil,active:isActive,label:id==='yellow'?'Rotate light mirror':id==='blue'?'Open magical bubble':id==='red'?'Free ruby spell crystal':id==='prism'?'Light prism color': 'Awaken Wonderbrush star'});
 }
 // Optional advanced ability interaction stations for replayability.
 if(restored.includes('red')&&id!=='village'){
  const dash=place(root,box(3,.14,3,COLORS.red),-20,.10,4);pads.push({x:-20,z:4,type:'dash'});
 }
 if(restored.includes('orange')){
  const bounce=place(root,cylinder(1.9,1.9,.5,COLORS.orange),17,.3,3);
  pads.push({x:17,z:3,type:'bounce'});
 }
 if(restored.includes('purple')){
  for(const x of [-20,20]){
   const portal=place(root,new THREE.Mesh(new THREE.TorusGeometry(2.1,.3,12,30),mkMat(COLORS.purple)),x,2,-10);
   portals.push({x,z:-10});
  }
 }
 if(restored.includes('green')){
  const vine=place(root,cylinder(.3,.3,5,COLORS.green),-18,2.5,-14);pads.push({x:-18,z:-14,type:'vine'});
 }
 // Exit arch is visible only once all objectives in this chapter have been completed.
 if(id!=='prism'){
  const exit=new THREE.Group(); exit.position.set(0,0,-28);
  const left=place(exit,box(1,6,1,'#d3e4ea'),-3,3,0),right=place(exit,box(1,6,1,'#d3e4ea'),3,3,0),top=place(exit,box(7,1,1,'#d3e4ea'),0,6.5,0);
  root.add(exit);
  interables.push({id:'exit',x:0,z:-28,exit:true,label:'Travel to the next chapter'});
 }
 return {root,colliders,paintables,interables,pads,portals,guardian,level,sceneryTone};
}
