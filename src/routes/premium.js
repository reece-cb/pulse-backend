const express = require('express');
const Stripe = require('stripe');
const { requireAuth: authenticateToken } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_ID = 'price_1TDxia8nElC3RzesqHxUVSBf';

// Step 1: Create a SetupIntent to collect payment method first
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Create a SetupIntent to collect card details
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    res.json({
      customerId,
      setupIntentClientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: err.message, code: 'STRIPE_ERROR' });
  }
});

// Step 2: After card is saved, create the subscription
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { setupIntentId } = req.body;
    const userId = req.userId;

    // Get the setup intent to find the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment method not confirmed', code: 'PAYMENT_INCOMPLETE' });
    }

    const paymentMethodId = setupIntent.payment_method;
    const customerId = setupIntent.customer;

    // Attach payment method as default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICE_ID }],
      default_payment_method: paymentMethodId,
    });

    // Mark user as premium
    await supabase.from('users').update({
      is_premium: true,
      stripe_subscription_id: subscription.id,
      premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    }).eq('id', userId);

    res.json({ premium: true, expiresAt: subscription.current_period_end });
  } catch (err) {
    console.error('Confirm error:', err);
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
