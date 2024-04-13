import * as anchor from "@coral-xyz/anchor";
import { UndefinedTemporary } from "../target/types/undefined_temporary";
import { AccountArgs } from "./test_interfaces";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

export async function init_recovery(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  try {
    const tx = await program.methods
      .initializeRecovery()
      .accounts({
        lastTx: user1.recovery,
        payer: user1.owner.publicKey,
        owner: user1.owner.publicKey,
      })
      .signers([user1.owner])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    console.log(error);
  }
}

export async function test_recovery(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let issuer = args.issuer;
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user1.idendity,
        owner: user1.owner.publicKey,
        recoverer: issuer.publicKey,
        lastTx: user1.recovery,
        tokenAccount: user1.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user2.token_account,
        newOwner: user2.owner.publicKey,
      })
      .signers([issuer])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    console.log(error);
  }

  const account = await program.account.idAccount.fetch(user1.idendity);
  expect(account.recoveredTokenAddress[0].toBase58()).to.be.equal(
    user2.token_account.toBase58()
  );
}
