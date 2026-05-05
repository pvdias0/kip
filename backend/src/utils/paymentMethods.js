import pool from "../config/database.js";

export const DEFAULT_PAYMENT_METHODS = [
  { name: "Crédito", accountsEnabled: true },
  { name: "Débito", accountsEnabled: true },
  { name: "Pix", accountsEnabled: true },
  { name: "Dinheiro", accountsEnabled: false },
  { name: "Transferência", accountsEnabled: false },
  { name: "Boleto", accountsEnabled: false },
];

export async function ensureDefaultPaymentMethodsForUser(
  userId,
  client = pool,
) {
  for (const method of DEFAULT_PAYMENT_METHODS) {
    await client.query(
      `
        INSERT INTO payment_methods (user_id, name, accounts_enabled, is_default)
        SELECT $1, $2, $3, TRUE
        WHERE NOT EXISTS (
          SELECT 1
          FROM payment_methods
          WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL
        )
      `,
      [userId, method.name, method.accountsEnabled],
    );
  }
}

export async function ensureDefaultPaymentMethodsForAllUsers(client = pool) {
  const result = await client.query("SELECT id FROM users ORDER BY id");

  for (const row of result.rows) {
    await ensureDefaultPaymentMethodsForUser(row.id, client);
  }
}

export async function getPaymentMethodsWithAccounts(userId, client = pool) {
  const methodsResult = await client.query(
    `
      SELECT
        pm.id,
        pm.user_id,
        pm.name,
        pm.accounts_enabled,
        pm.is_default,
        pm.created_at,
        pa.id AS account_id,
        pa.user_id AS account_user_id,
        pa.name AS account_name,
        pa.created_at AS account_created_at
      FROM payment_methods pm
      LEFT JOIN payment_method_accounts pma
        ON pma.payment_method_id = pm.id
      LEFT JOIN payment_accounts pa
        ON pa.id = pma.payment_account_id
        AND pa.deleted_at IS NULL
      WHERE pm.user_id = $1
        AND pm.deleted_at IS NULL
      ORDER BY LOWER(pm.name), LOWER(COALESCE(pa.name, ''))
    `,
    [userId],
  );

  const accountsResult = await client.query(
    `
      SELECT *
      FROM payment_accounts
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY LOWER(name)
    `,
    [userId],
  );

  const methodMap = new Map();

  for (const row of methodsResult.rows) {
    if (!methodMap.has(row.id)) {
      methodMap.set(row.id, {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        accounts_enabled: row.accounts_enabled,
        is_default: row.is_default,
        created_at: row.created_at,
        accounts: [],
      });
    }

    if (row.account_id) {
      methodMap.get(row.id).accounts.push({
        id: row.account_id,
        user_id: row.account_user_id,
        name: row.account_name,
        created_at: row.account_created_at,
      });
    }
  }

  return {
    paymentMethods: Array.from(methodMap.values()),
    paymentAccounts: accountsResult.rows,
  };
}

export async function getPaymentMethodById(userId, paymentMethodId, client = pool) {
  const result = await client.query(
    `
      SELECT *
      FROM payment_methods
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
    `,
    [paymentMethodId, userId],
  );

  return result.rows[0] || null;
}

export async function getPaymentAccountById(
  userId,
  paymentAccountId,
  client = pool,
) {
  const result = await client.query(
    `
      SELECT *
      FROM payment_accounts
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
    `,
    [paymentAccountId, userId],
  );

  return result.rows[0] || null;
}

export async function isAccountLinkedToMethod(
  paymentMethodId,
  paymentAccountId,
  client = pool,
) {
  const result = await client.query(
    `
      SELECT 1
      FROM payment_method_accounts
      WHERE payment_method_id = $1 AND payment_account_id = $2
    `,
    [paymentMethodId, paymentAccountId],
  );

  return result.rows.length > 0;
}

export async function validatePaymentSelection({
  userId,
  paymentMethodId,
  paymentAccountId,
  client = pool,
}) {
  if (!paymentMethodId) {
    return {
      ok: false,
      status: 400,
      message: "Forma de pagamento é obrigatória",
    };
  }

  const paymentMethod = await getPaymentMethodById(userId, paymentMethodId, client);

  if (!paymentMethod) {
    return {
      ok: false,
      status: 404,
      message: "Forma de pagamento não encontrada",
    };
  }

  if (!paymentMethod.accounts_enabled) {
    if (paymentAccountId) {
      return {
        ok: false,
        status: 400,
        message: "A forma de pagamento selecionada não usa contas",
      };
    }

    return {
      ok: true,
      paymentMethod,
      paymentAccount: null,
      normalizedPaymentAccountId: null,
    };
  }

  if (!paymentAccountId) {
    return {
      ok: false,
      status: 400,
      message: "Conta da forma de pagamento é obrigatória",
    };
  }

  const paymentAccount = await getPaymentAccountById(
    userId,
    paymentAccountId,
    client,
  );

  if (!paymentAccount) {
    return {
      ok: false,
      status: 404,
      message: "Conta da forma de pagamento não encontrada",
    };
  }

  const isLinked = await isAccountLinkedToMethod(
    paymentMethodId,
    paymentAccountId,
    client,
  );

  if (!isLinked) {
    return {
      ok: false,
      status: 400,
      message: "A conta selecionada não está vinculada à forma de pagamento",
    };
  }

  return {
    ok: true,
    paymentMethod,
    paymentAccount,
    normalizedPaymentAccountId: paymentAccountId,
  };
}
