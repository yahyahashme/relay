#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, AuthorizedFunction, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal,
};

/// $1 in token units (7 decimals).
const USD: i128 = 10_000_000;
const WEEK: u64 = 7 * 24 * 60 * 60;
const START: u64 = 1_000_000;

struct Setup {
    env: Env,
    client: RouteLedgerClient<'static>,
    token: TokenClient<'static>,
    minter: StellarAssetClient<'static>,
    admin: Address,
    treasury: Address,
    distributor: Address,
    shop: Address,
    driver: Address,
    lender: Address,
}

/// The shop starts with $500 and the lender with $50,000. No deposit yet.
fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(START);

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token = TokenClient::new(&env, &asset.address());
    let minter = StellarAssetClient::new(&env, &asset.address());

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let contract_id = env.register(
        RouteLedger,
        (admin.clone(), asset.address(), treasury.clone(), WEEK),
    );
    let client = RouteLedgerClient::new(&env, &contract_id);
    let distributor = Address::generate(&env);
    client.approve_distributor(&distributor);

    let shop = Address::generate(&env);
    let lender = Address::generate(&env);
    minter.mint(&shop, &(500 * USD));
    minter.mint(&lender, &(50_000 * USD));

    Setup {
        client,
        token,
        minter,
        admin,
        treasury,
        distributor,
        shop,
        driver: Address::generate(&env),
        lender,
        env,
    }
}

impl Setup {
    fn invoice(&self, id: u64, amount: i128) {
        self.client.create_invoice(
            &self.distributor,
            &id,
            &self.shop,
            &self.driver,
            &amount,
            &(START + WEEK),
        );
    }

    fn balance(&self, who: &Address) -> i128 {
        self.token.balance(who)
    }

    fn contract_balance(&self) -> i128 {
        self.token.balance(&self.client.address)
    }

    /// Deposit $5,000 and give the shop the starting $200 limit.
    fn with_credit(&self) {
        self.client.deposit(&self.lender, &(5_000 * USD));
        self.client.set_terms(&self.shop, &(200 * USD));
    }

    /// The pool's books always match the contract's token balance.
    fn assert_pool_matches_balance(&self) {
        let pool = self.client.get_pool();
        assert_eq!(pool.available + pool.buffer, self.contract_balance());
    }
}

// ---------- v1: invoices and digital payments (#14) ----------

#[test]
fn create_and_pay_in_full() {
    let t = setup();
    t.invoice(1, 150 * USD);

    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.amount, 1_500_000_000);
    assert_eq!(invoice.paid, 0);
    assert_eq!(invoice.status, InvoiceStatus::Due);
    assert_eq!(invoice.method, PayMethod::None);

    t.client.pay(&t.shop, &1, &(150 * USD));

    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.paid, 1_500_000_000);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Digital);
    // 0.10% usage fee: $150 -> $149.85 to the distributor, $0.15 to us.
    assert_eq!(t.balance(&t.distributor), 1_498_500_000);
    assert_eq!(t.balance(&t.treasury), 1_500_000);
    assert_eq!(t.balance(&t.shop), 3_500_000_000);
}

#[test]
fn pay_in_parts() {
    let t = setup();
    t.invoice(1, 150 * USD);

    t.client.pay(&t.shop, &1, &(50 * USD));
    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.paid, 500_000_000);
    assert_eq!(invoice.status, InvoiceStatus::PartPaid);

    t.client.pay(&t.shop, &1, &(100 * USD));
    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.paid, 1_500_000_000);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Digital);
    assert_eq!(t.balance(&t.distributor), 1_498_500_000);
    assert_eq!(t.balance(&t.treasury), 1_500_000);
}

#[test]
fn pay_twice_is_already_paid() {
    let t = setup();
    t.invoice(1, 150 * USD);
    t.client.pay(&t.shop, &1, &(150 * USD));
    assert_eq!(t.client.try_pay(&t.shop, &1, &USD), Err(Ok(Error::AlreadyPaid)));
}

#[test]
fn overpay_is_rejected() {
    let t = setup();
    t.invoice(1, 150 * USD);
    assert_eq!(t.client.try_pay(&t.shop, &1, &(151 * USD)), Err(Ok(Error::Overpay)));

    t.client.pay(&t.shop, &1, &(100 * USD));
    assert_eq!(t.client.try_pay(&t.shop, &1, &(51 * USD)), Err(Ok(Error::Overpay)));
}

