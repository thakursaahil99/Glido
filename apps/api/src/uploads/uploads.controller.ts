import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { extname, join } from "path";
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// On Vercel the whole filesystem except /tmp is read-only, and /tmp itself is wiped between
// invocations — uploads there won't persist. Fine for keeping the demo API from crashing;
// real persistent uploads on serverless need object storage (Vercel Blob/S3/Cloudinary).
const UPLOADS_DIR = process.env.VERCEL ? join(tmpdir(), "uploads") : join(process.cwd(), "uploads");

@ApiTags("uploads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("uploads")
export class UploadsController {
  @Post("image")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
          callback(null, UPLOADS_DIR);
        },
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException("Only JPG, PNG, WEBP or GIF images are allowed."), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded.");
    return { url: `/uploads/${file.filename}` };
  }
}
