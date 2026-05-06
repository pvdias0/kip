const brevoApiKey = process.env.BREVO_API_KEY;
const brevoApiUrl = "https://api.brevo.com/v3";

const getFrontendUrl = () => {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
    "http://localhost:8080";

  return configuredUrl.replace(/\/$/, "");
};

const getSender = () => ({
  name: process.env.BREVO_SENDER_NAME || "KIP",
  email: process.env.BREVO_SENDER_EMAIL || "noreply@kip.com",
});

const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
  if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY nao configurada");
  }

  const response = await fetch(`${brevoApiUrl}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      htmlContent,
      sender: getSender(),
    }),
  });

  const responseText = await response.text();
  let responseBody = {};

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(responseBody.message || "Erro ao enviar email");
  }

  return responseBody;
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${getFrontendUrl()}/reset-password?token=${resetToken}`;

    return await sendBrevoEmail({
      to: [{ email }],
      subject: "Recuperar Senha - KIP",
      htmlContent: `
        <h1>Recuperacao de Senha</h1>
        <p>Voce solicitou a recuperacao de senha. Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Redefinir Senha
        </a>
        <p>Este link expira em 1 hora.</p>
        <p>Se voce nao solicitou esta recuperacao, ignore este email.</p>
      `,
    });
  } catch (error) {
    console.error("Erro ao enviar email:", error.message);
    throw new Error("Falha ao enviar email de recuperacao");
  }
};

export const sendEmailVerificationEmail = async (
  email,
  name,
  verificationToken,
) => {
  try {
    const verificationLink = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

    return await sendBrevoEmail({
      to: [{ email, name }],
      subject: "Confirme seu email - KIP",
      htmlContent: `
        <h1>Confirme seu email</h1>
        <p>Ola${name ? `, ${name}` : ""}.</p>
        <p>Para ativar sua conta no KIP, confirme seu email pelo link abaixo:</p>
        <a href="${verificationLink}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirmar Email
        </a>
        <p>Este link expira em 24 horas.</p>
        <p>Se voce nao criou esta conta, ignore esta mensagem.</p>
      `,
    });
  } catch (error) {
    console.error("Erro ao enviar email de confirmacao:", error.message);
    throw new Error("Falha ao enviar email de confirmacao");
  }
};
