export function passwordResetEmail(name: string, resetUrl: string) {
	const subject = 'Reset your password';

	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">LLMTokenHub</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">Hi ${name},</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 10px 24px; border-radius: 6px;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #2563eb; word-break: break-all;">${resetUrl}</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = `Hi ${name},\n\nWe received a request to reset your password. Visit this link to set a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n- LLMTokenHub`;

	return { subject, html, text };
}
