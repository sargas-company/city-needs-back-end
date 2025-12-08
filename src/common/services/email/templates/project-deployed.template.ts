import { EmailTemplate } from '../email.service';

export const projectDeployedTemplate: EmailTemplate = {
  subject: 'Your project "{{projectName}}" has been deployed!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #2196F3;">🚀 Project Deployed Successfully!</h1>
        <p>Hi {{userName}},</p>
        <p>Great news! Your project <strong>{{projectName}}</strong> has been successfully deployed.</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Deployment Details:</h3>
          <p><strong>Project:</strong> {{projectName}}</p>
          <p><strong>Status:</strong> Live</p>
          <p><strong>Preview URL:</strong> <a href="{{previewUrl}}" style="color: #2196F3;">{{previewUrl}}</a></p>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{previewUrl}}" style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            View Project
          </a>
          <a href="{{dashboardUrl}}" style="background-color: #666; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <p>Keep building amazing things!</p>
        <p>Best regards,<br>The {{appName}} Team</p>
      </div>
    </body>
    </html>
  `,
};
