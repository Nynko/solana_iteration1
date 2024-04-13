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
import { Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import { AccountArgs } from "./test_interfaces";
import { init_recovery, test_recovery } from "./test_recovery";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTransaction(from: Keypair, to: PublicKey, amount: number) {
  const transaction = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: amount,
    })
  );

  // Sign transaction, broadcast, and confirm
  const signature = await anchor.web3.sendAndConfirmTransaction(
    anchor.getProvider().connection,
    transaction,
    [from]
  );

  console.log("SIGNATURE", signature);
}

function loadKeypairFromFile(filename: string): Keypair {
  const secret = JSON.parse(fs.readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}

describe("undefined_temporary", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const DEVNET = true;

  const program = anchor.workspace
    .UndefinedTemporary as Program<UndefinedTemporary>;

  const wallet = loadKeypairFromFile(
    "/Users/nicolasbeaudouin/.config/solana/id.json"
  );

  if (
    wallet.publicKey.toBase58() !=
    "DLnnMxDv6MCkZtfn9zUdCVpVytc1EeQJvWG86k9DNcTg"
  ) {
    return;
  }

  let user1: anchor.web3.Keypair;
  let user2: anchor.web3.Keypair;
  let user3: anchor.web3.Keypair;
  let issuer: anchor.web3.Keypair;
  let mint_keypair: anchor.web3.Keypair;
  let mint: anchor.web3.PublicKey;

  if (DEVNET) {
    // Get the keypairs from json

    user1 = loadKeypairFromFile("user1.json");
    user2 = loadKeypairFromFile("user2.json");
    user3 = loadKeypairFromFile("user3.json");
    issuer = loadKeypairFromFile("issuer.json");
    mint_keypair = loadKeypairFromFile("mint.json");
    mint = mint_keypair.publicKey;
  } else {
    user1 = anchor.web3.Keypair.generate();
    user2 = anchor.web3.Keypair.generate();
    user3 = anchor.web3.Keypair.generate();
    issuer = anchor.web3.Keypair.generate();
    mint_keypair = anchor.web3.Keypair.generate();
    mint = mint_keypair.publicKey;

    console.log(`User1: ${user1}`);
    console.log(`User2: ${user2}`);
    console.log(`User3: ${user3}`);
    console.log(`Issuer: ${issuer}`);

    // Save the keypairs
    fs.writeFileSync("user1.json", JSON.stringify(Array.from(user1.secretKey)));
    fs.writeFileSync("user2.json", JSON.stringify(Array.from(user2.secretKey)));
    fs.writeFileSync("user3.json", JSON.stringify(Array.from(user3.secretKey)));
    fs.writeFileSync(
      "issuer.json",
      JSON.stringify(Array.from(issuer.secretKey))
    );
    fs.writeFileSync(
      "mint.json",
      JSON.stringify(Array.from(mint_keypair.secretKey))
    );

    const LAMPORTS_PER_SOL = 1000000000;

    it("Aidrop some SOL", async () => {
      // await anchor
      //   .getProvider()
      //   .connection.requestAirdrop(user1.publicKey, 10 * LAMPORTS_PER_SOL);

      // await anchor
      //   .getProvider()
      //   .connection.requestAirdrop(user2.publicKey, 10 * LAMPORTS_PER_SOL);

      // await anchor
      //   .getProvider()
      //   .connection.requestAirdrop(user3.publicKey, 10 * LAMPORTS_PER_SOL);

      // await anchor
      //   .getProvider()
      //   .connection.requestAirdrop(issuer.publicKey, 10 * LAMPORTS_PER_SOL);

      await sendTransaction(wallet, user1.publicKey, 1 * LAMPORTS_PER_SOL);
      await sendTransaction(wallet, user2.publicKey, 0.1 * LAMPORTS_PER_SOL);
      await sendTransaction(wallet, user3.publicKey, 0.1 * LAMPORTS_PER_SOL);
      await sendTransaction(wallet, issuer.publicKey, 0.1 * LAMPORTS_PER_SOL);

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
      expect(user1_balance).equal(1 * LAMPORTS_PER_SOL);
      expect(user2_balance).equal(0.1 * LAMPORTS_PER_SOL);
      expect(user3_balance).equal(0.1 * LAMPORTS_PER_SOL);
      expect(issuer_balance).equal(0.1 * LAMPORTS_PER_SOL);
    });
  }

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

  const ThirdTokenAccount = getAssociatedTokenAddressSync(
    mint,
    user3.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Third Token Account: ${ThirdTokenAccount}`);

  const [extraAccountMetaListPDA] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.toBuffer()],
      program.programId
    );

  const decimals = 2;

  const [pda_id_1] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      sourceTokenAccount.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 1: ${pda_id_1}`);

  const [pda_id_2] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      destinationTokenAccount.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 2: ${pda_id_2}`);

  const [pda_id_3] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("identity")),
      ThirdTokenAccount.toBuffer(),
    ],
    program.programId
  );

  console.log(`PDA ID 3: ${pda_id_3}`);

  let [pda_last_tx_1] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("last_tx")),
      user1.publicKey.toBuffer(),
    ],
    program.programId
  );
  let [pda_last_tx_2] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("last_tx")),
      user2.publicKey.toBuffer(),
    ],
    program.programId
  );
  let [pda_last_tx_3] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("last_tx")),
      user3.publicKey.toBuffer(),
    ],
    program.programId
  );

  const account_args: AccountArgs = {
    users: [
      {
        owner: user1,
        token_account: sourceTokenAccount,
        idendity: pda_id_1,
        recovery: pda_last_tx_1,
      },
      {
        owner: user2,
        token_account: destinationTokenAccount,
        idendity: pda_id_2,
        recovery: pda_last_tx_2,
      },
      {
        owner: user3,
        token_account: ThirdTokenAccount,
        idendity: pda_id_3,
        recovery: pda_last_tx_3,
      },
    ],
    issuer: issuer,
    mint: mint_keypair,
  };

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
        createAssociatedTokenAccountInstruction(
          user1.publicKey,
          ThirdTokenAccount,
          user3.publicKey,
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

  it("Init ID", async () => {
    await sleep(1000);
    try {
      const tx1 = await program.methods
        .addIdendity(new anchor.BN(1000))
        .accounts({
          idendity: pda_id_1,
          owner: user1.publicKey,
          issuer: issuer.publicKey,
          tokenAccount: sourceTokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([issuer])
        .rpc();
      console.log("Your transaction signature", tx1);
      const tx2 = await program.methods
        .addIdendity(new anchor.BN(1000))
        .accounts({
          idendity: pda_id_2,
          owner: user2.publicKey,
          issuer: issuer.publicKey,
          tokenAccount: destinationTokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([issuer])
        .rpc();
      console.log("Your transaction signature", tx2);
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
        [user1]
      );
      console.log("Transfer Signature:", txSig);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
    }
  });

  it("Unauthorized Transaction without ID", async () => {
    // 1 tokens
    const amount = 1 * 10 ** decimals;

    try {
      // This helper function will automatically derive all the additional accounts that were defined in the ExtraAccountMetas account
      let transferInstructionWithHelper =
        await createTransferCheckedWithTransferHookInstruction(
          anchor.getProvider().connection,
          sourceTokenAccount,
          mint,
          ThirdTokenAccount,
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
        [user1]
      );
      console.log("Transfer Signature: NOT NORMAL", txSig);
      expect(txSig).to.be.undefined;
    } catch (error) {
      expect((error as anchor.AnchorError).logs as Array<string>).contain(
        "Program log: AnchorError caused by account: idendity_receiver. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized."
      );
    }
  });

  it("Unauthorized Transaction with expired ID", async () => {
    // 1 tokens
    const amount = 1 * 10 ** decimals;

    try {
      const tx = await program.methods
        .addIdendity(new anchor.BN(-1))
        .accounts({
          idendity: pda_id_3,
          owner: user3.publicKey,
          issuer: issuer.publicKey,
          tokenAccount: ThirdTokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([issuer])
        .rpc();
      console.log("Your transaction signature for ID3", tx);
    } catch (error) {
      expect(error).to.be.undefined;
    }

    try {
      // This helper function will automatically derive all the additional accounts that were defined in the ExtraAccountMetas account
      let transferInstructionWithHelper =
        await createTransferCheckedWithTransferHookInstruction(
          anchor.getProvider().connection,
          sourceTokenAccount,
          mint,
          ThirdTokenAccount,
          user1.publicKey,
          BigInt(new anchor.BN(amount).toString()),
          decimals,
          [],
          "confirmed",
          TOKEN_2022_PROGRAM_ID
        );

      // let i = 0;
      // for (let key in transferInstructionWithHelper.keys) {
      //   console.log(i);
      //   console.log(transferInstructionWithHelper.keys[key].pubkey.toString());
      //   i += 1;
      // }

      const transaction = new anchor.web3.Transaction().add(
        transferInstructionWithHelper
      );

      const txSig = await sendAndConfirmTransaction(
        anchor.getProvider().connection,
        transaction,
        [user1]
      );
      console.log("Transfer Signature: NOT NORMAL", txSig);
      expect(txSig).to.be.undefined;
    } catch (error) {
      expect(
        error.message.includes(
          '({"err":{"InstructionError":[0,{"Custom":6002}]}})'
        ) ||
          (error as anchor.AnchorError).logs.includes(
            "Program log: AnchorError occurred. Error Code: IdendityExpired. Error Number: 6002. Error Message: Idendity expired."
          )
      ).to.be.true;
      //
    }
  });

  it("Init recovery Account", async () => {
    await init_recovery(account_args, program);
  });

  it("Recovering Account", async () => {
    await test_recovery(account_args, program);
  });
});
