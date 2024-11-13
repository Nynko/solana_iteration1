#!/bin/bash


# Exit if any command fails
set -e


# Remove current idl
rm /Users/nicolasbeaudouin/Documents/Project1/undefined_temporary/target/deploy/undefined_temporary-keypair.json

# Build with anchor
anchor build

# Generate new pubkey
new_id=$(solana-keygen pubkey /Users/nicolasbeaudouin/Documents/Project1/undefined_temporary/target/deploy/undefined_temporary-keypair.json)

# Replace in lib.rs
sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$new_id\")/g" /Users/nicolasbeaudouin/Documents/Project1/undefined_temporary/programs/undefined_temporary/src/lib.rs
