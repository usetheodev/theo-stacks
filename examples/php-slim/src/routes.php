<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;

/** @var App $app */

$app->get('/', function (Request $request, Response $response) {
    $payload = json_encode(['message' => 'Hello from Theo!']);
    $response->getBody()->write($payload);
    return $response->withHeader('Content-Type', 'application/json');
});

$app->get('/health', function (Request $request, Response $response) {
    $payload = json_encode(['status' => 'ok']);
    $response->getBody()->write($payload);
    return $response->withHeader('Content-Type', 'application/json');
});

$app->get('/ready', function (Request $request, Response $response) {
    // Customize: add database/redis connectivity checks for production
    $payload = json_encode(['status' => 'ready']);
    $response->getBody()->write($payload);
    return $response->withHeader('Content-Type', 'application/json');
});

$app->options('/{routes:.+}', function (Request $request, Response $response) {
    return $response;
});

$app->map(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], '/{routes:.+}', function (Request $request, Response $response) {
    $payload = json_encode(['error' => 'Not Found']);
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(404);
});
