import {KEYMAP,clamp} from './data.js';
import {stick} from './combat.js';
const BUTTONS={attack:2,jump:0,special:3,dodge:1,guard:4,revive:5};
export class Controls{
 constructor(){this.keys=new Set();this.keyEdges=new Set();this.touch=new Set();this.touchEdges=new Set();this.previousPads=[];}
 keyDown(code){if(!this.keys.has(code))this.keyEdges.add(code);this.keys.add(code);}
 keyUp(code){this.keys.delete(code);}
 setTouch(action,down){if(down){if(!this.touch.has(action))this.touchEdges.add(action);this.touch.add(action);}else this.touch.delete(action);}
 clear(){this.keys.clear();this.keyEdges.clear();this.touch.clear();this.touchEdges.clear();this.previousPads=[];}
 sample(count,pads=[],{single=false}={}){
  if(single){count=1;pads=[Array.from(pads).find(p=>p&&p.connected!==false)];}
  const result=[];
  for(let i=0;i<count;i++){
   const map=KEYMAP[i],pad=pads[i]?.connected===false?null:pads[i],pressed=b=>!!pad?.buttons[b]?.pressed;
   const aliases=single?{up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',attack:'Space'}:{};
   const held=action=>this.keys.has(map[action])||this.keys.has(aliases[action])||(i===0&&this.touch.has(action));
   const edge=action=>this.keyEdges.has(map[action])||this.keyEdges.has(aliases[action])||(i===0&&this.touchEdges.has(action));
   const keyboardX=Number(held('right'))-Number(held('left')),keyboardY=Number(held('down'))-Number(held('up'));
   let analog=pad?stick(pad.axes?.[0],pad.axes?.[1]):{x:0,y:0};
   const dpadX=Number(pressed(15))-Number(pressed(14)),dpadY=Number(pressed(13))-Number(pressed(12));
   if([12,13,14,15].some(pressed))analog={x:dpadX,y:dpadY};
   let x=clamp(keyboardX+analog.x,-1,1),y=clamp(keyboardY+analog.y,-1,1),length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
   const input={moveX:x,moveY:y,left:x<0,right:x>0,up:y<0,down:y>0};const padState={};
   for(const [action,button]of Object.entries(BUTTONS)){const padHeld=pressed(button);padState[action]=padHeld;input[action]=held(action)||padHeld;input[action+'Pressed']=edge(action)||(padHeld&&!this.previousPads[i]?.[action]);}
   // A down/up pair between two simulation frames must still register exactly once.
   input.attackHeld=input.attack;if(input.attackPressed)input.attack=true;
   this.previousPads[i]=padState;result.push(input);
  }
  this.keyEdges.clear();this.touchEdges.clear();this.previousPads.length=count;return result;
 }
}
