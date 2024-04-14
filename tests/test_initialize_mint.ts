import * as anchor from "@coral-xyz/anchor";
import { UndefinedTemporary } from "../target/types/undefined_temporary";
import { AccountArgs } from "./test_interfaces";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export async function init_mint(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let mint = args.mint;
  try {
    const tx = await program.methods
      .initializeTokenMint()
      .accounts({
        payer: user1.owner.publicKey,
        mint: mint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user1.owner])
      .rpc({ skipPreflight: true });

    console.log("Your transaction signature for initialized token mint", tx);
  } catch (error) {
    console.log(error);
  }
}
