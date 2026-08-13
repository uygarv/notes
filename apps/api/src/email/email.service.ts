import { Injectable } from '@nestjs/common';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

@Injectable()
export class EmailService {
  private readonly client = new SESv2Client({
    region: process.env.AWS_REGION,
  });

  async sendPasswordResetEmail(email: string, token: string) {
    const from = process.env.SES_FROM_EMAIL;

    if (!from) {
      throw new Error('SES_FROM_EMAIL is not defined');
    }

    const resetUrl = new URL('/reset-password', process.env.WEB_URL ?? 'http://localhost:3001');
    resetUrl.searchParams.set('token', token);

    await this.client.send(new SendEmailCommand({
      FromEmailAddress: from,
      ReplyToAddresses: process.env.SES_REPLY_TO_EMAIL ? [process.env.SES_REPLY_TO_EMAIL] : undefined,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: 'Reset your Notes password', Charset: 'UTF-8' },
          Body: {
            Text: {
              Data: `Reset your Notes password by visiting this link:\n\n${resetUrl.toString()}\n\nThis link expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.`,
              Charset: 'UTF-8',
            },
            Html: {
              Data: `<p>Reset your Notes password by using the link below.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>This link expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>`,
              Charset: 'UTF-8',
            },
          },
        },
      },
    }));
  }
}
