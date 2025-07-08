import nodemailer from 'nodemailer';

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'mail.voidroleplay.de',
            port: 587,
            secure: false,
            auth: {
                pass: process.env.SMTP_PASS || 'voidroleplay',
                user: process.env.SMTP_USER || 'no-reply@voidroleplay.de',
            }
        });
    }

    public sendAsync = async (target: string, subject: string, body: string) => {
        body = `<!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Modernes E-Mail-Layout</title>
        </head>
        <body>
        
          <header style="background-color: #007BFF; padding: 10px; text-align: center; color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
            <h2>${subject}</h2>
          </header>
        
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); margin-top: 20px;">
                ${body}
          </div>
        
          <div style="margin-top: 20px; padding: 10px; border-top: 1px solid #dddddd; text-align: center; color: #777777;">
            <p>Void Roleplay | <a href="https://voidroleplay.de" target="_blank" style="color: #007BFF; text-decoration: none;">www.voidroleplay.de</a></p>
          </div>
        
        </body>
        </html>
        
        
        `;
        this.transporter.sendMail({
            from: process.env.SMTP_FROM || "no-reply@voidroleplay.de",
            to: target,
            subject: subject,
            html: body
        }, (error : any, info : any) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent " + info.response);
            }
        })
    }
}

export const emailService = new EmailService();