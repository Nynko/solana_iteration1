use anchor_lang::{prelude::*, solana_program::program};
use anchor_spl::{associated_token::AssociatedToken, token_2022::spl_token_2022::{self, instruction::AuthorityType}, token_interface::{Mint, TokenAccount, TokenInterface}};

#[derive(Accounts)]
pub struct AddTokenAccount<'info> {
    #[account(mut)]
    pub owner : Signer<'info>,
    #[account(mut, seeds = [b"mint"], bump)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn _add_token_account(ctx: Context<AddTokenAccount>) -> Result<()>  {

    let ix = spl_token_2022::instruction::set_authority(
        &spl_token_2022::id(),
        &ctx.accounts.token_account.key(),
        Some(&ctx.accounts.mint.key()),
        AuthorityType::CloseAccount,
        &ctx.accounts.owner.key(),
        &[],
    )?;

    let seeds :&[&[&[u8]]] = &[&[b"mint",&[ctx.bumps.mint]]];  

    program::invoke_signed(&ix, &[
        ctx.accounts.token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ],
        seeds)?;    

    // program::invoke_signed(&ix, &[
    //     ctx.accounts.token_account.to_account_info(),
    //     ctx.accounts.mint.to_account_info(),
    //     ctx.accounts.token_program.to_account_info(),
    // ],
    //     seeds)?;


    Ok(())
}