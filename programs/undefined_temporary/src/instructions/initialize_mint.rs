use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
#[instruction(space: u64)]
pub struct InitializeTokenMint<'info> {
    // #[account(
    //     init,
    //     seeds = ["mint".as_bytes()],
    //     bump,
    //     payer = user,
    //     space = space as usize,
    // )]
    /// CHECK: For now with anchor 0.29 we have to do everything manually
    pub mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}


pub fn initialize_token_mint(ctx: Context<InitializeTokenMint>) -> Result<()> {
        // let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];

        // let signer = [&seeds[..]];
        // let mut cpi_builder = CreateV1CpiBuilder::new(&ctx.accounts.token_metadata_program);
        // let mint = ctx.accounts.mint.to_account_info();
        // let token_program = ctx.accounts.token_program.to_account_info();
        // let rent = ctx.accounts.rent.to_account_info();
        // let create_cpi = cpi_builder
        //     .metadata(&ctx.accounts.metadata)
        //     .mint(&mint, true)
        //     .authority(&mint)
        //     .payer(&ctx.accounts.user)
        //     .update_authority(&ctx.accounts.user, false)
        //     .system_program(&ctx.accounts.system_program)
        //     .sysvar_instructions(&rent)
        //     .spl_token_program(Some(&token_program))
        //     .token_standard(TokenStandard::Fungible)
        //     .name(name)
        //     .uri(uri)
        //     .symbol(symbol)
        //     .seller_fee_basis_points(0)
        //     .add_remaining_account(&ctx.accounts.transfer_hook, false, true);

        // create_cpi.invoke_signed(&signer)?;

        Ok(())
}
