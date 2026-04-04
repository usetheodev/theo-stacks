FROM ruby:3.2-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY Gemfile Gemfile.lock* ./
RUN bundle install --without development test
COPY . .
EXPOSE 4568
CMD ["ruby", "apps/worker/worker.rb"]
