import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloud_name'),
      api_key: this.configService.get<string>('cloudinary.api_key'),
      api_secret: this.configService.get<string>('cloudinary.api_secret'),
    });
  }
  /**
   * Sube un archivo a Cloudinary y detecta el tipo de recurso automáticamente.
   * Sirve para imágenes, audios, videos, PDFs, etc.
   */
  async uploadToCloudinary(
    file: Express.Multer.File,
    folder = 'attachments',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    // Detectar el tipo de recurso según el MIME
    const mime = file.mimetype;

    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (mime.startsWith('image/')) resourceType = 'image';
    else if (mime.startsWith('audio/') || mime.startsWith('video/'))
      resourceType = 'video';
    else resourceType = 'raw'; // documentos, pdf, etc.

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result: any) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
  }

  async uploadBufferToCloudinary(
    buf: Buffer,
    mime: string,
    opts?: { folder?: string; publicIdHint?: string },
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const folder = opts?.folder ?? 'attachments';
    const resourceType = this.detectResourceType(mime);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: opts?.publicIdHint, // opcional: forzar nombre amigable
          use_filename: true,
          unique_filename: !opts?.publicIdHint, // si doy public_id fijo, no lo fuerces único
          overwrite: false,
        },
        (error, result: any) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      stream.end(buf);
    });
  }

  private detectResourceType(mime: string): 'image' | 'video' | 'raw' {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'video';
    return 'raw';
  }

  async uploadBuffer(
    buffer: Buffer,
    filenameHint: string,
    mime: string,
    folder = 'attachments',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    // Detectar tipo
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (mime.startsWith('image/')) resourceType = 'image';
    else if (mime.startsWith('audio/') || mime.startsWith('video/'))
      resourceType = 'video';
    else resourceType = 'raw';

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          filename_override: filenameHint, // hint opcional
          overwrite: false,
        },
        (error, result: any) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  // Métodos opcionales
  findAll() {
    return 'This action returns all uploads';
  }

  findOne(id: number) {
    return `This action returns upload #${id}`;
  }

  remove(id: number) {
    return `This action removes upload #${id}`;
  }
}
