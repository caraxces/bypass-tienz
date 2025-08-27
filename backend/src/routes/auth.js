const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.post('/signup', async (req, res) => {
  const { email, password, full_name, role_id } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
          role_id: role_id,
        },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      // In a real app, you might want to sign them in directly
      // or send a confirmation email. Here we just return the user.
      res.status(201).json({ user: data.user });
    } else {
       res.status(500).json({ error: "Signup successful, but no user data returned." });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }
    
    // Return the session object which contains the access_token
    res.json({
      message: 'Signed in successfully',
      token: data.session.access_token,
      user: data.user,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
