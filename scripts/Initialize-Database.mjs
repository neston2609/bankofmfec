import pg from 'pg';
const {Client}=pg;
const superPassword=process.env.DEMOHUB_PG_SUPER_PASSWORD;
const applicationPassword=process.env.DEMOHUB_PG_APPLICATION_PASSWORD;
if(!superPassword||!applicationPassword)throw new Error('Database bootstrap credentials were not supplied');
const client=new Client({host:'127.0.0.1',port:5432,user:'postgres',password:superPassword,database:'postgres'});
await client.connect();
try{
 await client.query(`CREATE ROLE demohub24_app LOGIN PASSWORD '${applicationPassword.replaceAll("'","''")}'`);
 await client.query('CREATE DATABASE demohub24_bank OWNER demohub24_app ENCODING \'UTF8\'');
}finally{await client.end()}
