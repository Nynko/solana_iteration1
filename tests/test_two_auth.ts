import * as anchor from "@coral-xyz/anchor";
import { UndefinedTemporary } from "../target/types/undefined_temporary";
import { AccountArgs } from "./test_interfaces";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { expect } from "chai";

export async function test_2_auth_init(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let user3 = args.users[2];
  let issuer = args.issuer;

  try {
    const tx = await program.methods
      .initializeTwoAuth(
        [{ onMax: { max: new anchor.BN(101) } }],
        [issuer.publicKey]
      )
      .accounts({
        owner: user1.owner.publicKey,
        tokenAccount: user1.token_account,
        mint: args.mint,
        twoAuthParameters: user1.two_auth,
        transactionApproval: user1.approval,
        twoAuthEntity: issuer.publicKey,
      })
      .signers([user1.owner, issuer])
      .rpc();

    console.log("Your transaction signature for 2Auth init", tx);
  } catch (error) {
    console.log(error);
  }
}
