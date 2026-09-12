import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class OtpSenderService {
  private readonly logger = new Logger("OTP");
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    if (this.config.get("OTP_DELIVERY") === "email" && this.config.get("SMTP_HOST")) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get("SMTP_HOST"),
        port: Number(this.config.get("SMTP_PORT") ?? 587),
        secure: false,
        auth: {
          user: this.config.get("SMTP_USER"),
          pass: this.config.get("SMTP_PASS"),
        },
      });
    }
  }

  async send(identifier: string, code: string) {
    const delivery = this.config.get("OTP_DELIVERY") ?? "console";

    if (delivery === "email" && this.transporter && identifier.includes("@")) {
      await this.transporter.sendMail({
        from: this.config.get("SMTP_FROM"),
        to: identifier,
        subject: "Your Glido verification code",
        text: `Your Glido OTP is ${code}. It expires in 5 minutes.`,
        html: `<p>Your Glido verification code is <b>${code}</b>. It expires in 5 minutes.</p>`,
      });
      return;
    }

    // Free/demo fallback — log to server console so no SMS/email provider is required.
    this.logger.warn(`OTP for ${identifier}: ${code} (visible only in server logs — demo mode)`);
  }
}