#[test]
fn zero_or_negative_amounts_are_invalid() {
    let t = setup();
    t.invoice(1, 150 * USD);
    assert_eq!(t.client.try_pay(&t.shop, &1, &0), Err(Ok(Error::InvalidAmount)));
    assert_eq!(t.client.try_pay(&t.shop, &1, &-USD), Err(Ok(Error::InvalidAmount)));

    let result = t.client.try_create_invoice(&t.distributor, &2, &t.shop, &t.driver, &0, &START);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn wrong_shop_cannot_pay() {
    let t = setup();
    t.invoice(1, 150 * USD);
    let other_shop = Address::generate(&t.env);
    t.minter.mint(&other_shop, &(500 * USD));
    assert_eq!(
        t.client.try_pay(&other_shop, &1, &(150 * USD)),
        Err(Ok(Error::NotYourInvoice))
    );
}

#[test]
fn duplicate_id_already_exists() {
    let t = setup();
    t.invoice(1, 150 * USD);
    let result =
        t.client.try_create_invoice(&t.distributor, &1, &t.shop, &t.driver, &USD, &START);
    assert_eq!(result, Err(Ok(Error::AlreadyExists)));
}

#[test]
fn unknown_invoice_is_not_found() {
    let t = setup();
    assert_eq!(t.client.try_get_invoice(&404), Err(Ok(Error::NotFound)));
    assert_eq!(t.client.try_pay(&t.shop, &404, &USD), Err(Ok(Error::NotFound)));
}

#[test]
fn usage_fee_rounds_down_into_the_treasury() {
    let t = setup();
    // $8.55 -> fee 85_500 units ($0.00855), rounded down.
    t.invoice(1, 85_500_000);
    t.client.pay(&t.shop, &1, &85_500_000);
    assert_eq!(t.balance(&t.treasury), 85_500);
    assert_eq!(t.balance(&t.distributor), 85_414_500);

    // 999 units -> fee 0.999 units, rounds down to 0: no transfer to us.
    t.invoice(2, 999);
    t.client.pay(&t.shop, &2, &999);
    assert_eq!(t.balance(&t.treasury), 85_500);
    assert_eq!(t.balance(&t.distributor), 85_414_500 + 999);
}

#[test]
fn only_the_shop_signs_a_payment() {
    let t = setup();
    t.invoice(1, 150 * USD);
    t.client.pay(&t.shop, &1, &(150 * USD));

    let auths = t.env.auths();
    assert_eq!(auths.len(), 1);
    let (signer, invocation) = &auths[0];
    assert_eq!(signer, &t.shop);
    assert_eq!(
        invocation.function,
        AuthorizedFunction::Contract((
            t.client.address.clone(),
            symbol_short!("pay"),
            (t.shop.clone(), 1u64, 150 * USD).into_val(&t.env),
        ))
    );
}

#[test]
fn list_invoices_returns_the_newest_60() {
    let t = setup();
    assert_eq!(t.client.list_invoices().len(), 0);

    for id in 1..=3 {
        t.invoice(id, USD);
    }
    let ids: std::vec::Vec<u64> = t.client.list_invoices().iter().map(|i| i.id).collect();
    assert_eq!(ids, [1, 2, 3]);

    for id in 4..=70 {
        t.invoice(id, USD);
    }
    let list = t.client.list_invoices();
    assert_eq!(list.len(), MAX_LIST);
    assert_eq!(list.first().unwrap().id, 11);
    assert_eq!(list.last().unwrap().id, 70);
}

#[test]
fn config_is_stored() {
    let t = setup();
    let config = t.client.get_config();
    assert_eq!(config.admin, t.admin);
    assert_eq!(config.treasury, t.treasury);
    assert_eq!(config.token, t.token.address);
    assert_eq!(config.credit_period_secs, WEEK);
}

// ---------- v2: cash (#19) ----------

#[test]
fn cash_payment_after_shop_confirms() {
    let t = setup();
    t.invoice(1, 150 * USD);

    t.client.cash_claim(&t.driver, &1, &(150 * USD));
    assert_eq!(t.client.get_cash_claim(&1), 1_500_000_000);
    // Nothing is paid until the shop confirms.
    assert_eq!(t.client.get_invoice(&1).status, InvoiceStatus::Due);

    t.client.cash_confirm(&t.shop, &1);
    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Cash);
    assert_eq!(t.client.get_driver_cash(&t.driver), 1_500_000_000);
    assert_eq!(t.client.get_usage_owed(&t.distributor), 1_500_000);
    assert_eq!(t.client.get_cash_claim(&1), 0);
    // Cash moves no tokens.
    assert_eq!(t.balance(&t.shop), 500 * USD);
    assert_eq!(t.balance(&t.distributor), 0);
}

