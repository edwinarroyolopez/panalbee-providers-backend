import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploads.uploadToCloudinary(file);

    return {
      publicId: result.public_id,
      url: result.secure_url,
      thumbnailUrl: this.thumbnailUrl(result.public_id),
      originalFilename: file.originalname,
      resourceType: result.resource_type,
    };
  }

  private thumbnailUrl(publicId: string) {
    const cloud = this.configService.get<string>('cloudinary.cloud_name');
    if (!cloud) return null;
    return `https://res.cloudinary.com/${cloud}/image/upload/w_150,h_150,c_fill/${publicId}`;
  }
}
