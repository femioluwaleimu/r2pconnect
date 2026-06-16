<?php
declare(strict_types=1);

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow', true);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>R2P Connect API</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --brand: #0f766e;
      --border: #e2e8f0;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #020617;
        --card: #0f172a;
        --text: #f8fafc;
        --muted: #94a3b8;
        --border: #1e293b;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
    }

    main {
      width: min(100%, 520px);
      padding: 32px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card);
      text-align: center;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.2;
    }

    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .badge {
      display: inline-block;
      margin-bottom: 16px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.12);
      color: var(--brand);
      font-size: 13px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <div class="badge">This is R2P Connect</div>
    <h1>R2P Connect Service</h1>
    <p>Go to the <a href="https://r2pconnect.com/">Homepage</a>.</p>
  </main>
</body>
</html>
