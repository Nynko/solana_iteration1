pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("6qjkthwYhnL5CeMXWNjVUTaSrPxAWxjaRMqKnASF3pmE");

#[program]
pub mod undefined_temporary {
    use spl_transfer_hook_interface::instruction::TransferHookInstruction;

    use super::*;

    /* Initializes a Digital Idendity by an idendity issuer. */
    pub fn add_idendity(ctx: Context<InitializeId>,id_validity_duration: i64 ) -> Result<()> {
        id_instructions::_initialize_id(ctx, id_validity_duration)
    }

    /* Initializes a Digital Idendity by an idendity issuer. */
    pub fn add_issuer_to_idendity(ctx: Context<AddIssuer>,id_validity_duration: i64) -> Result<()> {
        id_instructions::_add_issuer(ctx, id_validity_duration)
    }

    // Initialize Token Mint
    pub fn initialize_token_mint(ctx: Context<InitializeTokenMint>) -> Result<()> {
        initialize_mint::_initialize_token_mint(ctx)
    }

    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        wrapper::_mint_to(ctx, amount)
    }


    // Recovery Instructions

    pub fn initialize_recovery(ctx: Context<InitializeRecovery>, recovery_delegates: Vec<Pubkey>, minimum_signatures: u8 ) -> Result<()> {
        recovery_instructions::_initialize_recovery(ctx,recovery_delegates,minimum_signatures)
    }

    pub fn recover_account(ctx: Context<RecoverAccount>) -> Result<()> {
        recovery_instructions::_recovering_account(ctx)
    }

    pub fn transfer_hook(ctx: Context<TransferHook>) -> Result<()> {
        transfer_hook::_transfer_hook(ctx)
    }

    pub fn initialize_extra_account_meta_list(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
        transfer_hook::_initialize_extra_account_meta_list(ctx)
    }

    pub fn add_token_account(ctx: Context<AddTokenAccount>) -> Result<()> {
        Ok(())
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
