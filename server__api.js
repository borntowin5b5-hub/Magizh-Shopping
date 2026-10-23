// Express REST API Router with Full Domain Validation & Error Handling
import express from 'express';
import { dbService } from './server__db.js';
import { hashPassword, verifyPassword, generateOtp, hashOtp, verifyOtp } from './server__security.js';
import { sendPasswordResetEmail } from './server__emailService.js';

export const apiRouter = express.Router();

// Helper: Basic Email Regex Validation
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// -------------------------------------------------------------
// A. Customer Registration & Authentication Endpoints
// -------------------------------------------------------------

apiRouter.post('/auth/register', (req, res) => {
  try {
    const { name, mobile, email, password, role = 'customer' } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name.' });
    }

    if (!mobile || !/^\d{10}$/.test(String(mobile).trim())) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Duplicate Check
    const existingMobile = dbService.findUserByMobile(mobile.trim());
    if (existingMobile) {
      return res.status(409).json({ error: 'An account with this mobile number already exists.' });
    }

    const existingEmail = dbService.findUserByEmail(email.trim());
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const customerCode = `MAG-${role.toUpperCase().slice(0, 4)}-${Math.floor(10000 + Math.random() * 90000)}`;
    const referralCode = `MAG-REF-${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = password ? hashPassword(password) : hashPassword('demo123');

    const newUser = dbService.createUser({
      id: `user-${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      customerCode,
      referralCode,
      addresses: [],
      status: 'active',
    });

    dbService.logAudit(role, name, 'REGISTER_USER', `New ${role} registered with email ${email}`);

    res.status(201).json({
      success: true,
      user: newUser,
      message: 'Account created successfully with 100 Welcome B5 Coins!',
    });
  } catch (err) {
    console.error('[API Register Error]', err);
    res.status(500).json({ error: 'Registration failed due to server error.' });
  }
});

