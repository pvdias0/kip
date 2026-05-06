import pool from "../config/database.js";
import {
  getPaymentMethodById,
  getPaymentAccountById,
  getPaymentMethodsWithAccounts,
  isAccountLinkedToMethod,
} from "../utils/paymentMethods.js";

export async function getPaymentCatalogForUser(userId, client = pool) {
  return getPaymentMethodsWithAccounts(userId, client);
}

export async function createPaymentMethodForUser(
  userId,
  { name, accounts_enabled = false },
  client = pool,
) {
  if (!name || !name.trim()) {
    throw new Error("Nome da forma de pagamento e obrigatorio");
  }

  const existing = await client.query(
    `
      SELECT id
      FROM payment_methods
      WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL
    `,
    [userId, name.trim()],
  );

  if (existing.rows.length > 0) {
    throw new Error("Forma de pagamento ja existe");
  }

  const result = await client.query(
    `
      INSERT INTO payment_methods (user_id, name, accounts_enabled, is_default)
      VALUES ($1, $2, $3, FALSE)
      RETURNING *
    `,
    [userId, name.trim(), Boolean(accounts_enabled)],
  );

  return result.rows[0];
}

export async function createPaymentAccountForUser(
  userId,
  { name, payment_method_id = null },
  client = pool,
) {
  if (!name || !name.trim()) {
    throw new Error("Nome da conta e obrigatorio");
  }

  const existing = await client.query(
    `
      SELECT id
      FROM payment_accounts
      WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL
    `,
    [userId, name.trim()],
  );

  if (existing.rows.length > 0) {
    throw new Error("Conta ja existe");
  }

  const result = await client.query(
    `
      INSERT INTO payment_accounts (user_id, name)
      VALUES ($1, $2)
      RETURNING *
    `,
    [userId, name.trim()],
  );

  const paymentAccount = result.rows[0];

  if (payment_method_id) {
    const paymentMethod = await getPaymentMethodById(userId, payment_method_id, client);

    if (!paymentMethod) {
      throw new Error("Forma de pagamento nao encontrada");
    }

    const alreadyLinked = await isAccountLinkedToMethod(
      payment_method_id,
      paymentAccount.id,
      client,
    );

    if (!alreadyLinked) {
      await client.query(
        `
          INSERT INTO payment_method_accounts (payment_method_id, payment_account_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [payment_method_id, paymentAccount.id],
      );
    }
  }

  return paymentAccount;
}

export async function getPaymentMethodForUser(userId, paymentMethodId, client = pool) {
  return getPaymentMethodById(userId, paymentMethodId, client);
}

export async function getPaymentAccountForUser(userId, paymentAccountId, client = pool) {
  return getPaymentAccountById(userId, paymentAccountId, client);
}
