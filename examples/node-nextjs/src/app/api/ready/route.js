export async function GET() {
  // Customize: add database/redis connectivity checks for production
  return Response.json({ status: "ready" });
}
