import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as compression from 'compression';
import helmet from 'helmet';
const cluster = require('cluster');

async function bootstrap() {
  if (cluster.isMaster) {
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

    const app = await NestFactory.create(AppModule);

    app.enableCors();
    app.use(compression());

    app.use(helmet.dnsPrefetchControl());
    app.use(helmet.expectCt());
    app.use(helmet.frameguard());
    app.use(helmet.hidePoweredBy());
    app.use(helmet.hsts());
    app.use(helmet.ieNoOpen());
    app.use(helmet.noSniff());
    app.use(helmet.originAgentCluster());
    app.use(helmet.permittedCrossDomainPolicies());
    app.use(helmet.referrerPolicy());
    app.use(helmet.xssFilter());

    // const HOST = process.env.HOST;
    const PORT = process.env.PORT || 5000;
    await app.listen(PORT, () => console.log(`DEX Backend running at: ${PORT}`));
  }
}

bootstrap();
