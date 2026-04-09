import type { NextRequest } from "next/server";

const items = [
  { id: 1, name: "First item" },
  { id: 2, name: "Second item" },
  { id: 3, name: "Third item" },
];

export async function GET() {
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json(
        { error: "Field 'name' is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const newItem = { id: items.length + 1, name: body.name.trim() };
    items.push(newItem);
    return Response.json(newItem, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
