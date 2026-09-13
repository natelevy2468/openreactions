import { renderMechanism } from './render.js';
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function frameAt(doc,seconds,speed=1){
  const duration=6/speed,hold=1/speed,section=duration+hold;
  const index=Math.min(doc.steps.length-1,Math.floor(seconds/section));
  const step=doc.steps[index];return {before:index?doc.steps[index-1].after:doc.initial,after:step.after,flows:step.flows,progress:Math.min(1,(seconds-index*section)/duration),title:step.title||`Step ${index+1}`};
}
export async function exportAnimation(doc,format,{speed=1,onProgress=()=>{},signal}={}){
  if(!doc.steps.length)throw new Error('Accept at least one step before exporting.');
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=480;
  const ctx=canvas.getContext('2d');const seconds=doc.steps.length*7/speed;
  const paint=time=>{ctx.setTransform(.8,0,0,.8,0,0);const f=frameAt(doc,time,speed);renderMechanism(ctx,f.before,f.after,f.flows,f.progress,{tags:false,title:f.title});};
  if(format==='gif'){
    const {GIFEncoder,quantize,applyPalette}=await import('gifenc');const gif=GIFEncoder(),fps=12,frames=Math.ceil(seconds*fps);
    for(let i=0;i<frames;i++){
      if(signal?.aborted)throw new Error('Export cancelled.');paint(i/fps);
      const rgba=ctx.getImageData(0,0,800,480).data,palette=quantize(rgba,64);
      gif.writeFrame(applyPalette(rgba,palette),800,480,{palette,delay:1000/fps,repeat:0});
      if(i%4===0){onProgress(i/frames);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    gif.finish();onProgress(1);return new Blob([gif.bytes()],{type:'image/gif'});
  }
  if(!window.MediaRecorder||!canvas.captureStream)throw new Error('Video export is unavailable in this browser. Use GIF export.');
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('This browser does not support WebM export. Use GIF export.');
  const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];
  let timer;
  try{return await new Promise((resolve,reject)=>{
    const abort=()=>{clearInterval(timer);if(recorder.state!=='inactive')recorder.stop();reject(new Error('Export cancelled.'));};
    signal?.addEventListener('abort',abort,{once:true});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>reject(new Error('Video recording failed.'));
    recorder.onstop=()=>{signal?.removeEventListener('abort',abort);resolve(new Blob(chunks,{type:'video/webm'}));};
    paint(0);recorder.start();const start=performance.now();
    timer=setInterval(()=>{const time=(performance.now()-start)/1000;paint(Math.min(time,seconds-.001));onProgress(Math.min(1,time/seconds));if(time>=seconds){clearInterval(timer);recorder.stop();}},1000/30);
  });}finally{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());}
}
