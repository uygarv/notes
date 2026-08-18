import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'node:crypto';

import type { CreateProfileImageUpload } from '@notes/schemas';

const maxProfileImageBytes = 10 * 1024 * 1024;

const fileExtensions: Record<CreateProfileImageUpload['contentType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ProfileImageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBaseUrl: URL | null;

  constructor(config: ConfigService) {
    const bucket = config.get<string>('S3_BUCKET');
    const publicBaseUrl = config.get<string>('S3_PUBLIC_BASE_URL');
    const region = config.get<string>('S3_REGION');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');

    this.bucket = bucket ?? null;
    this.publicBaseUrl = publicBaseUrl ? new URL(`${publicBaseUrl.replace(/\/$/, '')}/`) : null;
    this.client =
      bucket && this.publicBaseUrl && region && accessKeyId && secretAccessKey
        ? new S3Client({
            region,
            endpoint: config.get<string>('S3_ENDPOINT') || undefined,
            forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  async createUpload(userId: number, input: CreateProfileImageUpload) {
    const { client, bucket } = this.requireStorage();
    const key = `profile-images/${userId}/${randomUUID()}.${fileExtensions[input.contentType]}`;
    const upload = await createPresignedPost(client, {
        Bucket: bucket,
        Key: key,
        Fields: { 'Content-Type': input.contentType },
        Conditions: [
          ['content-length-range', 1, maxProfileImageBytes],
          ['eq', '$Content-Type', input.contentType],
        ],
        Expires: 5 * 60,
      });
    return { key, uploadUrl: upload.url, uploadFields: upload.fields };
  }

  async verifyUpload(userId: number, key: string) {
    const { client, bucket } = this.requireStorage();
    this.assertOwnedKey(userId, key);
    let object;
    try {
      object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new BadRequestException({ code: 'profile_image_upload_invalid' });
    }
    if (
      !object.ContentLength ||
      object.ContentLength > maxProfileImageBytes ||
      !Object.hasOwn(fileExtensions, object.ContentType ?? '')
    ) {
      throw new BadRequestException({ code: 'profile_image_upload_invalid' });
    }
    return this.publicUrlFor(key);
  }

  async deleteManagedImage(imageUrl: string | null | undefined) {
    const key = this.managedKeyFromUrl(imageUrl);
    if (!key || !this.client || !this.bucket) return;
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
      .catch(() => undefined);
  }

  private requireStorage() {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new ServiceUnavailableException({ code: 'profile_image_storage_unavailable' });
    }
    return { client: this.client, bucket: this.bucket };
  }

  private assertOwnedKey(userId: number, key: string) {
    if (!key.startsWith(`profile-images/${userId}/`) || key.includes('..')) {
      throw new BadRequestException({ code: 'profile_image_upload_invalid' });
    }
  }

  private publicUrlFor(key: string) {
    const base = this.publicBaseUrl!;
    return new URL(key, base).toString();
  }

  private managedKeyFromUrl(imageUrl: string | null | undefined) {
    if (!imageUrl || !this.publicBaseUrl) return null;
    try {
      const url = new URL(imageUrl);
      if (
        url.origin !== this.publicBaseUrl.origin ||
        !url.pathname.startsWith(this.publicBaseUrl.pathname)
      ) {
        return null;
      }
      const key = decodeURIComponent(
        url.pathname.slice(this.publicBaseUrl.pathname.length),
      );
      return key.startsWith('profile-images/') ? key : null;
    } catch {
      return null;
    }
  }
}
