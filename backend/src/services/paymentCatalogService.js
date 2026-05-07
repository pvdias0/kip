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

export async function updatePaymentMethodForUser(
  userId,
  paymentMethodId,
  { name, accounts_enabled },
  client = pool,
) {
  const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, client);

  if (!paymentMethod) {
    throw new Error("Forma de pagamento nao encontrada");
  }

  if (
    typeof name === "string" &&
    name.trim() &&
    paymentMethod.is_default &&
    name.trim().toLowerCase() !== paymentMethod.name.toLowerCase()
  ) {
    throw new Error("Formas de pagamento padrao nao podem ser renomeadas");
  }

  if (typeof name === "string" && name.trim()) {
    const duplicate = await client.query(
      `
        SELECT id
        FROM payment_methods
        WHERE user_id = $1
          AND LOWER(name) = LOWER($2)
          AND id <> $3
          AND deleted_at IS NULL
      `,
      [userId, name.trim(), paymentMethodId],
    );

    if (duplicate.rows.length > 0) {
      throw new Error("Ja existe uma forma de pagamento com esse nome");
    }
  }

  const nextName =
    typeof name === "string" && name.trim() ? name.trim() : paymentMethod.name;
  const nextAccountsEnabled =
    typeof accounts_enabled === "boolean"
      ? accounts_enabled
      : paymentMethod.accounts_enabled;

  const result = await client.query(
    `
      UPDATE payment_methods
      SET name = $1, accounts_enabled = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `,
    [nextName, nextAccountsEnabled, paymentMethodId, userId],
  );

  return result.rows[0];
}

export async function deletePaymentMethodForUser(
  userId,
  paymentMethodId,
  client = pool,
) {
  const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, client);

  if (!paymentMethod) {
    throw new Error("Forma de pagamento nao encontrada");
  }

  if (paymentMethod.is_default) {
    throw new Error("Formas de pagamento padrao nao podem ser deletadas");
  }

  await client.query(
    `
      UPDATE payment_methods
      SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2
    `,
    [paymentMethodId, userId],
  );

  return paymentMethod;
}

export async function updatePaymentAccountForUser(
  userId,
  paymentAccountId,
  { name },
  client = pool,
) {
  const paymentAccount = await getPaymentAccountById(userId, paymentAccountId, client);

  if (!paymentAccount) {
    throw new Error("Conta nao encontrada");
  }

  if (!name || !name.trim()) {
    throw new Error("Nome da conta e obrigatorio");
  }

  const duplicate = await client.query(
    `
      SELECT id
      FROM payment_accounts
      WHERE user_id = $1
        AND LOWER(name) = LOWER($2)
        AND id <> $3
        AND deleted_at IS NULL
    `,
    [userId, name.trim(), paymentAccountId],
  );

  if (duplicate.rows.length > 0) {
    throw new Error("Ja existe uma conta com esse nome");
  }

  const result = await client.query(
    `
      UPDATE payment_accounts
      SET name = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `,
    [name.trim(), paymentAccountId, userId],
  );

  return result.rows[0];
}

export async function deletePaymentAccountForUser(
  userId,
  paymentAccountId,
  client = pool,
) {
  const paymentAccount = await getPaymentAccountById(userId, paymentAccountId, client);

  if (!paymentAccount) {
    throw new Error("Conta nao encontrada");
  }

  await client.query(
    `
      UPDATE payment_accounts
      SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2
    `,
    [paymentAccountId, userId],
  );

  return paymentAccount;
}

export async function getPaymentMethodForUser(userId, paymentMethodId, client = pool) {
  return getPaymentMethodById(userId, paymentMethodId, client);
}

export async function getPaymentAccountForUser(userId, paymentAccountId, client = pool) {
  return getPaymentAccountById(userId, paymentAccountId, client);
}
