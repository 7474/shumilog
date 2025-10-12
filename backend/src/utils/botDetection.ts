/**
 * ボット検出ユーティリティ
 * OGPをクロールする主要なボットのUser-Agentパターンを検出
 */

const BOT_PATTERNS = [
  /Twitterbot/i,
  /facebookexternalhit/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Pinterestbot/i,
  /redditbot/i,
  /SkypeUriPreview/i,
  /vkShare/i,
  /W3C_Validator/i,
  /Googlebot/i,
  /bingbot/i,
  /Baiduspider/i,
];

/**
 * User-AgentからOGPボットを検出
 * @param userAgent User-Agent文字列
 * @returns ボットの場合true
 */
export function isOgpBot(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false;
  }

  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}
