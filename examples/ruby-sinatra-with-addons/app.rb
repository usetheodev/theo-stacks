require "sinatra/base"
require "json"
require "logger"

class App < Sinatra::Base
  set :port, ENV.fetch("PORT", 4567).to_i
  set :bind, "0.0.0.0"
  set :logging, true
  set :show_exceptions, false

  logger = Logger.new($stdout)
  logger.formatter = proc do |severity, datetime, _progname, msg|
    %({"time":"#{datetime.iso8601}","level":"#{severity}","message":"#{msg}"}\n)
  end

  before do
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    content_type :json
    logger.info "#{request.request_method} #{request.path_info}"
  end

  options "*" do
    204
  end

  get "/" do
    { message: "Hello from Theo!" }.to_json
  end

  get "/health" do
    { status: "ok" }.to_json
  end

  # Readiness probe — customize: add database/redis checks for production
  get "/ready" do
    { status: "ready" }.to_json
  end

  not_found do
    { error: "Not Found" }.to_json
  end

  error do
    logger.error "Unhandled exception: #{env['sinatra.error'].message}"
    status 500
    { error: "Internal Server Error" }.to_json
  end
end