#[test]
fn confirm_without_a_claim_fails() {
    let t = setup();
    t.invoice(1, 150 * USD);
    assert_eq!(t.client.try_cash_confirm(&t.shop, &1), Err(Ok(Error::NoCashClaim)));
}

#[test]
fn only_the_invoice_driver_can_claim() {
    let t = setup();
    t.invoice(1, 150 * USD);
    let other_driver = Address::generate(&t.env);
    assert_eq!(
        t.client.try_cash_claim(&other_driver, &1, &(150 * USD)),
        Err(Ok(Error::NotYourInvoice))
    );
}

#[test]
fn cash_claim_checks_amounts() {
    let t = setup();
    t.invoice(1, 150 * USD);
    assert_eq!(t.client.try_cash_claim(&t.driver, &1, &0), Err(Ok(Error::InvalidAmount)));
    assert_eq!(
        t.client.try_cash_claim(&t.driver, &1, &(151 * USD)),
        Err(Ok(Error::Overpay))
    );
}

#[test]
fn part_cash_then_digital_is_mixed() {
    let t = setup();
    t.invoice(1, 150 * USD);
    t.client.cash_claim(&t.driver, &1, &(50 * USD));
    t.client.cash_confirm(&t.shop, &1);
    assert_eq!(t.client.get_invoice(&1).status, InvoiceStatus::PartPaid);

    t.client.pay(&t.shop, &1, &(100 * USD));
    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Mixed);
}

#[test]
fn stale_cash_claim_cannot_overpay() {
    let t = setup();
    t.invoice(1, 150 * USD);
    t.client.cash_claim(&t.driver, &1, &(100 * USD));
    // The shop pays $100 digitally before confirming the cash.
    t.client.pay(&t.shop, &1, &(100 * USD));
    assert_eq!(t.client.try_cash_confirm(&t.shop, &1), Err(Ok(Error::Overpay)));

    // And once the invoice is fully paid, a leftover claim cannot be confirmed.
    t.client.pay(&t.shop, &1, &(50 * USD));
    assert_eq!(t.client.try_cash_confirm(&t.shop, &1), Err(Ok(Error::AlreadyPaid)));
}

#[test]
fn cash_handed_in_reduces_what_the_driver_holds() {
    let t = setup();
    t.invoice(1, 150 * USD);
    t.client.cash_claim(&t.driver, &1, &(150 * USD));
    t.client.cash_confirm(&t.shop, &1);

    t.client.cash_handed_in(&t.distributor, &t.driver, &(100 * USD));
    assert_eq!(t.client.get_driver_cash(&t.driver), 500_000_000);

    assert_eq!(
        t.client.try_cash_handed_in(&t.distributor, &t.driver, &(51 * USD)),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        t.client.try_cash_handed_in(&t.distributor, &t.driver, &0),
        Err(Ok(Error::InvalidAmount))
    );
}

// ---------- v2: the lender pool and credit (#19) ----------

#[test]
fn deposit_moves_money_into_the_pool() {
    let t = setup();
    t.client.deposit(&t.lender, &(5_000 * USD));
    assert_eq!(t.client.get_pool(), Pool { available: 50_000_000_000, buffer: 0 });
    assert_eq!(t.contract_balance(), 50_000_000_000);
    assert_eq!(t.balance(&t.lender), 450_000_000_000);
    assert_eq!(t.client.try_deposit(&t.lender, &0), Err(Ok(Error::InvalidAmount)));
}

