<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Digital JD Trial Access Helper
|--------------------------------------------------------------------------
| Controls 7-day invite-link access for jd-demo.php and jd-brain.php
*/

function jd_access_data_file(): string
{
    return __DIR__ . '/jd-trials.json';
}

function jd_now_utc(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('UTC'));
}

function jd_load_trials(): array
{
    $file = jd_access_data_file();

    if (!file_exists($file)) {
        return ['tokens' => []];
    }

    $raw = file_get_contents($file);
    $decoded = json_decode($raw ?: '', true);

    if (!is_array($decoded) || !isset($decoded['tokens']) || !is_array($decoded['tokens'])) {
        return ['tokens' => []];
    }

    return $decoded;
}

function jd_save_trials(array $data): bool
{
    $file = jd_access_data_file();
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        return false;
    }

    return file_put_contents($file, $json, LOCK_EX) !== false;
}

function jd_clean_token(?string $token): string
{
    $token = trim((string)($token ?? ''));
    return preg_replace('/[^A-Za-z0-9_\-]/', '', $token) ?? '';
}

function jd_get_trial_token_from_request(): string
{
    if (!empty($_GET['trial'])) {
        return jd_clean_token((string)$_GET['trial']);
    }

    if (!empty($_POST['trial'])) {
        return jd_clean_token((string)$_POST['trial']);
    }

    if (!empty($_COOKIE['digital_jd_trial'])) {
        return jd_clean_token((string)$_COOKIE['digital_jd_trial']);
    }

    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);

    if (is_array($json) && !empty($json['trial'])) {
        return jd_clean_token((string)$json['trial']);
    }

    return '';
}

function jd_set_trial_cookie(string $token, ?string $expiresAtIso = null): void
{
    $expireTimestamp = 0;

    if ($expiresAtIso) {
        $dt = DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $expiresAtIso);
        if ($dt instanceof DateTimeImmutable) {
            $expireTimestamp = $dt->getTimestamp();
        }
    }

    if ($expireTimestamp <= 0) {
        $expireTimestamp = time() + (7 * 24 * 60 * 60);
    }

    setcookie(
        'digital_jd_trial',
        $token,
        [
            'expires' => $expireTimestamp,
            'path' => '/',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => false,
            'samesite' => 'Lax',
        ]
    );
}

function jd_format_remaining(string $expiresAtIso): string
{
    $expiresAt = DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $expiresAtIso);
    if (!$expiresAt) {
        return '';
    }

    $now = jd_now_utc();

    if ($expiresAt <= $now) {
        return 'Expired';
    }

    $diff = $now->diff($expiresAt);

    $days = (int)$diff->days;
    $hours = (int)$diff->h;

    if ($days > 0) {
        return $days . ' day' . ($days === 1 ? '' : 's') . ' remaining';
    }

    return $hours . ' hour' . ($hours === 1 ? '' : 's') . ' remaining';
}

function jd_validate_trial_token(string $token): array
{
if ($token === '') {
  return [
    'ok' => true,
    'status' => 'supabase_login_allowed',
    'message' => ''
  ];
}

    $data = jd_load_trials();

    if (empty($data['tokens'][$token]) || !is_array($data['tokens'][$token])) {
        return [
            'ok' => false,
            'status' => 'invalid',
            'message' => 'This trial link is invalid.'
        ];
    }

    $entry = $data['tokens'][$token];

    if (isset($entry['is_active']) && $entry['is_active'] === false) {
        return [
            'ok' => false,
            'status' => 'inactive',
            'message' => 'This trial link is no longer active.'
        ];
    }

    $now = jd_now_utc();
    $changed = false;

    if (empty($entry['first_used_at']) || empty($entry['expires_at'])) {
        $firstUsed = $now;
        $expiresAt = $now->modify('+7 days');

        $entry['first_used_at'] = $firstUsed->format(DateTimeInterface::ATOM);
        $entry['expires_at'] = $expiresAt->format(DateTimeInterface::ATOM);
        $data['tokens'][$token] = $entry;
        $changed = true;
    } else {
        $expiresAt = DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, (string)$entry['expires_at']);

        if (!$expiresAt) {
            return [
                'ok' => false,
                'status' => 'corrupt',
                'message' => 'This trial record is corrupted.'
            ];
        }

        if ($now > $expiresAt) {
            return [
                'ok' => false,
                'status' => 'expired',
                'message' => 'This 7-day trial has expired.',
                'entry' => $entry
            ];
        }
    }

    if ($changed) {
        jd_save_trials($data);
        $entry = $data['tokens'][$token];
    }

    jd_set_trial_cookie($token, $entry['expires_at'] ?? null);

    return [
        'ok' => true,
        'status' => 'active',
        'message' => 'Trial access granted.',
        'token' => $token,
        'entry' => $entry,
        'remaining' => !empty($entry['expires_at']) ? jd_format_remaining((string)$entry['expires_at']) : ''
    ];
}