require "json"
require "webrick"
require_relative "../../packages/shared/shared"

logger = Shared.json_logger
running = true
port = ENV.fetch("PORT", 4568).to_i

# Health check server
health_server = WEBrick::HTTPServer.new(
  Port: port,
  BindAddress: "0.0.0.0",
  Logger: WEBrick::Log.new("/dev/null"),
  AccessLog: []
)

health_server.mount_proc "/health" do |_req, res|
  res.content_type = "application/json"
  res.body = { status: "ok" }.to_json
end

# Readiness probe — customize: add database/redis checks for production
health_server.mount_proc "/ready" do |_req, res|
  res.content_type = "application/json"
  res.body = { status: "ready" }.to_json
end

# Signal handlers
["TERM", "INT"].each do |signal|
  Signal.trap(signal) do
    logger.info "#{signal} received, shutting down"
    running = false
    health_server.shutdown
  end
end

# Start health server in a thread
health_thread = Thread.new { health_server.start }

logger.info "Worker started, health on port #{port}"

# Main tick loop
while running
  logger.info "worker tick"
  sleep 10
end

health_thread.join
logger.info "Worker stopped"
