import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { ensureAuthSchema } from "@/lib/db";

const handler = toNextJsHandler(auth);

async function withSchema(
  req: Request,
  method: "GET" | "POST",
) {
  await ensureAuthSchema();
  return method === "GET" ? handler.GET(req) : handler.POST(req);
}

export async function GET(req: Request) {
  return withSchema(req, "GET");
}

export async function POST(req: Request) {
  return withSchema(req, "POST");
}
