import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim();
  const anonKey = keyMatch[1].trim();
  const supabase = createClient(url, anonKey);
  
  const email = 'admin2@predictkit.com';
  const password = 'password123';
  
  supabase.auth.signUp({
    email,
    password,
  }).then(async ({ data, error }) => {
    if (error) {
      console.log('Signup failed:', error.message);
      // If admin2 is already registered, let's try to sign in and ensure it is ADMIN
      if (error.message.includes('already registered')) {
        supabase.auth.signInWithPassword({ email, password }).then(({ data: signInData, error: signInErr }) => {
          if (signInErr) {
            console.log('Signin failed for admin2:', signInErr.message);
          } else {
            console.log('Signin success for admin2! Elevating profile...');
            supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', signInData.user.id).select().then(({ data: upData, error: upErr }) => {
              console.log('Elevated admin2:', upData, upErr);
            });
          }
        });
      }
    } else if (data.user) {
      console.log('Signup success for admin2! User ID:', data.user.id);
      
      // Wait a moment for trigger to run and insert the profile row, then update it to ADMIN
      setTimeout(async () => {
        const { data: updateData, error: updateErr } = await supabase
          .from('profiles')
          .update({ role: 'ADMIN' })
          .eq('id', data.user.id)
          .select();
        
        console.log('Update profile response:', updateData, updateErr);
      }, 2000);
    }
  });
}
