import {drawingToScene} from './importDrawing.js';
import {emptyAnimation} from './model.js';
export async function createAnimationFromDrawing(drawing,title='Untitled animation'){
  const initial=await drawingToScene(drawing),id=crypto.randomUUID();
  localStorage.setItem('openreactions.localDocument.'+id,JSON.stringify({title,updatedAt:new Date().toISOString(),doc:{...emptyAnimation(),initial}}));
  return '/animate/?kind=animation&local='+id;
}
