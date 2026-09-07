import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(
        EmailService.name,
    );

    private readonly transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
            },
        });
    }

    async sendTemporaryPasswordEmail(
        to: string,
        firstName: string,
        temporaryPassword: string,
        role: string,
    ) {
        try {
            await this.transporter.sendMail({
                from:
                    process.env.MAIL_FROM ||
                    process.env.MAIL_USER,

                to,

                subject: 'Your School Brain Account',

                html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            "
          >

            <h2>Welcome to School Brain</h2>

            <p>Hello ${firstName},</p>

            <p>
              Your <strong>${role}</strong> account
              has been created successfully.
            </p>

            <p>
              You can use the following credentials
              to log in:
            </p>

            <div
              style="
                background: #f4f4f4;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              "
            >
              <p>
                <strong>Email:</strong> ${to}
              </p>

              <p>
                <strong>Temporary Password:</strong>
                ${temporaryPassword}
              </p>
            </div>

            <p>
              This is a temporary password.
              You will be required to change it
              after your first login.
            </p>

            <p>
              Please keep your credentials secure.
            </p>

            <p>
              Regards,<br />
              <strong>School Brain</strong>
            </p>

          </div>
        `,
            });

            this.logger.log(
                `Email sent successfully to ${to}`,
            );

            return {
                success: true,
            };
        } catch (error) {
            this.logger.error(
                `Failed to send email to ${to}`,
                error,
            );

            throw new InternalServerErrorException(
                'Failed to send account email',
            );
        }
    }
}