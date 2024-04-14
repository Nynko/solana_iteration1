use anchor_lang::{prelude::*, solana_program::program};
use anchor_spl::{token_2022::spl_token_2022, token_interface::{Mint, TokenAccount, TokenInterface}};


#[derive(Accounts)]
pub struct MintTo<'info> {
    #[account(mut, seeds=[b"mint"], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = owner_token_account)]
    pub to_token_account: InterfaceAccount<'info,TokenAccount>,
    #[account(mut)]
    pub owner_token_account: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}




pub fn _mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {

    let signer : &[&[&[u8]]] = &[&[b"mint",&[ctx.bumps.mint]]];


    let ix = spl_token_2022::instruction::mint_to(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.to_token_account.key(),
        &ctx.accounts.mint.key(),
        &[],
        amount,
    )?;

    program::invoke_signed(
        &ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.to_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer,
    )?;

    Ok(())
}