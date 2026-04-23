import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from '../common/decorators/public.decorator';
import { FilesService } from './files.service';

// NOTE: endpoints are marked @Public for now to stay bug-compatible with
// the existing minioService in the mobile app. Once the app sends JWT on
// upload/file requests, remove @Public and require auth.
@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.files.upload(file);
  }

  @Public()
  @Get('file/:id')
  getFileUrl(@Param('id') id: string) {
    return this.files.presignedGet(id);
  }
}
