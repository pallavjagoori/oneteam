<?php

declare(strict_types=1);

namespace OneTeam\Contract;

/**
 * The known starting data every contract test can rely on.
 *
 * Must match contract/fixtures/seed.rb for Chatwoot and OneTeam's equivalent seeder.
 */
final class Fixtures
{
    /**
     * Password shared by every fixture user.
     */
    public const PASSWORD = 'Contract-Pass-1!';

    /**
     * Administrator of the fixture account.
     */
    public const ADMIN_EMAIL = 'admin@contract.test';

    /**
     * Agent of the fixture account.
     */
    public const AGENT_EMAIL = 'agent@contract.test';

    /**
     * Name of the fixture account.
     */
    public const ACCOUNT_NAME = 'Contract Co';
}
