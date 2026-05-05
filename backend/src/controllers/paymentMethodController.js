import pool from "../config/database.js";
import {
  getPaymentMethodsWithAccounts,
  getPaymentMethodById,
  getPaymentAccountById,
  isAccountLinkedToMethod,
} from "../utils/paymentMethods.js";

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getPaymentMethodsWithAccounts(userId, pool);

    res.json({
      status: "OK",
      paymentMethods: data.paymentMethods,
      paymentAccounts: data.paymentAccounts,
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar formas de pagamento",
    });
  }
};

export const createPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, accounts_enabled } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: "ERROR",
        message: "Nome da forma de pagamento é obrigatório",
      });
    }

    const existing = await pool.query(
      `
        SELECT id
        FROM payment_methods
        WHERE user_id = $1 AND LOWER(name) = LOWER($2)
      `,
      [userId, name.trim()],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "ERROR",
        message: "Forma de pagamento já existe",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO payment_methods (user_id, name, accounts_enabled, is_default)
        VALUES ($1, $2, $3, FALSE)
        RETURNING *
      `,
      [userId, name.trim(), Boolean(accounts_enabled)],
    );

    res.status(201).json({
      status: "OK",
      message: "Forma de pagamento criada com sucesso",
      paymentMethod: result.rows[0],
    });
  } catch (error) {
    console.error("Create payment method error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao criar forma de pagamento",
    });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentMethodId = parsePositiveInt(req.params.id);
    const { name, accounts_enabled } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        status: "ERROR",
        message: "ID de forma de pagamento inválido",
      });
    }

    const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, pool);

    if (!paymentMethod) {
      return res.status(404).json({
        status: "ERROR",
        message: "Forma de pagamento não encontrada",
      });
    }

    if (
      typeof name === "string" &&
      name.trim() &&
      paymentMethod.is_default &&
      name.trim().toLowerCase() !== paymentMethod.name.toLowerCase()
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Formas de pagamento padrão não podem ser renomeadas",
      });
    }

    if (typeof name === "string" && name.trim()) {
      const duplicate = await pool.query(
        `
          SELECT id
          FROM payment_methods
          WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3
        `,
        [userId, name.trim(), paymentMethodId],
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          status: "ERROR",
          message: "Já existe uma forma de pagamento com esse nome",
        });
      }
    }

    const nextName =
      typeof name === "string" && name.trim() ? name.trim() : paymentMethod.name;
    const nextAccountsEnabled =
      typeof accounts_enabled === "boolean"
        ? accounts_enabled
        : paymentMethod.accounts_enabled;

    const result = await pool.query(
      `
        UPDATE payment_methods
        SET name = $1, accounts_enabled = $2
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `,
      [nextName, nextAccountsEnabled, paymentMethodId, userId],
    );

    res.json({
      status: "OK",
      message: "Forma de pagamento atualizada com sucesso",
      paymentMethod: result.rows[0],
    });
  } catch (error) {
    console.error("Update payment method error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao atualizar forma de pagamento",
    });
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentMethodId = parsePositiveInt(req.params.id);

    if (!paymentMethodId) {
      return res.status(400).json({
        status: "ERROR",
        message: "ID de forma de pagamento inválido",
      });
    }

    const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, pool);

    if (!paymentMethod) {
      return res.status(404).json({
        status: "ERROR",
        message: "Forma de pagamento não encontrada",
      });
    }

    if (paymentMethod.is_default) {
      return res.status(400).json({
        status: "ERROR",
        message: "Formas de pagamento padrão não podem ser deletadas",
      });
    }

    const usedInEntries = await pool.query(
      "SELECT COUNT(*) FROM entries WHERE payment_method_id = $1 AND user_id = $2",
      [paymentMethodId, userId],
    );

    if (Number(usedInEntries.rows[0].count) > 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Não é possível deletar uma forma de pagamento em uso",
      });
    }

    await pool.query(
      "DELETE FROM payment_methods WHERE id = $1 AND user_id = $2",
      [paymentMethodId, userId],
    );

    res.json({
      status: "OK",
      message: "Forma de pagamento deletada com sucesso",
    });
  } catch (error) {
    console.error("Delete payment method error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao deletar forma de pagamento",
    });
  }
};

export const createPaymentAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: "ERROR",
        message: "Nome da conta é obrigatório",
      });
    }

    const existing = await pool.query(
      `
        SELECT id
        FROM payment_accounts
        WHERE user_id = $1 AND LOWER(name) = LOWER($2)
      `,
      [userId, name.trim()],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "ERROR",
        message: "Conta já existe",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO payment_accounts (user_id, name)
        VALUES ($1, $2)
        RETURNING *
      `,
      [userId, name.trim()],
    );

    res.status(201).json({
      status: "OK",
      message: "Conta criada com sucesso",
      paymentAccount: result.rows[0],
    });
  } catch (error) {
    console.error("Create payment account error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao criar conta",
    });
  }
};

