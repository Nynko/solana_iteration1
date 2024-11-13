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
  const token_account = await program.provider.connection.getAccountInfo(
    user1.token_account
  );
  expect(token_account).to.be.null;
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
  const token_account = await program.provider.connection.getAccountInfo(
    user2.token_account
  );
  expect(token_account).to.be.null;
}

export async function test_recovery_without_close_authority(
  args: AccountArgs,
  program: anchor.Program<UndefinedTemporary>
) {
  let user1 = args.users[0].owner;
  let user3 = args.users[2];
  let user4 = anchor.web3.Keypair.generate();
  let mint = args.mint;
  let issuer = args.issuer;

  let tokenAccount = getAssociatedTokenAddressSync(
    mint,
    user4.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  let [pda_id_4] = await anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      tokenAccount.toBuffer(),
    ],
    program.programId
  );

  let [last_tx] = await anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("last_tx")),
      user4.publicKey.toBuffer(),
    ],
    program.programId
  );

  let [recovery] = await anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("recovery_authority")),
      user4.publicKey.toBuffer(),
    ],
    program.programId
  );

  try {
    const transaction = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        user1.publicKey,
        tokenAccount,
        user4.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    const txSig = await anchor.web3.sendAndConfirmTransaction(
      anchor.getProvider().connection,
      transaction,
      [user1]
    );

    console.log(`Transaction Signature for account creation: ${txSig}`);

    const tx1 = await program.methods
      .addIdendity(new anchor.BN(1000))
      .accounts({
        idendity: pda_id_4,
        owner: user4.publicKey,
        issuer: issuer.publicKey,
        tokenAccount: tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([issuer])
      .rpc();

    console.log("Your transaction signature for id", tx1);

    const tx = await program.methods
      .initializeRecovery([user1.publicKey], 1)
      .accounts({
        lastTx: last_tx,
        payer: user1.publicKey,
        owner: user4.publicKey,
        recoveryAuthority: recovery,
      })
      .signers([user1])
      .rpc();

    console.log("Your transaction signature for recovery", tx);
  } catch (error) {
    console.log(error);
    expect(error).to.be.undefined;
  }

  // let user4 =
  try {
    const tx = await program.methods
      .recoverAccount()
      .accounts({
        idendity: pda_id_4,
        owner: user4.publicKey,
        lastTx: last_tx,
        tokenAccount: tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        newTokenAccount: user3.token_account,
        newOwner: user3.owner.publicKey,
        mint: args.mint,
        recoveryAuthority: recovery,
      })
      .remainingAccounts([
        { pubkey: user1.publicKey, isSigner: true, isWritable: false },
      ])
      .signers([user1, user3.owner])
      .rpc();

    console.log("Your transaction signature for the recovered account", tx);
  } catch (error) {
    console.log(error);
  }

  const account = await program.account.idAccount.fetch(pda_id_4);
  expect(account.recoveredTokenAddress[0].toBase58()).to.be.equal(
    user3.token_account.toBase58()
  );
}
