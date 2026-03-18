export function budgetWarningEmail(
	memberName: string,
	currentSpend: string,
	limit: string,
	orgName: string,
	lang: string = 'en'
): { subject: string; html: string; text: string } {
	const isZh = lang === 'zh';
	const subject = isZh ? `预算警告 - ${orgName}` : "You're approaching your monthly AI budget";

	// Calculate percentage for progress bar
	const spendNum = parseFloat(currentSpend.replace('$', ''));
	const limitNum = parseFloat(limit.replace('$', ''));
	const pct = limitNum > 0 ? Math.min(Math.round((spendNum / limitNum) * 100), 100) : 0;
	const barWidth = Math.round((pct / 100) * 200);

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
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">${isZh ? `您好 ${memberName}，` : `Hi ${memberName},`}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">${isZh ? `您在 ${orgName} 的使用量已达到预算的 ${pct}%。当前消费 <strong>${currentSpend}</strong>，预算上限 <strong>${limit}</strong>。` : `You've used <strong>${currentSpend}</strong> of your <strong>${limit}</strong> monthly AI budget.`}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px;">
              <table cellpadding="0" cellspacing="0" style="width: 200px; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #e4e4e7; border-radius: 4px; height: 8px; width: 200px;">
                    <table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="background-color: ${pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#2563eb'}; border-radius: 4px; height: 8px; width: ${barWidth}px;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #71717a;">${isZh ? `已使用 ${pct}%` : `${pct}% used`}</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">${isZh ? '如需提高预算上限，请联系您的管理员。' : 'Contact your admin if you need a higher limit.'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #e4e4e7; margin-top: 24px;">
              <p style="margin: 0; font-size: 13px; color: #a1a1aa;">${orgName} &middot; StarAIGateway</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = isZh
		? `您好 ${memberName}，\n\n您在 ${orgName} 的使用量已达到预算的 ${pct}%。当前消费 ${currentSpend}，预算上限 ${limit}。\n\n如需提高预算上限，请联系您的管理员。\n\n${orgName} - StarAIGateway`
		: `Hi ${memberName},\n\nYou've used ${currentSpend} of your ${limit} monthly AI budget (${pct}%).\n\nContact your admin if you need a higher limit.\n\n${orgName} - StarAIGateway`;

	return { subject, html, text };
}
