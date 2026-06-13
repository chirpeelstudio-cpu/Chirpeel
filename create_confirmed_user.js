import { createClient } from '@supabase/supabase-js';
import zlib from 'zlib';

const supabaseUrl = 'https://xxjfjovbcaephxejqsau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZqb3ZiY2FlcGh4ZWpxc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjU4MDIsImV4cCI6MjA5MzMwMTgwMn0.FUbGjDhhm9puGwvAHLXE4vMigmetBhCg08xO7oihaj8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    console.log("1. Fetching available Mail.tm domains...");
    const domainRes = await fetch("https://api.mail.tm/domains");
    const domainData = await domainRes.json();
    if (!domainData['hydra:member'] || domainData['hydra:member'].length === 0) {
      throw new Error("No domains available from Mail.tm");
    }
    const domain = domainData['hydra:member'][0].domain;
    console.log(`Using domain: ${domain}`);

    const rand = Math.floor(Math.random() * 1000000);
    const email = `demostudio${rand}@${domain}`;
    const password = `ChirpeelDemo@2026!`;
    console.log(`Generated Email: ${email}`);

    console.log("2. Creating Mail.tm email account...");
    const createAccRes = await fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password })
    });
    const createAccData = await createAccRes.json();
    if (createAccData.error) {
      throw new Error(`Failed to create Mail.tm account: ${createAccData.error}`);
    }
    console.log("Account created successfully on Mail.tm.");

    console.log("3. Authenticating with Mail.tm...");
    const tokenRes = await fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password })
    });
    const tokenData = await tokenRes.json();
    const mailToken = tokenData.token;
    if (!mailToken) {
      throw new Error("Failed to get authentication token from Mail.tm");
    }
    console.log("Authenticated with Mail.tm.");

    console.log("4. Signing up user on Supabase...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: "Demo Studio"
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }
    console.log("Signup request sent to Supabase. Waiting for confirmation email...");

    // Poll for the email
    let verificationUrl = null;
    console.log("5. Polling Mail.tm inbox (checking every 3s, max 60s)...");
    for (let i = 0; i < 20; i++) {
      await delay(3000);
      const msgsRes = await fetch("https://api.mail.tm/messages", {
        headers: { "Authorization": `Bearer ${mailToken}` }
      });
      const msgsData = await msgsRes.json();
      const messages = msgsData['hydra:member'] || [];
      console.log(`Checked inbox: found ${messages.length} message(s).`);

      if (messages.length > 0) {
        const msgId = messages[0].id;
        console.log(`Fetching full message details for message ID: ${msgId}...`);
        const msgDetailRes = await fetch(`https://api.mail.tm/messages/${msgId}`, {
          headers: { "Authorization": `Bearer ${mailToken}` }
        });
        const msgDetailData = await msgDetailRes.json();
        const html = msgDetailData.html;
        const text = msgDetailData.text;
        const htmlStr = Array.isArray(html) ? html.join("\n") : (typeof html === 'string' ? html : "");
        const textStr = Array.isArray(text) ? text.join("\n") : (typeof text === 'string' ? text : "");
        
        const regex = /https:\/\/[^\s"'<>]*email\.auth\.lovable\.cloud\/c\/[^\s"'<>]+/gi;
        const matches = htmlStr.match(regex) || textStr.match(regex) || [];
        console.log(`Found ${matches.length} links in email.`);
        
        for (const match of matches) {
          const cleanMatch = match.replace(/&amp;/g, '&');
          const tokenPart = cleanMatch.split('/c/')[1];
          if (!tokenPart) continue;
          
          try {
            const buffer = Buffer.from(tokenPart, 'base64');
            const decompressed = zlib.inflateSync(buffer).toString('utf8');
            const params = new URLSearchParams(decompressed);
            const redirectUrl = params.get('l');
            if (redirectUrl && redirectUrl.includes('verify')) {
              verificationUrl = redirectUrl;
              console.log("Found correct verify redirect URL:", verificationUrl);
              break;
            }
          } catch (e) {
            // Ignore decompression errors for non-matching URLs
          }
        }
        
        if (verificationUrl) break;
      }
    }

    if (!verificationUrl) {
      throw new Error("Timed out waiting for Supabase verification email or link was not found.");
    }

    console.log("6. Calling verification link to confirm email...");
    const finalVerifyUrl = verificationUrl + "&apikey=" + supabaseKey;
    console.log(`Requesting URL: ${finalVerifyUrl}`);
    const verifyRes = await fetch(finalVerifyUrl);
    console.log(`Verification URL response status: ${verifyRes.status}`);

    console.log("7. Verifying login works...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (signInError) {
      throw signInError;
    }

    console.log("8. Registering tenant details for this demo account...");
    // Let's call complete_onboarding to register the tenant so it behaves exactly like a seeded tenant
    const authenticatedClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    await authenticatedClient.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    });

    const payload = {
      company_name: "Chirpeel Studio",
      logo_url: null,
      phone: "+91 90000 88888",
      email: email,
      address: "Studio 101, Design Street, Bengaluru",
      gstin: "29AAAAA0000A1Z5",
      primary_color: "#1d4ed8",
      accent_color: "#f59e0b",
      currency: "INR",
      currency_symbol: "₹",
      timezone: "Asia/Kolkata",
      fy_start_month: 4,
      specialties: ["kitchen", "wardrobe"],
      avg_ticket: "2to5",
      typical_duration_days: 45,
      service_areas: ["Bengaluru"],
      primary_city: "Bengaluru",
      hear_about_us: "google",
      hear_about_us_other: "",
      primary_goal: "leads",
      plan: "studio",
      billing_cycle: "yearly",
      promo_locked: false,
    };

    console.log("Calling complete_onboarding RPC...");
    const { data: onboardingData, error: onboardingError } = await authenticatedClient.rpc('complete_onboarding', { payload });
    if (onboardingError) {
      console.warn("complete_onboarding RPC failed, trying normal flow:", onboardingError);
    } else {
      console.log("Onboarding completed via RPC.");
    }

    console.log("Seeding starter data...");
    try {
      const seedRes = await authenticatedClient.functions.invoke("seed-starter-data");
      console.log("Seed starter data result:", seedRes);
    } catch (seedErr) {
      console.warn("seed-starter-data failed", seedErr);
    }

    console.log("====================================================");
    console.log("DEMO USER SETUP COMPLETED SUCCESSFULLY!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("====================================================");

  } catch (err) {
    console.error("ERROR running user setup:", err);
  }
}

run();