export const deletePaymentAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentAccountId = parsePositiveInt(req.params.id);

    if (!paymentAccountId) {
      return res.status(400).json({
        status: "ERROR",
        message: "ID de conta inválido",
      });
    }

    const paymentAccount = await getPaymentAccountById(
      userId,
      paymentAccountId,
      pool,
    );

    if (!paymentAccount) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conta não encontrada",
      });
    }

    const usedInEntries = await pool.query(
      "SELECT COUNT(*) FROM entries WHERE payment_account_id = $1 AND user_id = $2",
      [paymentAccountId, userId],
    );

    if (Number(usedInEntries.rows[0].count) > 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Não é possível deletar uma conta em uso",
      });
    }

    await pool.query(
      "DELETE FROM payment_accounts WHERE id = $1 AND user_id = $2",
      [paymentAccountId, userId],
    );

    res.json({
      status: "OK",
      message: "Conta deletada com sucesso",
    });
  } catch (error) {
    console.error("Delete payment account error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao deletar conta",
    });
  }
};

export const linkPaymentAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentMethodId = parsePositiveInt(req.params.id);
    const paymentAccountId = parsePositiveInt(req.body.payment_account_id);

    if (!paymentMethodId || !paymentAccountId) {
      return res.status(400).json({
        status: "ERROR",
        message: "Forma de pagamento e conta são obrigatórias",
      });
    }

    const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, pool);

    if (!paymentMethod) {
      return res.status(404).json({
        status: "ERROR",
        message: "Forma de pagamento não encontrada",
      });
    }

    if (!paymentMethod.accounts_enabled) {
      return res.status(400).json({
        status: "ERROR",
        message:
          "Ative contas da forma de pagamento antes de vincular uma conta",
      });
    }

    const paymentAccount = await getPaymentAccountById(
      userId,
      paymentAccountId,
      pool,
    );

    if (!paymentAccount) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conta não encontrada",
      });
    }

    const alreadyLinked = await isAccountLinkedToMethod(
      paymentMethodId,
      paymentAccountId,
      pool,
    );

    if (alreadyLinked) {
      return res.status(409).json({
        status: "ERROR",
        message: "Conta já vinculada a esta forma de pagamento",
      });
    }

    await pool.query(
      `
        INSERT INTO payment_method_accounts (payment_method_id, payment_account_id)
        VALUES ($1, $2)
      `,
      [paymentMethodId, paymentAccountId],
    );

    res.status(201).json({
      status: "OK",
      message: "Conta vinculada com sucesso",
      paymentAccount,
    });
  } catch (error) {
    console.error("Link payment account error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao vincular conta",
    });
  }
};

export const unlinkPaymentAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentMethodId = parsePositiveInt(req.params.id);
    const paymentAccountId = parsePositiveInt(req.params.accountId);

    if (!paymentMethodId || !paymentAccountId) {
      return res.status(400).json({
        status: "ERROR",
        message: "Forma de pagamento e conta são obrigatórias",
      });
    }

    const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, pool);
    const paymentAccount = await getPaymentAccountById(
      userId,
      paymentAccountId,
      pool,
    );

    if (!paymentMethod || !paymentAccount) {
      return res.status(404).json({
        status: "ERROR",
        message: "Forma de pagamento ou conta não encontrada",
      });
    }

    await pool.query(
      `
        DELETE FROM payment_method_accounts
        WHERE payment_method_id = $1 AND payment_account_id = $2
      `,
      [paymentMethodId, paymentAccountId],
    );

    res.json({
      status: "OK",
      message: "Conta desvinculada com sucesso",
    });
  } catch (error) {
    console.error("Unlink payment account error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao desvincular conta",
    });
  }
};
