import fs from 'node:fs';
import crypto from 'node:crypto';
const environment=Object.fromEntries(fs.readFileSync('C:\\DemoHub24\\config\\mockbank.env','utf8').split(/\r?\n/).filter(Boolean).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)]}));
const password=environment.ADMIN_INITIAL_PASSWORD;
if(!password)throw new Error('ADMIN_INITIAL_PASSWORD is missing');
const hash='{SHA}'+crypto.createHash('sha1').update(password,'utf8').digest('base64');
fs.writeFileSync('C:\\DemoHub24\\config\\users.htpasswd',`admin:${hash}\n`,{encoding:'utf8',mode:0o600});
