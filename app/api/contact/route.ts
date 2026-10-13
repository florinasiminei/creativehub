import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit } from "@/lib/rateLimit";

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: "contact" });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Prea multe cereri. Incearca din nou peste cateva minute." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.name !== 'string' || typeof body.contact !== 'string' || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Cerere invalida.' }, { status: 400 });
    }
    const name = body.name.trim();
    const contact = body.contact.trim();
    const message = body.message.trim();

    if (name.length > 120 || contact.length > 254 || message.length > 5000 || /[\r\n]/.test(name + contact)) {
      return NextResponse.json({ error: 'Datele introduse sunt prea lungi sau invalide.' }, { status: 400 });
    }

    if (!name || !contact || !message) {
      return NextResponse.json({ error: "Completeaza toate campurile." }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = toNumber(process.env.SMTP_PORT, 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    const to = process.env.CONTACT_EMAIL_TO || "marketing@cabn.ro";

    if (!host || !user || !pass || !from) {
      return NextResponse.json(
        { error: "Serverul nu este configurat pentru trimitere email." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `Mesaj nou contact - ${name}`;
    const text = `Nume: ${name}\nContact: ${contact}\n\nMesaj:\n${message}\n`;

    const replyTo = /^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/.test(contact) ? contact : undefined;

    await transporter.sendMail({
      from,
      to,
      replyTo,
      subject,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Eroare la trimiterea mesajului." }, { status: 500 });
  }
}
