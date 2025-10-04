#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("B3oFEmT9LiYrbd8CknDvbkLynbcmJWWQ5cqwoXGuqRfi");

#[program]
pub mod counter {
    use super::*;

    pub fn close(_ctx: Context<CloseCounter>) -> Result<()> {
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_sub(1).unwrap();
        Ok(())
    }

    pub fn increment(ctx: Context<UpdateWithAuthority>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn initialize(_ctx: Context<InitializeCounter>) -> Result<()> {
        Ok(())
    }

    pub fn increment_with_pda(ctx: Context<UpdateWithPda>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn set(ctx: Context<UpdateWithAuthority>, value: u8) -> Result<()> {
        ctx.accounts.counter.count = value.clone();
        Ok(())
    }

    pub fn initialize_with_pda(ctx: Context<InitializeCounterWithPda>) -> Result<()> {
        ctx.accounts.counter.authority = ctx.accounts.authority.key();
        ctx.accounts.counter.count = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        space = 8 + Counter::INIT_SPACE,
        payer = payer
    )]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeCounterWithPda<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        space = 8 + CounterWithAuthority::INIT_SPACE,
        payer = payer
    )]
    pub counter: Account<'info, CounterWithAuthority>,
    /// CHECK: PDA authority
    pub authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  mut,
  close = payer, // close account and return lamports to payer
    )]
    pub counter: Account<'info, Counter>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[derive(Accounts)]
pub struct UpdateWithAuthority<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateWithPda<'info> {
    #[account(mut)]
    pub counter: Account<'info, CounterWithAuthority>,
    /// CHECK: PDA authority derived from seeds
    #[account(
        seeds = [b"authority"],
        bump,
    )]
    pub authority: AccountInfo<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    count: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CounterWithAuthority {
    authority: Pubkey,
    count: u8,
}
