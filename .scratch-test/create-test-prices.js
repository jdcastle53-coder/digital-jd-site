const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // test-mode key

const tiers = [
  { name: 'JD Brain - Essentials (TEST)', amount: 399 },
  { name: 'JD Brain - Pro (TEST)', amount: 1999 },
  { name: 'JD Brain - Executive (TEST)', amount: 4999 },
];

(async () => {
  const results = [];
  for (const t of tiers) {
    const product = await stripe.products.create({ name: t.name, metadata: { simulation: 'true' } });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: t.amount,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    results.push({ tier: t.name, productId: product.id, priceId: price.id, amount: t.amount });
  }
  console.log(JSON.stringify(results, null, 2));
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
