/**
 * Sends an SMS verification code through an optional provider webhook.
 * Without SMS_WEBHOOK_URL, local development uses console delivery and the
 * API returns the code only when NODE_ENV is not "production".
 */
export async function sendSmsVerification({ phone, code, purpose }) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(`[SMS:DEV] ${phone} ${purpose} 验证码：${code}`);
    return { provider: "console", delivered: true };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      phone,
      code,
      purpose,
      template:
        purpose === "reset"
          ? "灵枢医疗：您的密码重置验证码为 {{code}}，5 分钟内有效。"
          : "灵枢医疗：您的注册验证码为 {{code}}，5 分钟内有效。",
    }),
  });
  if (!response.ok) {
    throw new Error(`短信服务响应异常（${response.status}）`);
  }
  return { provider: "webhook", delivered: true };
}
