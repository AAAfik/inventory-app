import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://ljwtmzrcwakzdhnhizjj.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_jjfa3jZTCyD21Hfk-Plv-A_A90VsF9b"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
