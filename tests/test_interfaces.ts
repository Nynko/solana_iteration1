import * as anchor from "@coral-xyz/anchor";

interface AssociatedTokenAccounts {
  owner: anchor.web3.Keypair;
  token_account: anchor.web3.PublicKey;
  idendity: anchor.web3.PublicKey;
  last_tx: anchor.web3.PublicKey;
  recovery: anchor.web3.PublicKey;
  approval: anchor.web3.PublicKey;
  two_auth: anchor.web3.PublicKey;
}
interface AccountArgs {
  users: AssociatedTokenAccounts[];
  issuer: anchor.web3.Keypair;
  mint: anchor.web3.PublicKey;
}

export { AccountArgs, AssociatedTokenAccounts };
