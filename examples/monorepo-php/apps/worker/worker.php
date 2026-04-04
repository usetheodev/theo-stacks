<?php

declare(strict_types=1);

require __DIR__ . '/../../vendor/autoload.php';

use Shared\AppInfo;

$running = true;
$port = (int) (getenv('PORT') ?: 8001);

function jsonLog(string $level, string $message): void
{
    $entry = json_encode([
        'time' => date('c'),
        'level' => $level,
        'message' => $message,
    ]);
    fwrite(STDOUT, $entry . "\n");
}

pcntl_async_signals(true);

foreach ([SIGTERM, SIGINT] as $signal) {
    pcntl_signal($signal, function () use (&$running, $signal) {
        $name = $signal === SIGTERM ? 'SIGTERM' : 'SIGINT';
        jsonLog('INFO', "$name received, shutting down");
        $running = false;
    });
}

jsonLog('INFO', "Worker starting (v" . AppInfo::VERSION . ") on port $port");

// Health endpoint in a child process
$pid = pcntl_fork();
if ($pid === 0) {
    $socket = stream_socket_server("tcp://0.0.0.0:$port", $errno, $errstr);
    if (!$socket) {
        jsonLog('ERROR', "Could not start health server: $errstr");
        exit(1);
    }
    jsonLog('INFO', "Health server listening on port $port");

    while ($running) {
        $conn = @stream_socket_accept($socket, 1);
        if ($conn) {
            $request = fread($conn, 1024);
            if (str_contains($request, 'GET /ready')) {
                // Customize: add database/redis connectivity checks for production
                $body = json_encode(['status' => 'ready']);
            } else {
                $body = json_encode(['status' => 'ok']);
            }
            $response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " . strlen($body) . "\r\n\r\n$body";
            fwrite($conn, $response);
            fclose($conn);
        }
    }
    fclose($socket);
    exit(0);
}

// Main worker loop
while ($running) {
    jsonLog('INFO', 'Worker tick');
    sleep(10);
}

jsonLog('INFO', 'Worker stopped');
posix_kill($pid, SIGTERM);
pcntl_waitpid($pid, $status);
