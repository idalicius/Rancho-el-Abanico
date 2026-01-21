import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqciwfrloynefnteejdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxY2l3ZnJsb3luZWZudGVlamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTYzMDMsImV4cCI6MjA4NDU5MjMwM30.b06LMt3BGFOiiuygqdasPCGO5PWMIX2ayWZudafawX4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);