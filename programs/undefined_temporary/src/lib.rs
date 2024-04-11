pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("4CzYYTgiCb87LKi1HGWTUpGA4JQJJ4NtdLrkYEesfuN3");

#[program]
pub mod undefined_temporary {
    use spl_transfer_hook_interface::instruction::TransferHookInstruction;

    use super::*;

    /* Initializes a Digital Idendity by an idendity issuer. */
    pub fn add_idendity(ctx: Context<Initialize>, user: Pubkey ) -> Result<()> {
        initialize_id::initialize_id(ctx, user)
    }

    pub fn transfer_hook(ctx: Context<TransferHook>) -> Result<()> {
        transfer_hook::transfer_hook(ctx)
    }

    pub fn initialize_extra_account_meta_list(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
        transfer_hook::initialize_extra_account_meta_list(ctx)
    }

    pub fn add_token_account(ctx: Context<AddTokenAccount>) -> Result<()> {
        Ok(())
    }
    pub fn initialize_token_mint(ctx: Context<InitializeTokenMint>, space :u64) -> Result<()> {
        initialize_mint::initialize_token_mint(ctx, space)
    }
    
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;
     
        // match instruction discriminator to transfer hook interface execute instruction
        // token2022 program CPIs this instruction on token transfer
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
     
                // invoke custom transfer hook instruction on our program
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => return Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}
