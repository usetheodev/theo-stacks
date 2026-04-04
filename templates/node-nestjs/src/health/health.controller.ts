import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  check() {
    return { status: "ok" };
  }

  // Readiness probe — customize: add database/redis checks for production
  @Get("ready")
  ready() {
    return { status: "ready" };
  }
}
