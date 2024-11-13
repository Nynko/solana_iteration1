use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

use crate::{
    apply_two_auth_functions, IdAccount, IdendityError, LastTx, TransactionAproval, TwoAuthError,
    TwoAuthParameters,
};

#[derive(Accounts)]

pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK: ExtraAccountMetaList Account, must use these seeds
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    // #[account(seeds = [b"mint"],bump)]
    /// CHECK:
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>, // 0
    pub mint: InterfaceAccount<'info, Mint>, // 1
    #[account(
        token::mint = mint,
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>, // 2
    /// CHECK: source token account owner, can be SystemAccount or PDA owned by another program
    pub owner: UncheckedAccount<'info>, // 3
    /// CHECK: ExtraAccountMetaList Account, must use these seeds
    #[account(
    seeds = [b"extra-account-metas", mint.key().as_ref()],
    bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>, // 4
    #[account(seeds = [b"identity", source_token.key().as_ref()], bump)]
    pub idendity_sender: Account<'info, IdAccount>, // 5
    #[account(seeds = [b"identity", destination_token.key().as_ref()], bump)]
    pub idendity_receiver: Account<'info, IdAccount>, // 6
    #[account(seeds = [b"last_tx", owner.key().as_ref()], bump)]
    pub last_tx: Account<'info, LastTx>, // 7
    #[account(seeds=[b"two_auth", source_token.key().as_ref()], bump)]
    pub two_auth: Account<'info, TwoAuthParameters>, // 8
    #[account(seeds=[b"transaction_approval", owner.key().as_ref()], bump)]
    pub transaction_approval: Account<'info, TransactionAproval>, // 9
                                             // CHECK: destination token account owner
                                             // pub destination_owner: UncheckedAccount<'info>, // 8
}

pub fn _initialize_extra_account_meta_list(
    ctx: Context<InitializeExtraAccountMetaList>,
) -> Result<()> {
    // List of issuers

    let account_metas = vec![
        // Sender Idendity
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"identity".to_vec(),
                },
                Seed::AccountKey { index: 0 },
            ],
            false, // is_signer
            false, // is_writable
        )?,
        // Receiver Idendity
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"identity".to_vec(),
                },
                Seed::AccountKey { index: 2 },
            ],
            false, // is_signer
            false, // is_writable
        )?,
        // LasTx PDA
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"last_tx".to_vec(),
                },
                Seed::AccountKey { index: 3 },
            ],
            false, // is_signer
            true,  // is_writable
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"two_auth".to_vec(),
                },
                Seed::AccountKey { index: 0 },
            ],
            false, // is_signer
            false, // is_writable
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"transaction_approval".to_vec(),
                },
                Seed::AccountKey { index: 3 },
            ],
            false, // is_signer
            true,  // is_writable
        )?,
    ];

    // calculate account size
    let account_size = ExtraAccountMetaList::size_of(account_metas.len())? as u64;
    // calculate minimum required lamports
    let lamports = Rent::get()?.minimum_balance(account_size as usize);

    let mint = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"extra-account-metas",
        &mint.as_ref(),
        &[ctx.bumps.extra_account_meta_list],
    ]];

    // create ExtraAccountMetaList account
    create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.extra_account_meta_list.to_account_info(),
            },
        )
        .with_signer(signer_seeds),
        lamports,
        account_size,
        ctx.program_id,
    )?;

    // initialize ExtraAccountMetaList account with extra accounts
    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
        &account_metas,
    )?;

    Ok(())
}

pub fn _transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    msg!("amount: {:?}", amount);

    let two_auth = &ctx.accounts.two_auth;
    two_auth.two_auth_entity;

    msg!("Two Auth Entity: {:?}", two_auth.two_auth_entity);

    // let ix = instructions_sysvar_module::load_instruction_at_checked(
    //     EXPECTED_IX_SYSVAR_INDEX,
    //     &ctx.accounts.instructions_sysvar,
    // )?;

    // Check if seed is proper one for the account
    // Check if issuer is authorized

    check_idendities(&ctx)?;
    check_not_recovered(&ctx)?;

    let need_two_auth = need_two_auth(&ctx, amount);
    if need_two_auth {
        msg!("Need two auth");
        check_approval(&ctx, amount)?;
        let transaction_approval = &mut ctx.accounts.transaction_approval;
        transaction_approval.active = false;
    }

    let last_tx = &mut ctx.accounts.last_tx;
    last_tx.last_tx_timestamp = Clock::get()?.unix_timestamp;

    Ok(())
}

#[inline(always)]
pub fn check_idendities(ctx: &Context<TransferHook>) -> Result<()> {
    let issuer = &ctx.accounts.idendity_sender.issuers[0]; // Todo proper check of issuer
    if issuer.active == false {
        return Err(IdendityError::IdendityNotActive.into());
    }
    if issuer.expires_at < Clock::get()?.unix_timestamp {
        return Err(IdendityError::IdendityExpired.into());
    }

    let receiver_id_issuer = &ctx.accounts.idendity_receiver.issuers[0];
    if receiver_id_issuer.active == false {
        return Err(IdendityError::IdendityNotActive.into());
    }
    if receiver_id_issuer.expires_at < Clock::get()?.unix_timestamp {
        return Err(IdendityError::IdendityExpired.into());
    }
    Ok(())
}

#[inline(always)]
pub fn check_not_recovered(ctx: &Context<TransferHook>) -> Result<()> {
    if ctx.accounts.idendity_sender.recovered_token_address.len() > 0 {
        let recovered_address = ctx.accounts.idendity_sender.recovered_token_address[0];
        if recovered_address != ctx.accounts.destination_token.key() {
            return Err(IdendityError::IdendityRecovered.into());
        }
    }

    Ok(())
}

#[inline(always)]
pub fn check_approval(ctx: &Context<TransferHook>, amount: u64) -> Result<()> {
    let transaction = &ctx.accounts.transaction_approval.transaction;
    let source_token = &ctx.accounts.source_token;
    let destination_token = &ctx.accounts.destination_token;

    if !(transaction.amount == amount
        && transaction.source.eq(&source_token.key())
        && transaction.destination.eq(&destination_token.key()))
    {
        return Err(TwoAuthError::NotAuthorized.into());
    }

    let time = Clock::get()?.unix_timestamp;

    if transaction.time + 5000 < time {
        // 5 seconds
        return Err(TwoAuthError::ExpiredApproval.into());
    }

    Ok(())
}

#[inline(always)]
pub fn need_two_auth(ctx: &Context<TransferHook>, amount: u64) -> bool {
    let two_auth = &ctx.accounts.two_auth;
    let functions = &two_auth.functions;
    return apply_two_auth_functions(amount, functions);
}