#[test]
fn credit_of_100() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    let pool_before = t.client.get_pool();
    let contract_before = t.contract_balance();

    t.client.pay_with_credit(&t.shop, &1);

    // $98.50 to the distributor, $0.25 to us, $0.75 to the buffer.
    assert_eq!(t.balance(&t.distributor), 985_000_000);
    assert_eq!(t.balance(&t.treasury), 2_500_000);
    let pool = t.client.get_pool();
    assert_eq!(pool.buffer, 7_500_000);
    assert_eq!(pool_before.available - pool.available, 995_000_000);
    assert_eq!(contract_before - t.contract_balance(), 987_500_000);
    t.assert_pool_matches_balance();

    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Credit);
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.owed, 1_000_000_000);
    assert_eq!(shop.due_at, START + WEEK);
    assert!(!shop.overdue);
    // The shop's own money is untouched.
    assert_eq!(t.balance(&t.shop), 500 * USD);
}

#[test]
fn credit_of_150() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 150 * USD);
    let pool_before = t.client.get_pool();
    let contract_before = t.contract_balance();

    t.client.pay_with_credit(&t.shop, &1);

    assert_eq!(t.balance(&t.distributor), 1_477_500_000);
    assert_eq!(t.balance(&t.treasury), 3_750_000);
    let pool = t.client.get_pool();
    assert_eq!(pool.buffer, 11_250_000);
    assert_eq!(pool_before.available - pool.available, 1_492_500_000);
    assert_eq!(contract_before - t.contract_balance(), 1_481_250_000);
    t.assert_pool_matches_balance();
}

#[test]
fn credit_over_the_limit_fails() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 220 * USD);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &1), Err(Ok(Error::OverLimit)));

    // Two invoices together cannot pass the limit either.
    t.invoice(2, 150 * USD);
    t.invoice(3, 60 * USD);
    t.client.pay_with_credit(&t.shop, &2);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &3), Err(Ok(Error::OverLimit)));
}

#[test]
fn credit_needs_money_in_the_pool() {
    let t = setup();
    t.client.deposit(&t.lender, &(50 * USD));
    t.client.set_terms(&t.shop, &(200 * USD));
    t.invoice(1, 100 * USD);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &1), Err(Ok(Error::PoolTooLow)));
}

#[test]
fn credit_needs_terms() {
    let t = setup();
    t.client.deposit(&t.lender, &(5_000 * USD));
    t.invoice(1, 100 * USD);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &1), Err(Ok(Error::NoCreditTerms)));
}

#[test]
fn no_new_credit_while_overdue() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.invoice(2, 50 * USD);
    t.client.pay_with_credit(&t.shop, &1);

    t.env.ledger().set_timestamp(START + WEEK + 1);
    assert!(t.client.get_shop(&t.shop).overdue);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &2), Err(Ok(Error::Overdue)));
}

#[test]
fn part_digital_then_credit_is_mixed() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 150 * USD);
    t.client.pay(&t.shop, &1, &(50 * USD));
    let distributor_before = t.balance(&t.distributor);

    t.client.pay_with_credit(&t.shop, &1);

    // Credit covers the remaining $100 only.
    assert_eq!(t.client.get_shop(&t.shop).owed, 1_000_000_000);
    assert_eq!(t.balance(&t.distributor) - distributor_before, 985_000_000);
    let invoice = t.client.get_invoice(&1);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.method, PayMethod::Mixed);
}

#[test]
fn credit_on_a_paid_invoice_fails() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &1), Err(Ok(Error::AlreadyPaid)));
}

#[test]
fn set_terms_rejects_a_negative_limit() {
    let t = setup();
    assert_eq!(t.client.try_set_terms(&t.shop, &-1), Err(Ok(Error::InvalidAmount)));
}

// ---------- v3: repayment and the credit record (#24) ----------

