import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { UndefinedTemporary } from "../target/types/undefined_temporary";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  addExtraAccountMetasForExecute,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithTransferHookInstruction,
  getAssociatedTokenAddressSync,
  getExtraAccountMetaAddress,
  getExtraAccountMetas,
  getMint,
  getMintLen,
  getTransferHook,
} from "@solana/spl-token";
import { expect } from "chai";
import { sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("undefined_temporary", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .UndefinedTemporary as Program<UndefinedTemporary>;

  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();
  const issuer = anchor.web3.Keypair.generate();
  const mint_keypair = anchor.web3.Keypair.generate();
  const mint = mint_keypair.publicKey;

  console.log(`User1: ${user1.publicKey}`);
  console.log(`User2: ${user2.publicKey}`);
  console.log(`User3: ${user3.publicKey}`);
  console.log(`Issuer: ${issuer.publicKey}`);

  const LAMPORTS_PER_SOL = 1000000000;

  it("Aidrop some SOL", async () => {
    await anchor
      .getProvider()
      .connection.requestAirdrop(user1.publicKey, 10 * LAMPORTS_PER_SOL);

    await anchor
      .getProvider()
      .connection.requestAirdrop(user2.publicKey, 10 * LAMPORTS_PER_SOL);

    await anchor
      .getProvider()
      .connection.requestAirdrop(user3.publicKey, 10 * LAMPORTS_PER_SOL);

    await anchor
      .getProvider()
      .connection.requestAirdrop(issuer.publicKey, 10 * LAMPORTS_PER_SOL);

    await sleep(1000);

    const user1_balance = await anchor
      .getProvider()
      .connection.getBalance(user1.publicKey);
    const user2_balance = await anchor
      .getProvider()
      .connection.getBalance(user2.publicKey);
    const user3_balance = await anchor
      .getProvider()
      .connection.getBalance(user3.publicKey);
    const issuer_balance = await anchor
      .getProvider()
      .connection.getBalance(issuer.publicKey);
    expect(user1_balance).equal(10 * LAMPORTS_PER_SOL);
    expect(user2_balance).equal(10 * LAMPORTS_PER_SOL);
    expect(user3_balance).equal(10 * LAMPORTS_PER_SOL);
    expect(issuer_balance).equal(10 * LAMPORTS_PER_SOL);
  });

  // const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
  //   [Buffer.from(anchor.utils.bytes.utf8.encode("mint"))],
  //   program.programId
  // );

  console.log(`Mint: ${mint}`);

  // Sender token account address
  const sourceTokenAccount = getAssociatedTokenAddressSync(
    mint,
    user1.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Source Token Account: ${sourceTokenAccount}`);

  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint,
    user2.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Destination Token Account: ${destinationTokenAccount}`);

  const [extraAccountMetaListPDA] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.toBuffer()],
      program.programId
    );

  const decimals = 2;

  it("Create Mint Account with Transfer Hook Extension", async () => {
    const extensions = [ExtensionType.TransferHook];
    const mintLen = getMintLen(extensions);
    const lamports = await anchor
      .getProvider()
      .connection.getMinimumBalanceForRentExemption(mintLen);

    // try {
    //   const tx = await program.methods
    //   .initializeTokenMint(new anchor.BN(mintLen))
    //   .accounts({ mint: mint, user: user1.publicKey})
    //   .signers([user1])
    //   .rpc();

    // console.log(`Transaction Signature: ${tx}`);

    // } catch (error) {
    //   console.log(error);

    // }

    try {
      const transaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: user1.publicKey,
          newAccountPubkey: mint,
          space: mintLen,
          lamports: lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeTransferHookInstruction(
          mint,
          user1.publicKey,
          program.programId, // Transfer Hook Program ID
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mint,
          decimals,
          user1.publicKey,
          null,
          TOKEN_2022_PROGRAM_ID
        )
      );

      const txSig = await sendAndConfirmTransaction(
        anchor.getProvider().connection,
        transaction,
        [user1, mint_keypair]
      );
      console.log(`Transaction Signature: ${txSig}`);
    } catch (error) {
      console.log(error);
    }
  });

  const [pda_id_1] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      user1.publicKey.toBuffer(),
      issuer.publicKey.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 1: ${pda_id_1}`);

  const [pda_id_2] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      user2.publicKey.toBuffer(),
      issuer.publicKey.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 2: ${pda_id_2}`);

  const [pda_id_3] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      user3.publicKey.toBuffer(),
      issuer.publicKey.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 3: ${pda_id_3}`);

  it("Init ID", async () => {
    try {
      const tx1 = await program.methods
        .addIdendity(user1.publicKey)
        .accounts({ issuer: issuer.publicKey, account: pda_id_1 })
        .signers([issuer])
        .rpc();
      console.log("Your transaction signature", tx1);
      const tx2 = await program.methods
        .addIdendity(user2.publicKey)
        .accounts({ issuer: issuer.publicKey, account: pda_id_2 })
        .signers([issuer])
        .rpc();
      console.log("Your transaction signature", tx2);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
    }
  });

  // Create the two token accounts for the transfer-hook enabled mint
  // Fund the sender token account with 100 tokens
  it("Create Token Accounts and Mint Tokens", async () => {
    // 100 tokens
    const amount = 100 * 10 ** decimals;

    try {
      const transaction = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          user1.publicKey,
          sourceTokenAccount,
          user1.publicKey,
          mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
          user1.publicKey,
          destinationTokenAccount,
          user2.publicKey,
          mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(
          mint,
          sourceTokenAccount,
          user1.publicKey,
          amount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      const txSig = await sendAndConfirmTransaction(
        anchor.getProvider().connection,
        transaction,
        [user1]
      );

      console.log(`Transaction Signature: ${txSig}`);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
    }
  });

  // Account to store extra accounts required by the transfer hook instruction
  it("Create ExtraAccountMetaList Account", async () => {
    try {
      const tx = await program.methods
        .initializeExtraAccountMetaList()
        .accounts({
          payer: user1.publicKey,
          extraAccountMetaList: extraAccountMetaListPDA,
          mint: mint,
          issuer: issuer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();

      console.log("Transaction Signature:", tx);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
    }
  });

  sleep(2000);

  it("Transfer Hook with Extra Account Meta", async () => {
    await sleep(1000);
    // 1 tokens
    const amount = 1 * 10 ** decimals;

    try {
      // This helper function will automatically derive all the additional accounts that were defined in the ExtraAccountMetas account
      let transferInstructionWithHelper =
        await createTransferCheckedWithTransferHookInstruction(
          anchor.getProvider().connection,
          sourceTokenAccount,
          mint,
          destinationTokenAccount,
          user1.publicKey,
          BigInt(new anchor.BN(amount).toString()),
          decimals,
          [],
          "confirmed",
          TOKEN_2022_PROGRAM_ID
        );

      const transaction = new anchor.web3.Transaction().add(
        transferInstructionWithHelper
      );

      console.log(transferInstructionWithHelper.keys[4].pubkey.toString());

      const txSig = await sendAndConfirmTransaction(
        anchor.getProvider().connection,
        transaction,
        [user1],
        { skipPreflight: true } // Skip preflight checks
      );
      console.log("Transfer Signature:", txSig);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
    }
  });

  // it("Unauthorized Transaction", async () => {
  //   await sleep(1000);
  //   // 1 tokens
  //   const amount = 1 * 10 ** decimals;

  //   try {
  //     // This helper function will automatically derive all the additional accounts that were defined in the ExtraAccountMetas account
  //     let transferInstructionWithHelper =
  //       await createTransferCheckedWithTransferHookInstruction(
  //         anchor.getProvider().connection,
  //         sourceTokenAccount,
  //         mint,
  //         destinationTokenAccount,
  //         user1.publicKey,
  //         BigInt(new anchor.BN(amount).toString()),
  //         decimals,
  //         [],
  //         "confirmed",
  //         TOKEN_2022_PROGRAM_ID
  //       );

  //     const transaction = new anchor.web3.Transaction().add(
  //       transferInstructionWithHelper
  //     );

  //     console.log(transferInstructionWithHelper.keys[4].pubkey.toString());

  //     const txSig = await sendAndConfirmTransaction(
  //       anchor.getProvider().connection,
  //       transaction,
  //       [user1],
  //       { skipPreflight: true } // Skip preflight checks
  //     );
  //     console.log("Transfer Signature:", txSig);
  //   } catch (error) {
  //     console.log(error);
  //     expect(error).to.be.undefined;
  //   }
  // });
});
