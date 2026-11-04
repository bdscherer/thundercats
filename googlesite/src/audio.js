import {STAGES} from './data.js';
// Original real-time score: FM-like voices, pulse bass, and synthesized percussion.
export class AudioEngine {
 constructor(){this.ctx=null;this.volume=.35;this.muted=false;this.music=true;this.step=0;this.next=0;this.mode='forest';this.running=false;}
 init(){if(!this.ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.3,this.ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=81;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647)*2-1;}}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}
 setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:v,this.ctx.currentTime,.03);}
 toggle(){this.muted=!this.muted;this.setVolume(this.volume);return this.muted;}
 note(freq,duration=.14,type='triangle',gain=.1,when=0,slide=0){if(!this.ctx)return;const t=when||this.ctx.currentTime;const osc=this.ctx.createOscillator(),env=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(15,freq+slide),t+duration);env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+.008);env.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(env);env.connect(this.master);osc.start(t);osc.stop(t+duration+.02);}
 fm(freq,duration,gain,when){if(!this.ctx)return;const t=when||this.ctx.currentTime;const carrier=this.ctx.createOscillator(),mod=this.ctx.createOscillator(),depth=this.ctx.createGain(),env=this.ctx.createGain();carrier.type='sine';carrier.frequency.value=freq;mod.frequency.value=freq*2;depth.gain.setValueAtTime(freq*1.8,t);depth.gain.exponentialRampToValueAtTime(freq*.08,t+duration);mod.connect(depth);depth.connect(carrier.frequency);env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+.01);env.gain.exponentialRampToValueAtTime(.0001,t+duration);carrier.connect(env);env.connect(this.master);carrier.start(t);mod.start(t);carrier.stop(t+duration+.02);mod.stop(t+duration+.02);}
 hiss(duration=.1,gain=.08,freq=1800,when=0){if(!this.ctx)return;const t=when||this.ctx.currentTime;const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),env=this.ctx.createGain();src.buffer=this.noise;filter.type='highpass';filter.frequency.value=freq;env.gain.setValueAtTime(gain,t);env.gain.exponentialRampToValueAtTime(.0001,t+duration);src.connect(filter);filter.connect(env);env.connect(this.master);src.start(t);src.stop(t+duration);}
 event(type,data={}){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime;switch(type){
  case 'hit':this.note(data.player?90:data.heavy?105:140,data.heavy?.19:.12,'triangle',data.heavy?.45:.3,t,-65);this.hiss(data.heavy?.13:.07,data.heavy?.17:.1,600);break;
  case 'land':this.hiss(.07,.035,400);this.note(66,.07,'sine',.055);break;
  case 'launch':this.hiss(.12,.09,1500);this.note(180,.17,'triangle',.08,t,-120);break;
  case 'swing':this.hiss(.09,.07,2000);this.note(250,.08,'triangle',.04,t,-150);break;
  case 'block':this.note(700,.12,'square',.07,t,-300);break;
  case 'jump':this.note(150,.13,'triangle',.09,t,230);break;
  case 'dodge':this.hiss(.14,.06,1600);break;
  case 'special':[0,4,7,12].forEach((n,i)=>this.fm(220*2**(n/12),.45,.14,t+i*.07));this.note(65,.55,'sawtooth',.13,t,50);break;
  case 'charged':[7,12,19].forEach((n,i)=>this.fm(220*2**(n/12),.28,.1,t+i*.1));break;
  case 'call':this.note(55,1.4,'sawtooth',.13,t,110);[0,7,12,16,19,24].forEach((n,i)=>this.fm(164.8*2**(n/12),.7,.13,t+i*.12));break;
  case 'tankEngine':this.note(36,1.15,'sawtooth',.1,t,28);this.note(53,1.1,'triangle',.15,t,25);for(let i=0;i<6;i++)this.hiss(.09,.035,170,t+i*.16);break;
  case 'tankFire':this.hiss(.22,.2,240,t);this.note(105,.32,'sawtooth',.13,t,-73);this.fm(240,.22,.1,t);break;
  case 'vehicleShot':this.note(370,.075,'triangle',.035,t,-230);break;
  case 'vehicleContinue':[0,7,12].forEach((n,i)=>this.fm(330*2**(n/12),.25,.09,t+i*.1));break;
  case 'thunderImpact':this.hiss(.28,.22,180);this.note(100,.6,'sine',.4,t,-70);break;
  case 'pickup':case 'revive':[0,7,12].forEach((n,i)=>this.note(440*2**(n/12),.15,'triangle',.12,t+i*.07));break;
  case 'break':this.hiss(.2,.19,300);this.note(90,.18,'triangle',.15,t,-50);break;
  case 'down':this.note(180,.5,'sawtooth',.1,t,-130);break;
  case 'clear':case 'bossDefeated':case 'victory':[0,4,7,12,7,12].forEach((n,i)=>this.fm(261.63*2**(n/12),.38,.14,t+i*.12));break;
  case 'empty':this.note(75,.1,'square',.04);break;
  case 'ui':this.note(500,.05,'triangle',.09);break;
  case 'gameover':[0,-3,-7,-12].forEach((n,i)=>this.fm(220*2**(n/12),.5,.12,t+i*.25));break;
 }}
 update(active,stage=0,boss=false){if(!this.ctx)return;if(!active||!this.music){this.next=this.ctx.currentTime;return;}const track=['forest','ruins','desert','pyramid','lair'].indexOf(STAGES[stage]?.theme);const t=this.ctx.currentTime;if(this.next<t-.5)this.next=t+.02;const bpm=boss?144:track===2?126:track===4?124:116;const duration=60/bpm/4;let scheduled=0;while(this.next<t+.15&&scheduled++<8){this.sequence(this.step++,this.next,duration,track,boss);this.next+=duration;}}
 sequence(step,t,d,stage,boss){
  const minor=[0,2,3,5,7,8,10,12],roots=[45,41,48,43],bar=Math.floor(step/32)%4,root=roots[bar]+(stage===3?-2:0);const hz=m=>440*2**((m-69)/12);const s=step%32;
  if(step%4===0)this.note(95,.16,'sine',.19,t,-65);
  if(step%8===4){this.hiss(.12,.1,900,t);this.note(170,.06,'triangle',.1,t,-80);}
  if(step%2===0)this.hiss(.035,step%4===0?.038:.023,6000,t);
  if(step%2===0){const walk=[0,0,7,0,3,0,10,7][Math.floor(s/2)%8];this.note(hz(root-12+walk),d*1.7,'triangle',.12,t);this.note(hz(root-12+walk)*1.005,d*1.7,'square',.025,t);}
  const melody=[12,null,14,15,19,null,17,15,14,null,12,null,10,12,7,null,12,null,15,17,19,null,22,19,17,15,14,null,10,null,7,null];const offset=melody[(s+stage*4)%32];
  if(offset!==null)this.fm(hz(root+offset),d*(boss?1.5:2.6),.07,t);
  if(s%8===0){for(const n of [0,3,7])this.fm(hz(root+12+n),d*7,.018,t);}
 }
 suspend(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
}