#[test]
fn full_cycle_on_time() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);

    t.client.pay_with_credit(&t.shop, &1);
    assert_eq!(t.contract_balance(), 49_012_500_000);

    t.env.ledger().set_timestamp(START + WEEK); // the last second still counts
    t.client.repay(&t.shop, &(100 * USD));

    assert_eq!(t.contract_balance(), 50_012_500_000);
    assert_eq!(t.client.get_pool(), Pool { available: 50_005_000_000, buffer: 7_500_000 });
    t.assert_pool_matches_balance();
    assert_eq!(t.balance(&t.shop), 4_000_000_000);

    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.owed, 0);
    assert_eq!(shop.due_at, 0);
    assert_eq!(shop.on_time, 1);
    assert_eq!(shop.late, 0);
    assert_eq!(shop.total_repaid, 1_000_000_000);
    assert_eq!(shop.limit, 2_250_000_000);
    assert!(!shop.overdue);
}

#[test]
fn late_repayment_drops_the_limit_one_step() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);

    t.env.ledger().set_timestamp(START + WEEK + 1);
    t.client.repay(&t.shop, &(100 * USD));

    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.late, 1);
    assert_eq!(shop.on_time, 0);
    assert_eq!(shop.limit, 1_750_000_000);
    assert_eq!(shop.owed, 0);
    assert_eq!(shop.due_at, 0);
}

#[test]
fn partial_repayment_keeps_the_due_date() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);

    t.client.repay(&t.shop, &(40 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.owed, 600_000_000);
    assert_eq!(shop.due_at, START + WEEK);
    assert_eq!(shop.total_repaid, 400_000_000);
    assert_eq!((shop.on_time, shop.late), (0, 0));

    t.client.repay(&t.shop, &(60 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.owed, 0);
    assert_eq!(shop.on_time, 1);
    t.assert_pool_matches_balance();
}

#[test]
fn limit_stops_at_500() {
    let t = setup();
    t.client.deposit(&t.lender, &(5_000 * USD));
    t.client.set_terms(&t.shop, &(490 * USD));
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.repay(&t.shop, &(100 * USD));
    assert_eq!(t.client.get_shop(&t.shop).limit, 5_000_000_000);

    // At the cap, another on-time repayment changes nothing.
    t.invoice(2, 100 * USD);
    t.client.pay_with_credit(&t.shop, &2);
    t.client.repay(&t.shop, &(100 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.limit, 5_000_000_000);
    assert_eq!(shop.on_time, 2);
}

#[test]
fn a_limit_above_the_cap_is_left_alone() {
    let t = setup();
    t.client.deposit(&t.lender, &(5_000 * USD));
    t.client.set_terms(&t.shop, &(800 * USD));
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.repay(&t.shop, &(100 * USD));
    assert_eq!(t.client.get_shop(&t.shop).limit, 8_000_000_000);
}

#[test]
fn repay_checks() {
    let t = setup();
    t.with_credit();
    assert_eq!(t.client.try_repay(&t.shop, &USD), Err(Ok(Error::NothingOwed)));
    let stranger = Address::generate(&t.env);
    assert_eq!(t.client.try_repay(&stranger, &USD), Err(Ok(Error::NothingOwed)));

    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    assert_eq!(t.client.try_repay(&t.shop, &(101 * USD)), Err(Ok(Error::InvalidAmount)));
    assert_eq!(t.client.try_repay(&t.shop, &0), Err(Ok(Error::InvalidAmount)));
}

#[test]
fn shop_without_terms_shows_zeros() {
    let t = setup();
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(
        shop,
        ShopView {
            limit: 0,
            owed: 0,
            due_at: 0,
            overdue: false,
            on_time: 0,
            late: 0,
            total_repaid: 0,
            written_off: 0
        }
    );
}

#[test]
fn set_terms_keeps_the_record() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.repay(&t.shop, &(100 * USD));

    t.client.set_terms(&t.shop, &(300 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.limit, 3_000_000_000);
    assert_eq!(shop.on_time, 1);
    assert_eq!(shop.total_repaid, 1_000_000_000);
}

// ---------- review fixes (Nov 10) ----------

#[test]
fn only_approved_distributors_create_invoices() {
    let t = setup();
    let stranger = Address::generate(&t.env);
    assert!(t.client.is_distributor(&t.distributor));
    assert!(!t.client.is_distributor(&stranger));
    assert_eq!(
        t.client.try_create_invoice(&stranger, &1, &t.shop, &t.driver, &(100 * USD), &START),
        Err(Ok(Error::NotApproved))
    );
}

#[test]
fn tiny_loans_do_not_grow_the_limit() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 39 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.repay(&t.shop, &(39 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.on_time, 1);
    assert_eq!(shop.limit, 200 * USD);
}

#[test]
fn small_loans_in_one_cycle_add_up() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 20 * USD);
    t.invoice(2, 20 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.pay_with_credit(&t.shop, &2);
    t.client.repay(&t.shop, &(40 * USD));
    assert_eq!(t.client.get_shop(&t.shop).limit, 225 * USD);
}

#[test]
fn one_raise_per_credit_period() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    t.client.repay(&t.shop, &(100 * USD));
    assert_eq!(t.client.get_shop(&t.shop).limit, 225 * USD);

    // Same week: borrowing and repaying again doesn't raise it.
    t.invoice(2, 100 * USD);
    t.client.pay_with_credit(&t.shop, &2);
    t.client.repay(&t.shop, &(100 * USD));
    let shop = t.client.get_shop(&t.shop);
    assert_eq!(shop.limit, 225 * USD);
    assert_eq!(shop.on_time, 2);

    // A week later it does.
    t.env.ledger().set_timestamp(START + WEEK);
    t.invoice(3, 100 * USD);
    t.client.pay_with_credit(&t.shop, &3);
    t.client.repay(&t.shop, &(100 * USD));
    assert_eq!(t.client.get_shop(&t.shop).limit, 250 * USD);
}

