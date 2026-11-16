import {sprite} from './sprites.js';

// Use the same robot artwork as the standalone witness games.
export function robotSpeech(text,formula=''){
  const scene=document.createElement('div');scene.className='robot-scene';
  const portrait=document.createElement('span');portrait.className='robot-portrait';
  portrait.setAttribute('aria-hidden','true');portrait.innerHTML=sprite('robot');
  const bubble=document.createElement('div');bubble.className='robot-bubble';
  const name=document.createElement('strong');name.className='robot-speaker';name.textContent='הרובוט אומר:';
  const words=typeof text==='string'?document.createElement('p'):text;
  if(typeof text==='string')words.textContent=text;
  bubble.append(name,words);
  if(formula){const line=document.createElement('p');line.className='set-proof-formula';line.dir='ltr';line.textContent=formula;bubble.append(line);}
  scene.append(portrait,bubble);return scene;
}
