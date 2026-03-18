export function invitationEmail(
	orgName: string,
	inviterName: string,
	role: string,
	acceptUrl: string,
	lang: string = 'en'
) {
	const isZh = lang === 'zh';
	const subject = isZh
		? `${inviterName} 邀请您加入 ${orgName}`
		: `You've been invited to join ${orgName} on StarAIGateway`;

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
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">StarAIGateway</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">${isZh ? '您好，' : 'Hi there,'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">${isZh ? `${inviterName} 邀请您以 <strong>${role}</strong> 身份加入 <strong>${orgName}</strong>。` : `${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.`}</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <a href="${acceptUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 10px 24px; border-radius: 6px;">${isZh ? '接受邀请' : 'Accept Invitation'}</a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">${isZh ? '此邀请将在7天后过期。' : 'This invitation expires in 7 days.'}</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #71717a; line-height: 1.5;">${isZh ? '如果按钮无法使用，请复制以下链接到浏览器中打开：' : "If the button doesn't work, copy and paste this link into your browser:"}</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #2563eb; word-break: break-all;">${acceptUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = isZh
		? `您好，\n\n${inviterName} 邀请您以 ${role} 身份加入 ${orgName}。\n\n接受邀请：${acceptUrl}\n\n此邀请将在7天后过期。\n\n- StarAIGateway`
		: `Hi there,\n\n${inviterName} has invited you to join ${orgName} as a ${role}.\n\nAccept the invitation: ${acceptUrl}\n\nThis invitation expires in 7 days.\n\n- StarAIGateway`;

	return { subject, html, text };
}
