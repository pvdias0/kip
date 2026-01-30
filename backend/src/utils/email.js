const brevoApiKey = process.env.BREVO_API_KEY;
const brevoApiUrl = "https://api.brevo.com/v3";

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const response = await fetch(`${brevoApiUrl}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [{ email }],
        subject: "Recuperar Senha - KIP",
        htmlContent: `
          <h1>Recuperação de Senha</h1>
          <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Redefinir Senha
          </a>
          <p>Este link expira em 1 hora.</p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
        `,
        sender: {
          name: "KIP",
          email: process.env.BREVO_SENDER_EMAIL || "noreply@kip.com",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao enviar email");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao enviar email:", error.message);
    throw new Error("Falha ao enviar email de recuperação");
  }
};
