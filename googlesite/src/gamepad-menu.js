const FOCUSABLE='button:not(:disabled), select:not(:disabled), input:not(:disabled)';
const BACK={lobby:'#backTitle',paused:'#resume',settings:'#settingsBack',help:'#helpBack',stageclear:'#clearTitle',gameover:'#resultTitle',victory:'#resultTitle'};
const START={title:'#newGame',lobby:'#begin',paused:'#resume',stageclear:'#nextStage'};

function direction(pad){
 const pressed=index=>!!pad.buttons[index]?.pressed;
 const horizontal=Number(pressed(15))-Number(pressed(14));
 const vertical=Number(pressed(13))-Number(pressed(12));
 if(horizontal||vertical)return horizontal?(horizontal<0?'left':'right'):(vertical<0?'up':'down');
 const [x=0,y=0]=pad.axes||[];
 if(Math.max(Math.abs(x),Math.abs(y))<.55)return null;
 if(Math.abs(x)>Math.abs(y))return x<0?'left':'right';
 return y<0?'up':'down';
}

function editable(element){
 return element.matches('select,input[type="range"]');
}

function adjust(element,step){
 const old=element.value;
 if(element instanceof HTMLSelectElement){
  const options=[...element.options].filter(option=>!option.disabled);
  const index=options.indexOf(element.selectedOptions[0])+step;
  if(options[index])element.value=options[index].value;
 }else if(step>0){
  element.stepUp();
 }else{
  element.stepDown();
 }
 if(element.value!==old)dispatchValue(element);
}

function dispatchValue(element){
 element.dispatchEvent(new Event('input',{bubbles:true}));
 element.dispatchEvent(new Event('change',{bubbles:true}));
}

export class GamepadMenu{
 constructor(overlay){
  this.overlay=overlay;
  this.pressed=new Set();
  this.blocked=new Set();
  const clear=()=>{
   this.active=false;
   this.endEdit();
   this.focused?.removeAttribute('data-pad-focus');
  };
  window.addEventListener('pointerdown',clear);
  window.addEventListener('keydown',clear);
 }

 reset(view){
  this.endEdit();
  this.focused=null;
  if(this.active&&view!=='playing')this.focus(this.initial(view));
 }

 initial(view){
  if(view==='lobby')return this.overlay.querySelector('.hero-card.selected');
  if(view==='settings')return this.overlay.querySelector('#volume');
  return this.overlay.querySelector('.primary')||this.overlay.querySelector(FOCUSABLE);
 }

 focus(element){
  if(!element)return;
  this.focused?.removeAttribute('data-pad-focus');
  this.focused=element;
  element.setAttribute('data-pad-focus','');
  element.focus({preventScroll:true});
  element.scrollIntoView({block:'nearest',inline:'nearest'});
 }

 endEdit(cancel=false){
  const element=this.editing;
  if(!element)return;
  if(cancel&&element.value!==this.originalValue){
   element.value=this.originalValue;
   dispatchValue(element);
  }
  element.removeAttribute('data-pad-edit');
  this.editing=null;
 }

 move(from,dir){
  const origin=from.getBoundingClientRect();
  const horizontal=dir==='left'||dir==='right';
  const sign=dir==='left'||dir==='up'?-1:1;
  const x=origin.left+origin.width/2,y=origin.top+origin.height/2;
  let nearest,closest=Infinity;
  for(const candidate of this.overlay.querySelectorAll(FOCUSABLE)){
   if(candidate===from||!candidate.getClientRects().length)continue;
   const box=candidate.getBoundingClientRect();
   const dx=box.left+box.width/2-x,dy=box.top+box.height/2-y;
   const forward=(horizontal?dx:dy)*sign;
   if(forward<4)continue;
   const side=Math.abs(horizontal?dy:dx);
   const score=forward+side*2;
   if(score<closest){closest=score;nearest=candidate;}
  }
  if(nearest)this.focus(nearest);
  else if(!horizontal)this.overlay.querySelector('.panel')?.scrollBy(0,sign*72);
 }

 update(pad,now,view,pause){
  const previous=this.pressed;
  this.pressed=new Set([0,1,9].filter(index=>pad?.buttons[index]?.pressed));
  const tapped=index=>this.pressed.has(index)&&!previous.has(index);
  const dir=pad?direction(pad):null;
  const move=dir&&(dir!==this.heldDirection||now>=this.repeatAt);
  if(move)this.repeatAt=now+(dir===this.heldDirection?110:340);
  this.heldDirection=dir;
  if(view==='playing'){
   if(tapped(9)){this.active=true;pause();}
   return;
  }
  this.blocked=new Set([0,1].filter(index=>this.pressed.has(index)));
  if(!move&&!tapped(0)&&!tapped(1)&&!tapped(9))return;
  this.active=true;
  const focused=document.activeElement;
  const element=this.overlay.contains(focused)&&focused.matches(FOCUSABLE)?focused:this.initial(view);
  if(element!==this.focused||!element?.hasAttribute('data-pad-focus'))this.focus(element);
  if(this.editing){
   if(tapped(1))this.endEdit(true);
   else if(tapped(0)||tapped(9))this.endEdit();
   else if(move)adjust(this.editing,dir==='left'||dir==='up'?-1:1);
  }else if(tapped(1)){
   if(BACK[view])this.overlay.querySelector(BACK[view])?.click();
  }else if(tapped(9)&&START[view]){
   this.overlay.querySelector(START[view])?.click();
  }else if(tapped(0)&&element){
   if(editable(element)){
    this.editing=element;
    this.originalValue=element.value;
    element.setAttribute('data-pad-edit','');
   }else element.click();
  }else if(move&&element){
   this.move(element,dir);
  }
 }

 gameplayPad(pad){
  for(const index of this.blocked)if(!pad?.buttons[index]?.pressed)this.blocked.delete(index);
  if(!this.blocked.size)return pad;
  // A menu confirmation should not also jump or dodge when play starts.
  const buttons=Array.from(pad.buttons,(button,index)=>this.blocked.has(index)?{pressed:false}:button);
  return {index:pad.index,connected:pad.connected,axes:pad.axes,buttons};
 }
}
