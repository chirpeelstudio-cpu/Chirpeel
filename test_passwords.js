import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxjfjovbcaephxejqsau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZqb3ZiY2FlcGh4ZWpxc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjU4MDIsImV4cCI6MjA5MzMwMTgwMn0.FUbGjDhhm9puGwvAHLXE4vMigmetBhCg08xO7oihaj8';
const supabase = createClient(supabaseUrl, supabaseKey);

const passwords = [
  'Demo@1234',
  'ChirpeelDemo@2026!',
  'ChirpeelDemo@2026',
  'Chirpeel@2026',
  'Chirpeel@2026!',
  'demo1234',
  'Demo1234',
  'Demo1234!',
  'demo@1234',
  'Demo@123',
  'demo@123',
  'password',
  'chirpeel',
  'Chirpeel',
  'Chirpeel123',
  'Chirpeel@123'
];

async function run() {
  for (const password of passwords) {
    console.log(`Trying password: ${password}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@chirpeel.test',
      password: password
    });
    if (data.session) {
      console.log(`SUCCESS! Password is: ${password}`);
      console.log(data);
      return;
    } else {
      console.log(`Failed: ${error.message} (${error.code || error.status})`);
    }
  }
  console.log("None of the passwords worked.");
}

run();
