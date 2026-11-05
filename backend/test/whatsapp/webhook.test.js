import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from "../../src/controllers/whatsappController.js";

afterEach(() => mock.restoreAll());

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.send = (body) => ((res.body = body), res);
  return res;
}

function fakeReq({ query = {}, body = {}, rawBody, headers = {} } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ip: "127.0.0.1",
    query,
    body,
    rawBody: rawBody ?? JSON.stringify(body),
    get: (name) => lower[name.toLowerCase()],
  };
}

const sign = (raw, secret) => "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");

describe("GET /webhook (verificacao)", () => {
  test("responde o challenge com token correto", async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "segredo";
    const res = fakeRes();
    await verifyWhatsAppWebhook(
      fakeReq({ query: { "hub.mode": "subscribe", "hub.verify_token": "segredo", "hub.challenge": "42" } }),
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, "42");
  });

  test("rejeita token errado", async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "segredo";
    const res = fakeRes();
    await verifyWhatsAppWebhook(
      fakeReq({ query: { "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "42" } }),
      res,
    );
    assert.equal(res.statusCode, 403);
  });

  test(
    "com WHATSAPP_WEBHOOK_VERIFY_TOKEN vazio, token vazio nao deveria ser aceito",
    async () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "";
      const res = fakeRes();
      await verifyWhatsAppWebhook(
        fakeReq({ query: { "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "42" } }),
        res,
      );
      assert.notEqual(res.statusCode, 200);
    },
  );
});

describe("POST /webhook (assinatura)", () => {
  test("503 sem app secret", async () => {
    process.env.WHATSAPP_APP_SECRET = "";
    const res = fakeRes();
    await receiveWhatsAppWebhook(fakeReq({ body: { object: "whatsapp_business_account" } }), res);
    assert.equal(res.statusCode, 503);
  });

  test("401 sem assinatura ou com assinatura invalida", async () => {
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    const body = { object: "whatsapp_business_account", entry: [] };

    const res1 = fakeRes();
    await receiveWhatsAppWebhook(fakeReq({ body }), res1);
    assert.equal(res1.statusCode, 401);

    const res2 = fakeRes();
    await receiveWhatsAppWebhook(
      fakeReq({ body, headers: { "x-hub-signature-256": sign(JSON.stringify(body), "outro") } }),
      res2,
    );
    assert.equal(res2.statusCode, 401);
  });

  test("assinatura valida sobre o corpo cru e aceita (payload sem entradas)", async () => {
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    const body = { object: "whatsapp_business_account", entry: [] };
    const raw = JSON.stringify(body);
    const res = fakeRes();
    await receiveWhatsAppWebhook(
      fakeReq({ body, rawBody: raw, headers: { "x-hub-signature-256": sign(raw, "app-secret") } }),
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.storedEvents, 0);
  });
});
