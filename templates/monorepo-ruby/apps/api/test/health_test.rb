require "minitest/autorun"
require "rack/test"
require_relative "../app"

class HealthTest < Minitest::Test
  include Rack::Test::Methods

  def app
    App
  end

  def test_health_returns_ok
    get "/health"
    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal "ok", body["status"]
  end

  def test_ready_returns_ready
    get "/ready"
    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal "ready", body["status"]
  end
end
