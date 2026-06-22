type BotClinicaSendMessageInput = {
  number: string;
  message: string;
};

type BotClinicaSendMessageResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

function getBotClinicaUrl() {
  const url = process.env.BOT_CLINICA_URL?.trim();
  if (!url) {
    throw new Error("BOT_CLINICA_URL is not defined");
  }
  return url.replace(/\/+$/, "");
}

function getBotClinicaToken() {
  const token = process.env.BOT_CLINICA_TOKEN?.trim();
  if (!token) {
    throw new Error("BOT_CLINICA_TOKEN is not defined");
  }
  return token;
}

export async function sendBotClinicaMessage(payload: BotClinicaSendMessageInput): Promise<BotClinicaSendMessageResult> {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.BOT_CLINICA_TIMEOUT_MS ?? 15000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBotClinicaUrl()}/send-message`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getBotClinicaToken()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = text;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    } else {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}
