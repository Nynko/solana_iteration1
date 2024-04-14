use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct InitializeId<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(init, seeds = [b"identity", token_account.key().as_ref()], bump, payer = issuer, space = 8 + 32 + 32 + 4 + 49 + 4)]
    pub idendity: Account<'info,IdAccount>,
    /// CHECK:
    pub owner: AccountInfo<'info>,
    #[account(token::authority = owner.key())]
    pub token_account : InterfaceAccount<'info,TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddIssuer<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(seeds = [b"identity", token_account.key().as_ref()], bump)] // TODO: Add reallocate
    pub idendity: Account<'info, IdAccount>,
    /// CHECK:
    pub owner: AccountInfo<'info>,
    #[account(token::authority = owner.key())]
    pub token_account : InterfaceAccount<'info,TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}


#[account]
pub struct IdAccount { // 8 + 68 + issuers.len() * 49  + 4 + optional(1* 32)
    pub owner: Pubkey, // 32
    pub token_account: Pubkey, // 32
    pub issuers: Vec<Issuer>, // 4 + 1* 49
    pub recovered_token_address: Vec<Pubkey>, // 4 + optional(1* 32) We do this to only have to pay 4 bytes most of the time // TODO: maybe do manually for cheaper
    // recovered_address is the token account address of the new owner for this token
}
// The Idendity field "recovered_address" should be used if the account has been frozen (recovered)


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Issuer { // Total 49
    pub key: Pubkey, // 32
    pub last_modified: i64, // 8
    pub expires_at: i64, // 8
    pub active: bool, // 1
}

#[error_code]
pub enum IdendityError {
    #[msg("Idendity already exists")]
    IdendityAlreadyExists,
    #[msg("Idendity is not active")]
    IdendityNotActive,
    #[msg("Idendity expired")]
    IdendityExpired,
    #[msg("Idendity recovered")]
    IdendityRecovered,
    #[msg("Idendity already recovered")]
    IdendityAlreadyRecovered,
}



pub fn _initialize_id(ctx: Context<InitializeId>, id_validity_duration: i64) -> Result<()> {
    let clock = Clock::get()?;
    let idendity = &mut ctx.accounts.idendity;
    idendity.owner = ctx.accounts.owner.key().clone();
    idendity.token_account = ctx.accounts.token_account.key().clone();

    let issuer = Issuer {
        key: ctx.accounts.issuer.key().clone(),
        last_modified: clock.unix_timestamp,
        expires_at: clock.unix_timestamp + id_validity_duration,
        active: true,
    };
    idendity.issuers =  vec![issuer];
    Ok(())
}


pub fn _add_issuer(ctx: Context<AddIssuer>, id_validity_duration: i64) -> Result<()> {

    // Check if the issuer is in the list of authorized issuers or if they have a signature or smth like that

    let issuers = &mut ctx.accounts.idendity.issuers;
    if issuers.iter().any(|i| i.key == ctx.accounts.issuer.key()){
        return Err(IdendityError::IdendityAlreadyExists.into());
    }
    let current_timestamp = Clock::get()?.unix_timestamp;
    let new_issuer = Issuer {
        key: ctx.accounts.issuer.key().clone(),
        last_modified: current_timestamp,
        expires_at: current_timestamp + id_validity_duration,
        active: true,
    };
    issuers.push(new_issuer);

    Ok(())
}