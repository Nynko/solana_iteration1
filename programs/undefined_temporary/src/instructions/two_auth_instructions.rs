use anchor_lang::{
    prelude::*,
    solana_program::{program, pubkey, system_instruction},
};
use anchor_spl::token_interface::{Mint, TokenAccount};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TwoAuthFunction {
    // 1 + MAX(all fields)  = 1 + 8 + space(Duration) = 9 + 2 = 11
    Always,
    Never,
    OnMax {
        max: u64,
    },
    Random,
    CounterResetOnMax {
        max: u64,
    },
    CounterResetOnTime {
        // Usually the time is a day
        max: u64,
        time: Duration,
    },
    CounterWithTimeWindow {
        // Usually the time is a day
        max: u64,
        time: Duration,
    },
    DeactivateForGeneralWhiteList, // This white list is derived from the receiver token-account address: the insurance has to add their addresss to the white list (to white list the receiver token account)
    DeactivateForUserSpecificWhiteList, // This is user specific and derived from user and receiver token-account address
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Duration {
    // Space = 1 + 1 = 2
    Seconds(u8),
    Minutes(u8),
    Hours(u8),
    Days(u8),
    Weeks(u8),
}

#[account]
pub struct TwoAuthParameters {
    pub functions: Vec<TwoAuthFunction>, // 4 + 11* len
    pub two_auth_entity: Pubkey,         // 32 - Also called Insurance
    pub allowed_issuers: Vec<Pubkey>,    // 4 + 32 * len
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TransactionRepresentation {
    // 32 + 32 + 8 + 8 = 80
    pub source: Pubkey,      // 32
    pub destination: Pubkey, // 32
    pub amount: u64,         // 8
    pub time: i64,           // 8
}

#[account]
pub struct TransactionAproval {
    pub transaction: TransactionRepresentation, // 80
    pub active: bool,                           // 1
}

#[derive(Accounts)]
#[instruction(functions: Vec<TwoAuthFunction>, allowed_issuers: Vec<Pubkey>)]
pub struct InitializeTwoAuth<'info> {
    #[account(init, seeds=[b"two_auth", token_account.key().as_ref()], bump, payer=owner, space=8 +  4 + 11 * functions.len() + 32 + 4 + 32 * allowed_issuers.len())]
    pub two_auth_parameters: Account<'info, TwoAuthParameters>,
    #[account(init, seeds=[b"transaction_approval", owner.key().as_ref()], bump, payer=owner, space= 8 + 81 )]
    pub transaction_approval: Account<'info, TransactionAproval>,
    pub two_auth_entity: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"mint"], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveTransaction<'info> {
    #[account(seeds=[b"two_auth", token_account.key().as_ref()], bump)]
    pub two_auth_parameters: Account<'info, TwoAuthParameters>,
    #[account(mut, seeds=[b"transaction_approval", owner.key().as_ref()], bump)]
    pub transaction_approval: Account<'info, TransactionAproval>,
    #[account(mut)]
    pub approver: Signer<'info>,
    #[account(seeds = [b"mint"], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    ///  CHECK : Owner of the token account
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum TwoAuthError {
    #[msg("Not authorized to approve this transaction")]
    NotAuthorized,
    #[msg("The Approval has expired")]
    ExpiredApproval,
}

pub fn _initialize_two_auth(
    ctx: Context<InitializeTwoAuth>,
    functions: Vec<TwoAuthFunction>,
    allowed_issuers: Vec<Pubkey>,
) -> Result<()> {
    let two_auth_parameters = &mut ctx.accounts.two_auth_parameters;
    two_auth_parameters.functions = functions;
    two_auth_parameters.two_auth_entity = ctx.accounts.two_auth_entity.key();
    two_auth_parameters.allowed_issuers = allowed_issuers;

    Ok(())
}

pub fn _approve_transaction(
    ctx: Context<ApproveTransaction>,
    transaction: TransactionRepresentation,
) -> Result<()> {
    let two_auth_parameters = &ctx.accounts.two_auth_parameters;
    let two_auth_entity = &two_auth_parameters.two_auth_entity;
    let approver = &ctx.accounts.approver.key();

    if !two_auth_entity.eq(approver) {
        return Err(TwoAuthError::NotAuthorized.into());
    }

    let transaction_approval = &mut ctx.accounts.transaction_approval;
    transaction_approval.transaction = transaction;
    transaction_approval.active = true;
    Ok(())
}

// Functions from TwoAuthFunction

/*
    Returns true if there is need for two auth
*/
pub fn apply_two_auth_functions(amount: u64, functions: &Vec<TwoAuthFunction>) -> bool {
    return functions
        .iter()
        .all(|function| match_functions(amount, function));
}

pub fn match_functions(amount: u64, function: &TwoAuthFunction) -> bool {
    match function {
        TwoAuthFunction::Always => true,
        TwoAuthFunction::Never => false,
        TwoAuthFunction::OnMax { max } => amount >= *max,
        _ => true,
    }
}

pub fn on_max(amount: u64, max: u64) -> bool {
    if amount >= max {
        return true;
    } else {
        return false;
    }
}
