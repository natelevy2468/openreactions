import {continuationError} from './stepDrawing.js';
import {clone,emptyAnimation,proposeStep} from './model.js';
export const newStep = (index=0) => ({id:crypto.randomUUID(),title:`Step ${index+1}`,flows:[],reactingIds:[],after:null});
// Products come from arrows; edited starting structures must match the previous product.
export function compileSequence(initial,steps){
  let before=initial,blocked=false;
  return steps.map((step,index)=>{
    if(blocked)return {...step,before:null,after:null,error:`Finish step ${index} first.`};
    try{
      if(step.editError)throw new Error(step.editError);
      if(step.startScene&&index>0){const mismatch=continuationError(before,step.startScene);if(mismatch)throw new Error(mismatch);before=step.startScene;}
      if(!before?.atoms?.length)throw new Error('Draw or import the starting molecules.');
      const {scene,changes}=proposeStep(before,step.flows||[],step.reactingIds||[]);
      const result={...step,before,after:scene,changes,error:null};before=scene;return result;
    }catch(error){blocked=true;return {...step,before,after:null,error:error.message};}
  });
}
export function prepareAnimation(raw){
  const doc=raw?.kind==='animation'?clone(raw):emptyAnimation();
  const steps=doc.steps||[];
  if(doc.draftFlows?.length)steps.push({...newStep(steps.length),flows:doc.draftFlows,reactingIds:doc.reactingIds||[]});
  if(!steps.length)steps.push(newStep());
  return {...doc,steps,draftFlows:[],reactingIds:[]};
}
export function saveCompiled(doc){
  return {...doc,steps:compileSequence(doc.initial,doc.steps).map(({before,error,changes,...step})=>step),draftFlows:[],reactingIds:[]};
}
export function completedAnimation(doc){
  const compiled=compileSequence(doc.initial,doc.steps);
  const invalid=compiled.findIndex(step=>step.error);
  if(invalid>=0)throw new Error(`Step ${invalid+1}: ${compiled[invalid].error}`);
  if(!compiled.length)throw new Error('Add at least one reaction step.');
  return saveCompiled(doc);
}
