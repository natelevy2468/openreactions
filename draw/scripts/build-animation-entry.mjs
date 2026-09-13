import {mkdir,readFile,writeFile} from 'node:fs/promises';
// Both document types share compiled assets, but have distinct public pages.
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
await mkdir(new URL('../../animate/',import.meta.url),{recursive:true});
await writeFile(new URL('../../animate/index.html',import.meta.url),html.replace('<title>OpenReactions</title>','<title>Animation — OpenReactions</title>'));
