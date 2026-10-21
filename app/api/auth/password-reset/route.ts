import { NextResponse, type NextRequest } from "next/server";
import { completeReset, inspectResetLink, issueResetLink, passwordResetRequestMessage } from "@/lib/password-reset";
import { passwordResetBackend, sendPasswordResetEmail } from "@/lib/password-reset-server";

export const runtime = "nodejs";
const responseHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: responseHeaders });

function publicOrigin() {
  try { const configured = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tadiff.com"); if (configured.protocol === "https:") return configured.origin; } catch { /* Repli sur le domaine public connu. */ }
  return "https://tadiff.com";
}

function sameOrigin(request: NextRequest) {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    if (origin.host !== request.headers.get("host")) return false;
    const hosts = [new URL(publicOrigin()).host, "tadiff.com", "www.tadiff.com", process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean);
    if (origin.protocol === "https:" && hosts.includes(origin.host)) return true;
    return !process.env.VERCEL && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ message: "Cette demande doit être faite depuis TaDiff." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ message: "Demande invalide." }, 400);
  if (Number(request.headers.get("content-length")) > 4096) return reply({ message: "Demande trop longue." }, 413);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return reply({ message: "Demande trop longue." }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return reply({ message: "Demande invalide." }, 400); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ message: "Demande invalide." }, 400);
    const backend = passwordResetBackend();
    if (input.action === "inspect") return reply(await inspectResetLink(backend, input.token));
    if (input.action === "complete") return reply(await completeReset(backend, input.token, input.password, input.confirmPassword));
    if (input.action === "request") {
      if (typeof input.email !== "string" || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return reply({ message: "Entrez une adresse email valide." }, 400);
      if (!process.env.RESEND_API_KEY) return reply({ message: "L’envoi du lien est momentanément indisponible. Réessayez plus tard." }, 503);
      const link = await issueResetLink(backend, input.email, publicOrigin());
      if (link) await sendPasswordResetEmail(link.email, link.url);
      return reply({ message: passwordResetRequestMessage }, 202);
    }
    return reply({ message: "Demande invalide." }, 400);
  } catch {
    return reply({ message: "La demande n’a pas pu aboutir. Réessayez dans un instant." }, 503);
  }
}
