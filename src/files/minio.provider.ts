import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

export const MinioClientProvider: Provider = {
  provide: MINIO_CLIENT,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const logger = new Logger('Minio');
    const endPoint = config.get<string>('MINIO_ENDPOINT');
    const port = Number(config.get<string>('MINIO_PORT'));
    const useSSL = config.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = config.get<string>('MINIO_ACCESS_KEY');
    const secretKey = config.get<string>('MINIO_SECRET_KEY');
    const bucket = config.get<string>('BUCKET_NAME');

    if (!endPoint || !accessKey || !secretKey || !bucket) {
      throw new Error('MinIO env vars are not fully configured');
    }

    const client = new MinioClient({ endPoint, port, useSSL, accessKey, secretKey });

    const exists = await client.bucketExists(bucket).catch((err) => {
      logger.error(`Bucket check failed: ${err.message}`);
      return false;
    });
    if (!exists) {
      await client.makeBucket(bucket, 'us-east-1');
      logger.log(`Bucket "${bucket}" created`);
    } else {
      logger.log(`Bucket "${bucket}" already exists`);
    }

    return client;
  },
};
