import { Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { MinioClientProvider } from './minio.provider';

@Module({
  controllers: [FilesController],
  providers: [MinioClientProvider, FilesService],
  exports: [FilesService],
})
export class FilesModule {}
