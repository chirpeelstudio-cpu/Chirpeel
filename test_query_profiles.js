import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxjfjovbcaephxejqsau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZqb3ZiY2FlcGh4ZWpxc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjU4MDIsImV4cCI6MjA5MzMwMTgwMn0.FUbGjDhhm9puGwvAHLXE4vMigmetBhCg08xO7oihaj8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log("Profiles:", data, error);
}

run();
