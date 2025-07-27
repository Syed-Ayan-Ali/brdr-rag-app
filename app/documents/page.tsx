import { createClient } from '@/utils/supabase/server';

export default async function Documents() {
  const supabase = await createClient();
  const { data: documents } = await supabase.from("documents").select();

  return <pre>{JSON.stringify(documents, null, 2)}</pre>
}