FROM php:8.2-cli
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock* ./
COPY packages/shared ./packages/shared
RUN composer install --no-dev --optimize-autoloader
COPY . .
EXPOSE 8001
CMD ["php", "apps/worker/worker.php"]