#[test]
fn default_is_covered_by_the_buffer() {
    let t = setup();
    t.with_credit();
    t.client.fund_buffer(&t.lender, &(50 * USD));
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    let available_before = t.client.get_pool().available;

    // Not yet: 4 weeks late is the line.
    t.env.ledger().set_timestamp(START + WEEK + 4 * WEEK);
    assert_eq!(t.client.try_cover_default(&t.shop), Err(Ok(Error::NotInDefault)));

    t.env.ledger().set_timestamp(START + WEEK + 4 * WEEK + 1);
    t.client.cover_default(&t.shop);
    let pool = t.client.get_pool();
    // Buffer had $50 + $0.75: it gives all of it back to the lenders.
    assert_eq!(pool.buffer, 0);
    assert_eq!(pool.available - available_before, 507_500_000);
    t.assert_pool_matches_balance();

    let shop = t.client.get_shop(&t.shop);
    assert_eq!((shop.owed, shop.limit, shop.late), (0, 0, 1));
    assert_eq!(shop.written_off, 100 * USD);
    assert!(!shop.overdue);
    assert_eq!(t.client.try_cover_default(&t.shop), Err(Ok(Error::NothingOwed)));

    // Credit is off.
    t.invoice(2, 10 * USD);
    assert_eq!(t.client.try_pay_with_credit(&t.shop, &2), Err(Ok(Error::OverLimit)));

    // Paying it back later refills the buffer.
    t.client.repay(&t.shop, &(30 * USD));
    assert_eq!(t.client.get_pool().buffer, 30 * USD);
    assert_eq!(t.client.get_shop(&t.shop).written_off, 70 * USD);
    assert_eq!(t.client.try_repay(&t.shop, &(71 * USD)), Err(Ok(Error::InvalidAmount)));
    t.assert_pool_matches_balance();
}

#[test]
fn small_buffer_covers_what_it_can() {
    let t = setup();
    t.with_credit();
    t.invoice(1, 100 * USD);
    t.client.pay_with_credit(&t.shop, &1);
    let available_before = t.client.get_pool().available;
    t.env.ledger().set_timestamp(START + 6 * WEEK);
    t.client.cover_default(&t.shop);
    // Only the $0.75 buffer was there; the lenders carry the other $99.25.
    assert_eq!(t.client.get_pool().available - available_before, 7_500_000);
    assert_eq!(t.client.get_pool().buffer, 0);
}

#[test]
fn fund_buffer_checks_the_amount() {
    let t = setup();
    assert_eq!(t.client.try_fund_buffer(&t.lender, &0), Err(Ok(Error::InvalidAmount)));
    t.client.fund_buffer(&t.lender, &(10 * USD));
    assert_eq!(t.client.get_pool(), Pool { available: 0, buffer: 10 * USD });
    t.assert_pool_matches_balance();
}
