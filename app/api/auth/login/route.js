import { prisma } from "@/lib/prisma";

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role =
    typeof body?.role === "string" && body.role.trim()
      ? body.role.trim()
      : "Learner";

  if (!name || name.length > 100) {
    return jsonError("A name between 1 and 100 characters is required.", 400);
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return jsonError("A valid email address is required.", 400);
  }
  if (role.length > 80) {
    return jsonError("Role or subject must not exceed 80 characters.", 400);
  }

  try {
    const user = await prisma.user.upsert({
      where: { email },
      create: { name, email, role },
      update: { name, role },
      select: { id: true, name: true, email: true },
    });

    return Response.json({ user });
  } catch (error) {
    console.error("Failed to sign in or create an AuraLearn user.", error);
    return jsonError("Could not sign in. Please try again.", 500);
  }
}
