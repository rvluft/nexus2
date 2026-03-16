import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

@Controller('storage')
export class StorageController {
  private storageDir = '/app/storage/uploads';

  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(this.storageDir, filename);
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ message: 'Arquivo não encontrado' });
    }
  }
}
