import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppModule } from './app.module';
async function bootstrap() {
 const app=await NestFactory.create(AppModule); app.use(helmet()); app.enableCors({origin:/\.demohub24\.com$|localhost/});
 app.use((req:Request,res:Response,next:NextFunction)=>{const publicPath=req.path==='/'||req.path==='/health'||req.path.startsWith('/api/health')||req.path.startsWith('/docs')||req.path==='/openapi.json'||req.path.startsWith('/auth/')||req.path.startsWith('/retail/');const legacyPath=req.path.startsWith('/legacy/');if(publicPath||legacyPath)return next();const supplied=req.header('X-API-Key');const accepted=[process.env.API_KEY_GENESYS,process.env.API_KEY_SERVICENOW,process.env.API_KEY_GOOGLE_AI,process.env.API_KEY_UIPATH].filter(Boolean);if(supplied&&accepted.includes(supplied))return next();const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('demohub_session='))?.slice(16);if(token){const [payload,signature]=token.split('.');if(payload&&signature){const expected=createHmac('sha256',process.env.JWT_SECRET||'').update(payload).digest('base64url');if(signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))){try{const [,expiry]=Buffer.from(payload,'base64url').toString().split('|');if(Number(expiry)>Date.now())return next()}catch{}}}}return res.status(401).json({statusCode:401,error:'Unauthorized',message:'A valid SSO session or X-API-Key is required'});});
 const config=new DocumentBuilder().setTitle('DemoHub24 Mock Banking API').setDescription('Synthetic banking APIs for Genesys, ServiceNow, Google AI and UiPath. No production banking data.').setVersion('1.0.0').addApiKey({type:'apiKey',name:'X-API-Key',in:'header'},'api-key').build();
 const doc=SwaggerModule.createDocument(app,config); SwaggerModule.setup('docs',app,doc); app.getHttpAdapter().get('/openapi.json',(_q:any,r:any)=>r.json(doc));
 await app.listen(Number(process.env.PORT||4100),'127.0.0.1');
}
bootstrap();
