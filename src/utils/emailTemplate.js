import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_BRAND = {
	primary: '#7C3AED', // main purple from frontend
	primaryDark: '#5B21B6',
	bg: '#F4F3FF',
	white: '#ffffff',
	text: '#1F1734',
	muted: '#6B6B7B',
	accent: '#EDE9FE',
};

export function wrapEmail({ title = 'Seven Talent Hub', contentHtml = '', logoUrl }) {
	const safeLogo = logoUrl || `${process.env.FRONTEND_URL || ''}/seven.png`;
	return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: ${DEFAULT_BRAND.bg}; color: ${DEFAULT_BRAND.text}; }
      .wrapper { width: 100%; background: ${DEFAULT_BRAND.bg}; padding: 20px 0; }
      .container { width: 100%; max-width: 680px; margin: 0 auto; }
      .banner { background: linear-gradient(135deg, ${DEFAULT_BRAND.primary}, ${DEFAULT_BRAND.primaryDark}); color: ${DEFAULT_BRAND.white}; padding: 24px; border-radius: 16px 16px 0 0; display: flex; align-items: center; justify-content: space-between; }
      .banner .title { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.2px; }
      .logo { max-height: 56px; margin-left: 16px; }
      .card { border: 1px solid rgba(124, 58, 237, 0.12); border-top: none; padding: 32px; background: ${DEFAULT_BRAND.white}; border-radius: 0 0 16px 16px; box-shadow: 0 18px 24px -20px rgba(92, 61, 198, 0.45); }
      p { margin: 0 0 16px 0; line-height: 1.6; color: ${DEFAULT_BRAND.text}; }
      .muted { color: ${DEFAULT_BRAND.muted}; font-size: 13px; }
      .highlight { background: ${DEFAULT_BRAND.accent}; padding: 2px 6px; border-radius: 6px; font-weight: 600; color: ${DEFAULT_BRAND.primaryDark}; }
      .btn, .btn:link, .btn:visited { display: inline-block; text-decoration: none !important; padding: 14px 24px; border-radius: 9999px; background: ${DEFAULT_BRAND.primary}; color: ${DEFAULT_BRAND.white} !important; font-weight: 700; margin: 16px 0; letter-spacing: 0.3px; box-shadow: 0 12px 24px -12px rgba(92, 61, 198, 0.65); }
      .small-note { font-size: 13px; color: ${DEFAULT_BRAND.muted}; margin-top: 8px; }
      .footer { margin-top: 28px; border-top: 1px solid rgba(124, 58, 237, 0.12); padding-top: 16px; font-size: 13px; color: ${DEFAULT_BRAND.muted}; }
      .contact { margin-top: 6px; font-weight: 600; color: ${DEFAULT_BRAND.primaryDark}; }
      @media (max-width: 480px) { .banner { flex-direction: column; align-items: flex-start; gap: 10px; } .logo { margin-left: 0; } }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="banner">
          <div class="title">${title} • <span style="font-weight: 800">Seven Talent Hub</span></div>
          <img src="${safeLogo}" alt="Seven Talent Hub" class="logo" />
        </div>
        <div class="card">
          ${contentHtml}
          <div class="footer">
            <p class="muted">Besoin d'aide ? Notre équipe reste disponible :</p>
            <p class="contact">support@seventalenthub.com • 09 55 90 96 88</p>
            <p style="margin-top: 10px">À très vite,<br /><strong>L'équipe Seven Talent Hub</strong></p>
            <p style="font-size: 12px; color: #999; margin-top: 12px">Seven Talent Hub • 101 Rue de Paris, 77200 Torcy • <a href="https://www.seventalenthub.com" style="color: ${DEFAULT_BRAND.primary}; text-decoration: none">seventalenthub.com</a></p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export default wrapEmail;

