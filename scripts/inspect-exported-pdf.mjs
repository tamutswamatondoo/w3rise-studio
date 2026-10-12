// Read-only visual verification of the actual browser-exported PDF.
import { createServer } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=path.join(root,'artifacts/private');
const evidence=JSON.parse(await readFile(path.join(directory,'workflow-evidence.json'),'utf8'));
const input=process.argv[2]||path.join(directory,`${evidence.reference}-v01-price-list.pdf`);
const pdfBytes=await readFile(input);
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'private-pdf-review',configureServer(instance){
  instance.middlewares.use('/__pdf-review',(_request,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Private exported PDF inspection</title><body style="margin:0"><canvas id="pdf"></canvas></body>');});
}}],server:{host:'127.0.0.1',port:5190,strictPort:true}});
await server.listen();const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1250,height:1750},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5190/__pdf-review');
  const result=await page.evaluate(async bytes=>{
    const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs';
    const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;
    const documentPage=await pdf.getPage(1);const viewport=documentPage.getViewport({scale:2});
    const canvas=document.querySelector('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await documentPage.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
    return {pageCount:pdf.numPages,widthPoints:documentPage.view[2],heightPoints:documentPage.view[3],renderWidth:canvas.width,renderHeight:canvas.height};
  },Array.from(pdfBytes));
  assert.equal(result.pageCount,1);assert.equal(result.widthPoints,595.28);assert.equal(result.heightPoints,841.89);
  await mkdir(directory,{recursive:true});
  await page.locator('canvas').screenshot({path:path.join(directory,'exported-A4-pdf-render.png')});
  await writeFile(path.join(directory,'pdf-render-evidence.json'),JSON.stringify({input,renderer:'PDF.js',...result},null,2));
  console.log('Actual exported A4 PDF rendered successfully; inspect artifacts/private/exported-A4-pdf-render.png.');
}finally{await browser.close();await server.close();}
