const items = [
  { id: 1, name: "First item" },
  { id: 2, name: "Second item" },
  { id: 3, name: "Third item" },
];

export async function GET() {
  return Response.json({ items });
}

export async function POST(request) {
  const body = await request.json();
  const newItem = { id: items.length + 1, name: body.name };
  items.push(newItem);
  return Response.json(newItem, { status: 201 });
}
