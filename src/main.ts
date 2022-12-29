import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as compression from 'compression';
import helmet from 'helmet';
import { accountMiddleware } from './modules/common/middleware/accountMiddleware';
import { PrismaService } from 'nestjs-prisma';
import { INestApplication, Type } from '@nestjs/common/interfaces';
const cluster = require('cluster');

export let nestApp: INestApplication;

async function bootstrap() {
  if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    console.log(`Master process: ${process.pid} is running`);

    const WORKERS = process.env.WEB_CONCURRENCY || 1;
    for (let i = 0; i < WORKERS; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
      console.log('Forking a new worker.');
      cluster.fork();
    });
  } else {
    // App platform does not use .env
    if (process.env.NODE_ENV === 'development') {
      config();
    }

    nestApp = await NestFactory.create(AppModule);

    nestApp.enableCors();
    nestApp.use(compression());

    nestApp.use(helmet.dnsPrefetchControl());
    nestApp.use(helmet.expectCt());
    nestApp.use(helmet.frameguard());
    nestApp.use(helmet.hidePoweredBy());
    nestApp.use(helmet.hsts());
    nestApp.use(helmet.ieNoOpen());
    nestApp.use(helmet.noSniff());
    nestApp.use(helmet.originAgentCluster());
    nestApp.use(helmet.permittedCrossDomainPolicies());
    nestApp.use(helmet.referrerPolicy());
    nestApp.use(helmet.xssFilter());

    nestApp.use(accountMiddleware);

    const prismaService: PrismaService = nestApp.get(PrismaService);
    await prismaService.enableShutdownHooks(nestApp);

    // const HOST = process.env.HOST;
    const PORT = process.env.PORT || 5000;
    await nestApp.listen(PORT, () => console.log(`DEX Backend running at: ${PORT}`));
  }
}

bootstrap();

export function getApp() {
  return nestApp;
}

export function getAppService<T>(type: Type<T>) {
  return nestApp.get(type) as T;
}
