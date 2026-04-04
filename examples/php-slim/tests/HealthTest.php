<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class HealthTest extends TestCase
{
    public function testHealthRouteExists(): void
    {
        $routes = file_get_contents(__DIR__ . '/../src/routes.php');
        $this->assertStringContainsString('/health', $routes);
        $this->assertStringContainsString('"ok"', $routes);
    }

    public function testReadyRouteExists(): void
    {
        $routes = file_get_contents(__DIR__ . '/../src/routes.php');
        $this->assertStringContainsString('/ready', $routes);
        $this->assertStringContainsString('"ready"', $routes);
    }
}
