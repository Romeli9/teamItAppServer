import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';

import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { cors: true },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') ?? 5000);
  const sslKey = config.get<string>('SSL_KEY_PATH');
  const sslCert = config.get<string>('SSL_CERT_PATH');

  await app.init();

  if (sslKey && sslCert && fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
    const httpsOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
    };
    https.createServer(httpsOptions, server).listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`HTTPS server running on https://0.0.0.0:${port}`);
    });
  } else {
    http.createServer(server).listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`HTTP server running on http://0.0.0.0:${port}`);
    });
  }
}

bootstrap();