apiRouter.post('/auth/login', (req, res) => {
  try {
    const { mobile, email, password, otp } = req.body;

    let user = null;
    if (mobile) user = dbService.findUserByMobile(mobile.trim());
    else if (email) user = dbService.findUserByEmail(email.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    // OTP mode (Demo)
    if (otp) {
      if (otp !== '123456') {
        return res.status(401).json({ error: 'Invalid verification OTP.' });
      }
      return res.json({ success: true, user, message: 'Logged in successfully via OTP' });
    }

    // Password mode
    if (password) {
      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
      return res.json({ success: true, user, message: 'Logged in successfully via Password' });
    }

    return res.status(400).json({ error: 'Please provide either password or OTP.' });
  } catch (err) {
    res.status(500).json({ error: 'Login verification failed.' });
  }
});

// Forgot Password - Initiate OTP
apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = dbService.findUserByEmail(normalizedEmail);

    // Cooldown check (60 seconds)
    const existingReset = dbService.getPasswordResetRecord(normalizedEmail);
    const now = Date.now();
    if (existingReset && existingReset.cooldownUntil > now) {
      const waitSeconds = Math.ceil((existingReset.cooldownUntil - now) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another reset code.`,
        retryAfter: waitSeconds,
      });
    }

    // Generate secure 6-digit OTP
    const rawOtp = generateOtp();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    const cooldownUntil = now + 60 * 1000; // 60 seconds

    dbService.savePasswordResetOtp(normalizedEmail, otpHash, expiresAt, cooldownUntil);

    // Send email (real SMTP or clearly marked demo)
    const emailResult = await sendPasswordResetEmail(normalizedEmail, rawOtp, 10);

    // Non-revealing generic response to prevent account enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset verification code has been dispatched.',
      cooldownSeconds: 60,
      expiresInMinutes: 10,
      delivered: emailResult.delivered,
      demoMode: emailResult.demoMode,
      demoOtp: emailResult.demoOtp || null, // Provided only when SMTP is unconfigured for testing
      demoNote: emailResult.demoMode ? 'DEMO MODE: Use the provided OTP to test password recovery without live SMTP.' : undefined,
    });
  } catch (err) {
    console.error('[API Forgot Password Error]', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// Verify Password Reset OTP
apiRouter.post('/auth/verify-reset-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!isValidEmail(email) || !otp) {
      return res.status(400).json({ error: 'Email and verification OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = dbService.getPasswordResetRecord(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: 'No active password reset request found for this email.' });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      dbService.clearPasswordReset(normalizedEmail);
      return res.status(400).json({ error: 'This verification code has expired. Please request a new one.' });
    }

    // Check attempt limits (max 5)
    if (record.attempts >= 5) {
      dbService.clearPasswordReset(normalizedEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. This code has been invalidated for security.' });
    }

    // Verify OTP timing-safe
    const isMatch = verifyOtp(String(otp).trim(), record.otpHash);
    if (!isMatch) {
      dbService.incrementResetAttempts(normalizedEmail);
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt(s) remaining before invalidation.`,
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Verification code confirmed. You may now set your new password.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Set New Password
apiRouter.post('/auth/reset-password', (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!isValidEmail(email) || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = dbService.getPasswordResetRecord(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: 'No valid reset request found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt || record.attempts >= 5) {
      dbService.clearPasswordReset(normalizedEmail);
      return res.status(400).json({ error: 'Verification session expired. Please start over.' });
    }

    // Verify OTP again before committing new password
    if (!verifyOtp(String(otp).trim(), record.otpHash)) {
      dbService.incrementResetAttempts(normalizedEmail);
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const newHash = hashPassword(newPassword);
    dbService.updateUserPassword(normalizedEmail, newHash);
    dbService.clearPasswordReset(normalizedEmail);

    dbService.logAudit('customer', normalizedEmail, 'RESET_PASSWORD', `Password successfully changed via verified email OTP`);

    res.json({
      success: true,
      message: 'Your password has been securely updated. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('[API Reset Password Error]', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// -------------------------------------------------------------
// B. Product Management Endpoints
// -------------------------------------------------------------

apiRouter.get('/products', (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const products = dbService.getProducts(includeArchived);
  res.json({ success: true, count: products.length, products });
});

apiRouter.get('/products/:id', (req, res) => {
  const product = dbService.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, product });
});

apiRouter.post('/products', (req, res) => {
  try {
    const prod = req.body;
    if (!prod.name || !prod.category || !prod.variants || prod.variants.length === 0) {
      return res.status(400).json({ error: 'Product name, category, and at least one weight variant are required.' });
    }

    const newProd = {
      ...prod,
      id: prod.id || `prod-${Date.now()}`,
      images: (prod.images && prod.images.length > 0) ? prod.images.slice(0, 3) : [
        'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80'
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const saved = dbService.saveProduct(newProd);
    dbService.logAudit('admin', 'Admin', 'ADD_PRODUCT', `Added product "${newProd.name}" (${newProd.id})`);

    res.status(201).json({ success: true, product: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

apiRouter.put('/products/:id', (req, res) => {
  try {
    const existing = dbService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const updated = {
      ...existing,
      ...req.body,
      id: req.params.id,
      images: req.body.images ? req.body.images.slice(0, 3) : existing.images,
    };

    const saved = dbService.saveProduct(updated);
    dbService.logAudit('admin', 'Admin', 'UPDATE_PRODUCT', `Updated product "${saved.name}" (${saved.id})`);

    res.json({ success: true, product: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

apiRouter.delete('/products/:id', (req, res) => {
  try {
    const result = dbService.archiveOrDeleteProduct(req.params.id);
    dbService.logAudit('admin', 'Admin', result.action === 'archived' ? 'ARCHIVE_PRODUCT' : 'DELETE_PRODUCT', result.message);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete/archive product.' });
  }
});

// Categories
apiRouter.get('/categories', (req, res) => {
  res.json({ success: true, categories: dbService.getCategories() });
});

apiRouter.post('/categories', (req, res) => {
  try {
    const cat = req.body;
    if (!cat.name) return res.status(400).json({ error: 'Category name is required' });
    cat.id = cat.id || `cat-${Date.now()}`;
    dbService.saveCategory(cat);
    res.status(201).json({ success: true, category: cat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/categories/:id', (req, res) => {
  try {
    dbService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Banners
apiRouter.get('/banners', (req, res) => {
  res.json({ success: true, banners: dbService.getBanners() });
});

apiRouter.post('/banners', (req, res) => {
  const b = req.body;
  b.id = b.id || `ban-${Date.now()}`;
  dbService.saveBanner(b);
  res.status(201).json({ success: true, banner: b });
});

// -------------------------------------------------------------
// D. Partner Shops & In-Store Local B5 Coin Transactions
// -------------------------------------------------------------

apiRouter.get('/partners', (req, res) => {
  const partners = dbService.getPartners();
  res.json({ success: true, count: partners.length, partners });
});

apiRouter.get('/partners/:id', (req, res) => {
  const partner = dbService.getPartnerById(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner shop not found' });
  res.json({ success: true, partner });
});

apiRouter.post('/partners/:id/toggle-status', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  dbService.updatePartnerStatus(req.params.id, status);
  res.json({ success: true, message: `Partner status changed to ${status}` });
});

// Process In-Store Local Transaction with B5 Coins
apiRouter.post('/partners/:id/local-transaction', (req, res) => {
  try {
    const partnerId = req.params.id;
    const { customerId, eligiblePurchaseAmount, requestedCoins } = req.body;

    if (!customerId || !eligiblePurchaseAmount || eligiblePurchaseAmount <= 0) {
      return res.status(400).json({ error: 'Valid customer ID and purchase amount are required.' });
    }

    const coinsToRedeem = Math.max(0, parseInt(requestedCoins, 10) || 0);

    const result = dbService.processLocalPartnerTransaction(
      partnerId,
      customerId,
      eligiblePurchaseAmount,
      coinsToRedeem
    );

    dbService.logAudit(
      'partner',
      result.partnerName,
      'LOCAL_TRANSACTION',
      `Processed local receipt #${result.receiptNumber}: ₹${eligiblePurchaseAmount} with ${coinsToRedeem} B5 Coins`
    );

    res.json({ success: true, transaction: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/partners/:id/local-transactions', (req, res) => {
  const txns = dbService.getPartnerLocalTransactions(req.params.id);
  res.json({ success: true, transactions: txns });
});

// Audit Logs
apiRouter.get('/audit-logs', (req, res) => {
  res.json({ success: true, logs: dbService.getAuditLogs() });
});
