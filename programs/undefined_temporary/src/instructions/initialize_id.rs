use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(init, seeds = [b"identity", user.key().as_ref(), issuer.key().as_ref()], bump, payer = issuer, space = 8 + 32 + 32 + 8 + 8 + 1)]
    pub account: Account<'info,IdAccount>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct IdAccount {
    pub account: Pubkey, // 32
    pub issuer: Pubkey, // 32
    pub last_modified: u64, // 8
    pub expires_at: u64, // 8
    pub active: bool, // 1
}

#[error_code]
pub enum IdendityError {
    #[msg("Idendity already exists")]
    IdendityAlreadyExists,
    #[msg("Idendity is not active")]
    IdendityNotActive,
}



pub fn initialize_id(ctx: Context<Initialize>, user: Pubkey) -> Result<()> {
    let account = &mut ctx.accounts.account;
    account.account = user;
    account.issuer = *ctx.accounts.issuer.key;
    account.last_modified = 0;
    account.expires_at = 0;
    account.active = true;
    Ok(())
}
