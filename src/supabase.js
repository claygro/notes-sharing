import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nklmpmpeqsdakmuketxg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbG1wbXBlcXNkYWttdWtldHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1ODU2NjUsImV4cCI6MjA1NjE2MTY2NX0.FNdZTCMpuoQV7vefr_lFDAndHuRfdo_6XhW9lj12mpE";
export const supabase = createClient(supabaseUrl, supabaseKey);
