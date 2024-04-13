use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

use crate::{IdAccount, IdendityError};


// LastTx is used to store the last transaction timestamp 
// It will be used by the recovery functions to check if the last transaction was made within the timeframe specified by the user
// Each transaction needs to update the last_tx_timestamp
// The Idendity field "recovered_address" should be used if the account has been frozen (recovered)
#[account]
pub struct LastTx {
    pub last_tx_timestamp: i64,
}


#[derive(Accounts)]
pub struct InitializeRecovery<'info> {
    #[account(init, seeds = [b"last_tx", owner.key().as_ref()], bump, payer = payer, space = 8  + 8 + 1  )]  
    pub last_tx: Account<'info, LastTx>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK:
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct RecoverAccount<'info> {
    #[account(mut)]
    pub recoverer: Signer<'info>, // How to do multisig ? 
    /// CHECK: Account to recover
    pub new_owner : AccountInfo<'info>,
    #[account(token::authority = new_owner.key())]
    pub new_token_account: InterfaceAccount<'info,TokenAccount>,
    #[account(seeds = [b"last_tx", owner.key().as_ref()], bump)]  
    pub last_tx: Account<'info, LastTx>,
    #[account(mut, seeds = [b"identity", token_account.key().as_ref()], bump, realloc = 80 + 49 * idendity.issuers.len() + 32, realloc::payer = recoverer, realloc::zero= false)]
    pub idendity: Account<'info,IdAccount>,
    /// CHECK:
    pub owner: AccountInfo<'info>,
    #[account(token::authority = owner.key())]
    pub token_account : InterfaceAccount<'info,TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum RecoveryError {
    #[msg("Recovery time not passed")]
    RecoveryTimeNotPassed,
}


pub fn initialize_recovery(
    ctx: Context<InitializeRecovery>,
) -> Result<()> {
    let last_tx = &mut ctx.accounts.last_tx;
    last_tx.last_tx_timestamp = Clock::get()?.unix_timestamp;
    Ok(())
}

pub fn recovering_account(
    ctx: Context<RecoverAccount>,
) -> Result<()> {

    let last_tx = &mut ctx.accounts.last_tx;
    let idendity = &mut ctx.accounts.idendity;

    if last_tx.last_tx_timestamp + 0 > Clock::get()?.unix_timestamp{
        return Err(RecoveryError::RecoveryTimeNotPassed.into());
    }
    if idendity.recovered_token_address.len() > 0 {
        return Err(IdendityError::IdendityAlreadyRecovered.into());
    }
    idendity.recovered_token_address.push(ctx.accounts.new_token_account.key().clone());
    Ok(())
}