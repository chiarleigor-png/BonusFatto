
// api/checkout.js - Vercel Serverless Function per Stripe
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { amount, comune, isee, figli, items } = req.body; // amount in cents, es 499 = 4,99€
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `BonusFatto Report ${comune || 'Comune'} - ISEE ${isee || 0}€`,
              description: `1. Tutti i bonus ISEE 2. Sconto TARI 3. Bonus luce e gas - ${items || 'Base 4,99€'}`,
            },
            unit_amount: amount, // es 499
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/?success=true&comune=${encodeURIComponent(comune||'')}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { comune, isee: String(isee), figli: String(figli) }
    });
    res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
