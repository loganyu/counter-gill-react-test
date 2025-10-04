#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
declare_id!("4trU6PxX9bq7yAkFaCr4SmfbzddSEbbnufuZ8CjpBy1R");

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,        // Who can control this vault
    pub token_account: Pubkey,    // The token account holding the funds
    pub bump: u8,                 // PDA bump for the vault account
    pub authority_bump: u8,       // PDA bump for the vault authority
}

#[error_code]
pub enum VaultError {
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
}

#[derive(Accounts)]
#[instruction(bump: u8, authority_bump: u8)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"vault", mint.key().as_ref(), payer.key().as_ref()],
        bump,
        space = 8 + Vault::INIT_SPACE
    )]
    pub vault: Account<'info, Vault>,
    
    /// CHECK: Safe because we derive it with PDA and just store it
    #[account(
        seeds = [b"authority", vault.key().as_ref()],
        bump = authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref(), authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority
    )]
    pub vault: Account<'info, Vault>,
    pub mint: Account<'info, Mint>,

    /// CHECK: Safe because we derive it with PDA
    #[account(
        seeds = [b"authority", vault.key().as_ref()],
        bump = vault.authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::authority = authority,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = vault.token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref(), authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority
    )]
    pub vault: Account<'info, Vault>,
    pub mint: Account<'info, Mint>,

    /// CHECK: Safe because we derive it with PDA
    #[account(
        seeds = [b"authority", vault.key().as_ref()],
        bump = vault.authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        token::authority = authority,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = vault.token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[program]
pub mod vault {
    use super::*;

    // 👇 STEP 2: Move your instruction logic inside these functions.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        bump: u8,
        authority_bump: u8,
    ) -> Result<()> {
        ctx.accounts.vault.set_inner(Vault {
            authority: ctx.accounts.payer.key(),
            token_account: ctx.accounts.token_account.key(),
            bump,
            authority_bump,
        });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
    
        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            VaultError::InsufficientFunds
        );

        let vault_key = vault.key();
        let authority_seed = &[
            b"authority",
            vault_key.as_ref(),
            &[vault.authority_bump],
        ];
        let signer = &[&authority_seed[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}
