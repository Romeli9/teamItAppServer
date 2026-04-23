import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

import { MINIO_CLIENT } from './minio.provider';

@Injectable()
export class FilesService {
  private readonly bucket: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: MinioClient,
    config: ConfigService,
  ) {
    const bucket = config.get<string>('BUCKET_NAME');
    if (!bucket) throw new Error('BUCKET_NAME is not configured');
    this.bucket = bucket;
  }

  async upload(file: Express.Multer.File): Promise<{ id: string }> {
    const ext = path.extname(file.originalname);
    const fileName = crypto.randomBytes(16).toString('hex') + ext;
    try {
      await this.minio.putObject(this.bucket, fileName, file.buffer, file.size);
      return { id: fileName };
    } catch {
      throw new InternalServerErrorException('Upload failed');
    }
  }

  async presignedGet(id: string): Promise<{ url: string }> {
    try {
      const url = await this.minio.presignedGetObject(this.bucket, id, 24 * 60 * 60);
      return { url };
    } catch {
      throw new InternalServerErrorException('Failed to generate link');
    }
  }
}
