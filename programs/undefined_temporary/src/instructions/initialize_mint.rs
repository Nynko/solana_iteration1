use anchor_lang::{prelude::*, solana_program::{program, system_instruction}};
use anchor_spl::{token_2022::spl_token_2022::{self, extension::ExtensionType, state::Mint}, token_interface::{TokenInterface}};

#[derive(Accounts)]
pub struct InitializeTokenMint<'info> {
    // #[account(
    //     init,
    //     seeds = ["mint".as_bytes()],
    //     bump,
    //     payer = user,
    //     space = space as usize,
    // )]
    /// CHECK: For now with anchor 0.29 we have to do everything manually
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum MintError {
    #[msg("Invalid Mint Account: the mint account in the accounts passed as arguments is not the expected one.")]
    InvalidMintAccount,
    #[msg("Invalid Token Program: the token program in the accounts passed as arguments is not the expected one.")]
    InvalidTokenProgram,
}



pub fn _initialize_token_mint(ctx: Context<InitializeTokenMint>) -> Result<()> {
        let program_id = ctx.program_id;
        let (mint_account, bump) = Pubkey::find_program_address(&["mint".as_bytes()], &program_id);

        if mint_account.key() != ctx.accounts.mint.key() {
            return Err(MintError::InvalidMintAccount.into());
        }

        if ctx.accounts.token_program.key() != spl_token_2022::id() {
            return Err(MintError::InvalidTokenProgram.into());
        }
        
        let seeds :&[&[&[u8]]] = &[&[b"mint",&[bump]]];  

        create_account(&ctx, seeds)?;
        init_transfer_hook(&ctx, seeds)?;
        init_permanent_delegate(&ctx, seeds)?;
        init_mint(&ctx, seeds)?;
        
        Ok(())
}



#[inline(always)]
pub fn create_account(ctx: &Context<InitializeTokenMint>, seeds : &[&[&[u8]]]) -> Result<()>{
    let extensions = [ExtensionType::TransferHook, ExtensionType::PermanentDelegate]; //, ExtensionType::MetadataPointer];
    let space =  ExtensionType::try_calculate_account_len::<Mint>(&extensions)?;
    let mint_rent = Rent::default().minimum_balance(space);

    let ix = system_instruction::create_account(
        ctx.accounts.payer.key,
        ctx.accounts.mint.key,
        mint_rent,
        space as u64,
        ctx.accounts.token_program.key,
    );
    program::invoke_signed(
        &ix,
        &[ctx.accounts.payer.to_account_info(), ctx.accounts.mint.to_account_info(), ctx.accounts.system_program.to_account_info()],
        seeds,
    )?;

    Ok(())
}

#[inline(always)]
pub fn init_transfer_hook(ctx: &Context<InitializeTokenMint>, seeds : &[&[&[u8]]]) -> Result<()>{
    let ix = spl_token_2022::extension::transfer_hook::instruction::initialize(
        &spl_token_2022::id(),
        ctx.accounts.mint.key,
        Some(ctx.accounts.mint.key()),
        Some(ctx.program_id.key())
    )?;

    program::invoke_signed(
        &ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        seeds,
    )?;

    Ok(())
}


#[inline(always)]
pub fn init_permanent_delegate(ctx: &Context<InitializeTokenMint>, seeds : &[&[&[u8]]]) -> Result<()>{
    let ix = spl_token_2022::instruction::initialize_permanent_delegate(
        &spl_token_2022::id(),
        ctx.accounts.mint.key,
        ctx.accounts.mint.key
    )?;

    program::invoke_signed(
        &ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        seeds,
    )?;

    Ok(())
}

#[inline(always)]
pub fn init_mint(ctx: &Context<InitializeTokenMint>, seeds : &[&[&[u8]]]) -> Result<()>{
    let ix = spl_token_2022::instruction::initialize_mint(
        &spl_token_2022::id(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.mint.key(),
        Some(&ctx.accounts.mint.key()),
        2
    )?;

    program::invoke_signed(
        &ix,
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        seeds,
    )?;

    Ok(())
}