const express = require('express');
const Stripe = require('stripe');
const { requireAuth: authenticateToken } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_ID = 'price_1TDxia8nElC3RzesqHxUVSBf';

// Create payment intent for premium subscription
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get or create Stripe customer
    const { data: user } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Create subscription with expanded invoice and payment intent
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (!paymentIntent?.client_secret) {
      // Subscription may already be active (e.g. trial)
      if (subscription.status === 'trialing' || subscription.status === 'active') {
        await supabase.from('users').update({
          is_premium: true,
          stripe_subscription_id: subscription.id,
          premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('id', userId);
        return res.json({ subscriptionId: subscription.id, alreadyActive: true });
      }
      return res.status(500).json({ error: 'Could not create payment intent', code: 'STRIPE_ERROR' });
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'STRIPE_ERROR' });
  }
});

// Confirm premium status after payment
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.userId;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await supabase.from('users').update({
        is_premium: true,
        stripe_subscription_id: subscriptionId,
        premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('id', userId);

      res.json({ premium: true, expiresAt: subscription.current_period_end });
    } else {
      res.json({ premium: false, status: subscription.status });
    }
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'STRIPE_ERROR' });
  }
});

// Check premium status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('is_premium, premium_expires_at')
      .eq('id', req.userId)
      .single();

    const isPremium = user?.is_premium && new Date(user.premium_expires_at) > new Date();
    res.json({ premium: isPremium, expiresAt: user?.premium_expires_at });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

module.exports = router;
