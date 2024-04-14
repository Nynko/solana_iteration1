use anchor_lang::{prelude::*, solana_program::program};
use anchor_spl::{token_2022::spl_token_2022, token_interface::{Mint, TokenAccount, TokenInterface}};

use crate::{IdAccount, IdendityError};


// LastTx is used to store the last transaction timestamp 
// It will be used by the recovery functions to check if the last transaction was made within the timeframe specified by the user
// Each transaction needs to update the last_tx_timestamp
// The Idendity field "recovered_address" should be used if the account has been recovered.
#[account]
pub struct LastTx {
    pub last_tx_timestamp: i64, // 8
}


// An account has the right to designate any recovery authority to recover the account
// It can be an insurance company, a friend, a family member, a backup address... 
// Minimum signatures indicates the minimum number of signatures required to recover the account
#[account]
pub struct RecoveryAuthority {
    pub authorities: Vec<Pubkey>, // 4 + 32 * recovery_authorities.len()   
    pub minimum_signatures: u8, // 1
}


#[derive(Accounts)]
#[instruction(recovery_delegates :Vec<Pubkey>)]
pub struct InitializeRecovery<'info> {
    #[account(init, seeds = [b"last_tx", owner.key().as_ref()], bump, payer = payer, space = 8  + 8 + 1  )]  
    pub last_tx: Account<'info, LastTx>,
    #[account(init, seeds = [b"recovery_authority", owner.key().as_ref()], bump, payer = payer, space = 8 + 4 + 32 * recovery_delegates.len() + 1)]
    pub recovery_authority: Account<'info,RecoveryAuthority>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK:
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct RecoverAccount<'info> {
    #[account(mut)]
    pub new_owner : Signer<'info>,
    #[account(mut, token::authority = new_owner.key())]
    pub new_token_account: InterfaceAccount<'info,TokenAccount>,
    #[account(seeds = [b"recovery_authority", owner.key().as_ref()], bump)]
    pub recovery_authority: Account<'info,RecoveryAuthority>,
    #[account(seeds = [b"last_tx", owner.key().as_ref()], bump)]  
    pub last_tx: Account<'info, LastTx>,
    #[account(mut, seeds = [b"identity", token_account.key().as_ref()], bump, realloc = 80 + 49 * idendity.issuers.len() + 32, realloc::payer = new_owner, realloc::zero= false)]
    pub idendity: Account<'info,IdAccount>,
    /// CHECK: Account to recover
    pub owner: AccountInfo<'info>,
    #[account(mut, seeds = [b"mint"], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::authority = owner.key())]
    pub token_account : InterfaceAccount<'info,TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum RecoveryError {
    #[msg("Recovery time not passed")]
    RecoveryTimeNotPassed,
    #[msg("Not enough signatures")]
    NotEnoughSignatures
}


pub fn _initialize_recovery(
    ctx: Context<InitializeRecovery>, recovery_delegates: Vec<Pubkey>, minimum_signatures: u8 
) -> Result<()> {
    let last_tx = &mut ctx.accounts.last_tx;
    last_tx.last_tx_timestamp = Clock::get()?.unix_timestamp;

    let recovery_authority = &mut ctx.accounts.recovery_authority;
    recovery_authority.authorities = recovery_delegates;
    recovery_authority.minimum_signatures = minimum_signatures;

    Ok(())
}

pub fn _recovering_account(
    ctx: Context<RecoverAccount>,
) -> Result<()> {

    let recovery_authority = &ctx.accounts.recovery_authority;

    let signers : Vec<_> = ctx.remaining_accounts.iter().filter(|account| account.is_signer).collect();
    let mut number_of_signatures = 0;
    for authority in recovery_authority.authorities.iter() {
        if signers.iter().any(|signer| signer.key == authority) {
            number_of_signatures += 1;
        }
        if number_of_signatures >= recovery_authority.minimum_signatures {
            break;
        }
    }

    if number_of_signatures < recovery_authority.minimum_signatures {
        return Err(RecoveryError::NotEnoughSignatures.into());
    }

    let last_tx = &mut ctx.accounts.last_tx;
    let idendity = &mut ctx.accounts.idendity;

    if last_tx.last_tx_timestamp + 0 > Clock::get()?.unix_timestamp{
        return Err(RecoveryError::RecoveryTimeNotPassed.into());
    }
    if idendity.recovered_token_address.len() > 0 {
        return Err(IdendityError::IdendityAlreadyRecovered.into());
    }
    idendity.recovered_token_address.push(ctx.accounts.new_token_account.key().clone());

    let seeds :&[&[&[u8]]] = &[&[b"mint",&[ctx.bumps.mint]]];  

    let amount = ctx.accounts.token_account.amount;

    burn_tokens(&ctx, seeds, amount)?;
    mint_tokens(&ctx, seeds, amount)?;
    close_token_account(&ctx, seeds)?; // This will be optional: only possible with account that were created by this program 
    // or for which the program has the authority to close the account

    Ok(())
}

#[inline(always)]
pub fn burn_tokens(ctx: &Context<RecoverAccount>, seeds :&[&[&[u8]]],  amount: u64) -> Result<()> {
    let ix = spl_token_2022::instruction::burn(
        &spl_token_2022::id(),
        &ctx.accounts.token_account.key(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.mint.key(),
        &[],
        amount,
    )?;


    program::invoke_signed(&ix, &[
        ctx.accounts.token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ],
        seeds)?;
    Ok(())
}

#[inline(always)]
pub fn mint_tokens(ctx: &Context<RecoverAccount>, seeds :&[&[&[u8]]], amount: u64) -> Result<()> {

    let ix = spl_token_2022::instruction::mint_to(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.new_token_account.key(),
        &ctx.accounts.mint.key(),
        &[],
        amount,
    )?;

    program::invoke_signed(
        &ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.new_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        seeds,
    )?;
    Ok(())
}


#[inline(always)]
pub fn close_token_account(ctx: &Context<RecoverAccount>, seeds :&[&[&[u8]]]) -> Result<()> {
    let ix = spl_token_2022::instruction::close_account(
        &spl_token_2022::id(),
        &ctx.accounts.token_account.key(),
        &ctx.accounts.new_owner.key(),
        &ctx.accounts.mint.key(),
        &[],
    )?;

    program::invoke_signed(&ix, &[
        ctx.accounts.token_account.to_account_info(),
        ctx.accounts.new_owner.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ],
        seeds)?;
    Ok(())
}