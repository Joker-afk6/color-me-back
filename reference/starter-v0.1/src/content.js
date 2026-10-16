export const COLORS = Object.freeze({red:'#EF4444',blue:'#3B82F6',yellow:'#FACC15',purple:'#A855F7',orange:'#F97316',green:'#22C55E'});
export const MIXES = Object.freeze([
 {a:'red',b:'blue',result:'purple',name:'Portal Hop',key:'1',description:'Teleport to the nearest violet portal'},
 {a:'red',b:'yellow',result:'orange',name:'Super Bounce',key:'2',description:'Launch upward from orange bounce pads'},
 {a:'blue',b:'yellow',result:'green',name:'Vine Grow',key:'3',description:'Create a temporary climbable vine platform'}
]);
export const CHAPTERS = Object.freeze([
 {id:'village',label:'Prologue · Hush Hollow',primary:null,goal:2,objective:'Activate 2 Wonderbrush stars; then enter the Ruby Orchard.',lines:{entry:['Pip','The world has gone gray! Find the glowing stars. Press E near each one.'],complete:['Pip','Brilliant! Ruby the Dragon is waiting through that archway.']}},
 {id:'red',label:'Chapter 1 · The Ruby Orchard',primary:'red',guardian:'Ruby the Rumble Dragon',goal:3,objective:'Break 3 ruby spell crystals with your Wonderbrush.',lines:{entry:['Ruby','Oh! These crystals make my wings feel heavy. Please help!'],complete:['Ruby','My red is back! Look at the berries and flowers!']}},
 {id:'blue',label:'Chapter 2 · Whisperwave Bay',primary:'blue',guardian:'Bloop the Ocean Octopus',goal:3,objective:'Release 3 enchanted bubbles and rescue Bloop.',lines:{entry:['Bloop','Bloooop! These bubbles are keeping my waves asleep!'],complete:['Bloop','Splish! You brought my beautiful blue waves back!']}},
 {id:'yellow',label:'Chapter 3 · Sunflower Skylands',primary:'yellow',guardian:'Sol the Sleepy Sun',goal:3,objective:'Turn 3 light mirrors toward the sleepy sun.',lines:{entry:['Pip','Sol is asleep! Wake the sun with three shining mirrors.'],complete:['Sol','Aaaah... what a lovely, bright morning!']}},
 {id:'prism',label:'Chapter 4 · Prism Palace',primary:null,goal:6,objective:'Illuminate all 6 prism stations to help the Fade make a rainbow.',lines:{entry:['The Fade','I turned everything gray because I was scared to paint badly.'],complete:['Pip','All the colors are together! You helped the Fade be brave.']}},
]);
export const INTRO=[
 ['Narrator','One morning, a young explorer woke up and discovered the world had lost its colors.'],
 ['Pip','Hello! I am Pip, the Wonderbrush! Can you help me bring them back?'],
 ['Pip','Move with W A S D or arrow keys, jump with Space, and press E to use your brush.']
];
export const ENDING=[
 ['The Fade','What if my picture is not perfect?'],
 ['Explorer','It does not have to be perfect. It just has to be yours.'],
 ['The Fade','Then I will try!'],
 ['Narrator','Together they painted a sky full of colors, and Hush Hollow was never quite so gray again.'],
 ['Pip','You did it! You found your colors!'],
 ['Explorer','We made them together.']
];
export const STORAGE_KEY='color-me-back-demo-v1';
