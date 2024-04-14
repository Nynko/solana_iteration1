import * as anchor from "@coral-xyz/anchor";
import { UndefinedTemporary } from "../target/types/undefined_temporary";
import { AccountArgs } from "./test_interfaces";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

export async function init_recovery(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>,
  from: number,
  authorities: number[]
) {
  let user_from = args.users[from];
  let authorities_keys = authorities.map((i) => args.users[i].owner.publicKey);
  try {
    const tx = await program.methods
      .initializeRecovery(authorities_keys, authorities_keys.length)
      .accounts({
        lastTx: user_from.last_tx,
        payer: user_from.owner.publicKey,
        owner: user_from.owner.publicKey,
        recoveryAuthority: user_from.recovery,
      })
      .signers([user_from.owner])
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
  let user3 = args.users[2];
  let issuer = args.issuer;
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user1.idendity,
        owner: user1.owner.publicKey,
        lastTx: user1.last_tx,
        tokenAccount: user1.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user2.token_account,
        newOwner: user2.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: user1.recovery,
      })
      .remainingAccounts([
        { pubkey: user3.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user2.owner.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user3.owner, user2.owner])
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

export async function test_recovery_missing_signers(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let user3 = args.users[2];
  let issuer = args.issuer;
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user1.idendity,
        owner: user1.owner.publicKey,
        lastTx: user1.last_tx,
        tokenAccount: user1.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user2.token_account,
        newOwner: user2.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: user1.recovery,
      })
      .remainingAccounts([
        { pubkey: user2.owner.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user2.owner])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
    expect.fail("This test should fail");
  } catch (error) {
    expect((error as anchor.AnchorError).logs).to.contain(
      "Program log: AnchorError occurred. Error Code: NotEnoughSignatures. Error Number: 6001. Error Message: Not enough signatures."
    );
  }
}

export async function test_recovery_already_recovered(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let user3 = args.users[2];
  let issuer = args.issuer;
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user1.idendity,
        owner: user1.owner.publicKey,
        lastTx: user1.last_tx,
        tokenAccount: user1.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user2.token_account,
        newOwner: user2.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: user1.recovery,
      })
      .remainingAccounts([
        { pubkey: user3.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user2.owner.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user3.owner, user2.owner])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    expect((error as anchor.AnchorError).logs).to.match(
      /Program log: AnchorError occurred. Error Code: IdendityAlreadyRecovered. Error Number: 6004. Error Message: Idendity already recovered.|Program log: AnchorError caused by account: .*\. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized./
    );
  }
}

export async function test_recovery_more_signers(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let user3 = args.users[2];
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user2.idendity,
        owner: user2.owner.publicKey,
        lastTx: user2.last_tx,
        tokenAccount: user2.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user3.token_account,
        newOwner: user3.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: user2.recovery,
      })
      .remainingAccounts([
        { pubkey: user1.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user3.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user2.owner.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user1.owner, user2.owner, user3.owner])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    console.log(error);
  }

  const account = await program.account.idAccount.fetch(user2.idendity);
  expect(account.recoveredTokenAddress[0].toBase58()).to.be.equal(
    user3.token_account.toBase58()
  );
}

export async function test_recovery_without_close_authority(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0];
  let user2 = args.users[1];
  let user3 = args.users[2];

  // let user4 =
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: user2.idendity,
        owner: user2.owner.publicKey,
        lastTx: user2.last_tx,
        tokenAccount: user2.token_account,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user3.token_account,
        newOwner: user3.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: user2.recovery,
      })
      .remainingAccounts([
        { pubkey: user1.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user3.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: user2.owner.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user1.owner, user2.owner, user3.owner])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    console.log(error);
  }

  const account = await program.account.idAccount.fetch(user2.idendity);
  expect(account.recoveredTokenAddress[0].toBase58()).to.be.equal(
    user3.token_account.toBase58()
  );
}
