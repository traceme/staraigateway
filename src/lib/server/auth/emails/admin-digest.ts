export function adminDigestEmail(
	orgName: string,
	date: string,
	members: Array<{ name: string; spend: string; limit: string; percentage: number }>
): { subject: string; html: string; text: string } {
	const subject = `LLMTokenHub: Daily budget digest for ${orgName}`;

	const memberRows = members
		.map(
			(m) =>
				`<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #3f3f46;">${m.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #3f3f46;">${m.spend}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #3f3f46;">${m.limit}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: ${m.percentage >= 100 ? '#ef4444' : '#f59e0b'}; font-weight: 600;">${m.percentage}%</td>
        </tr>`
		)
		.join('\n');

	const textRows = members.map((m) => `  ${m.name}: ${m.spend} / ${m.limit} (${m.percentage}%)`).join('\n');

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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">LLMTokenHub</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.5;">Daily budget digest for <strong>${orgName}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #a1a1aa;">${date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #3f3f46;">The following members are at 90% or more of their budget:</p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e4e4e7; border-radius: 6px;">
                <thead>
                  <tr style="background-color: #fafafa;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e4e4e7;">Name</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e4e4e7;">Spend</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e4e4e7;">Limit</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e4e4e7;">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  ${memberRows}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #e4e4e7; margin-top: 24px;">
              <p style="margin: 0; font-size: 13px; color: #a1a1aa;">${orgName} &middot; LLMTokenHub</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = `Daily budget digest for ${orgName}\n${date}\n\nMembers at 90%+ of budget:\n${textRows}\n\n${orgName} - LLMTokenHub`;

	return { subject, html, text };
}
